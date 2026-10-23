import type {
  ApiResult,
  CommentList,
  ExploreItem,
  ExploreResult,
  NewComment,
  PublicComment,
  PublicShare,
  ShareCard,
  ShareResult,
} from './types'
import { parseVisibility } from './visibility'

/** Development only: the local backend. A production build never falls back to it. */
const DEV_API = 'http://127.0.0.1:8000'

const trim = (url: string) => url.replace(/\/+$/, '')

/**
 * The backend base URL, without a trailing slash, or null when a production build has none.
 * Browser: `NEXT_PUBLIC_JJ_API_URL` (inlined at build time). Server: `JJ_API_URL`, else
 * `NEXT_PUBLIC_JJ_API_URL`; in production the server also needs the public one, since without
 * it the browser could not load comments. Outside production a missing URL means `DEV_API`.
 */
export function apiBase(): string | null {
  const pub = process.env.NEXT_PUBLIC_JJ_API_URL
  const prod = process.env.NODE_ENV === 'production'
  if (prod && !pub) return null
  const url = typeof window === 'undefined' ? process.env.JJ_API_URL || pub : pub
  return url ? trim(url) : DEV_API
}

let warned = false
function warnUnconfigured() {
  if (warned) return
  warned = true
  console.warn(
    '[share] NEXT_PUBLIC_JJ_API_URL was not set when this production build ran, so share pages show "can\'t be loaded". ' +
      'Set it (and optionally JJ_API_URL for server renders) and rebuild.',
  )
}

let memoryKey: string | null = null

/** First-party cookie holding the visitor key, so server renders can forward it (views dedupe per key). */
export const VISITOR_COOKIE = 'jj_visitor'
const STORAGE_KEY = 'jj.visitor'
const YEAR = 365 * 24 * 3600

/** A visitor key is 32 lowercase hex characters. */
export const isVisitorKey = (k: unknown): k is string => typeof k === 'string' && /^[0-9a-f]{32}$/.test(k)

function randomHex32(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

function readCookie(): string | null {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${VISITOR_COOKIE}=([^;]*)`))
    return m ? m[1] : null
  } catch {
    return null
  }
}

function writeCookie(k: string) {
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `${VISITOR_COOKIE}=${k}; Max-Age=${YEAR}; Path=/; SameSite=Lax${secure}`
  } catch {
    // Cookies blocked: server renders just go without the key.
  }
}

function readStorage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Client-side only; the one place the visitor key is chosen and persisted. Kept in
 * localStorage `jj.visitor` and the `jj_visitor` cookie (read by server renders), in sync;
 * localStorage wins when both hold a valid key. In-memory fallback when storage is blocked.
 */
export function visitorKey(): string {
  const stored = readStorage()
  const cookie = readCookie()
  const k = isVisitorKey(stored) ? stored : isVisitorKey(cookie) ? cookie : (memoryKey ??= randomHex32())
  memoryKey = k
  if (stored !== k) {
    try {
      localStorage.setItem(STORAGE_KEY, k)
    } catch {
      // Storage blocked: the cookie and memory still hold it.
    }
  }
  if (cookie !== k) writeCookie(k)
  return k
}

/**
 * Server side: pass the visitor's `jj_visitor` cookie as `visitor` so the backend counts the
 * view once per visitor per day. An invalid or missing key is not sent.
 */
export async function getShare(slug: string, visitor?: string | null): Promise<ShareResult> {
  const base = apiBase()
  if (!base) {
    warnUnconfigured()
    return { status: 'error' }
  }
  try {
    const headers: Record<string, string> = isVisitorKey(visitor) ? { 'X-Visitor-Key': visitor } : {}
    const res = await fetch(`${base}/api/sharing/s/${encodeURIComponent(slug)}`, { cache: 'no-store', headers })
    if (res.status === 404) return { status: 'missing' }
    if (res.status === 410) {
      // An operator takedown says `removed`; revoked, expired or used up says `gone`.
      const gone: unknown = await res.json().catch(() => null)
      return { status: (gone as { code?: unknown } | null)?.code === 'removed' ? 'removed' : 'gone' }
    }
    if (!res.ok) return { status: 'error' }
    const body: unknown = await res.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 'error' }
    const share = body as PublicShare
    return { status: 'ok', share: { ...share, visibility: parseVisibility(share.visibility) } }
  } catch {
    return { status: 'error' }
  }
}

const isExploreItem = (r: unknown): r is ExploreItem => {
  if (!r || typeof r !== 'object') return false
  const o = r as Record<string, unknown>
  return ['slug', 'title', 'curator_name', 'summary', 'updated_at'].every((k) => typeof o[k] === 'string')
}

/** The longest `q` the explore endpoint accepts. */
export const EXPLORE_MAX_Q = 100

/**
 * One page of public shares for /explore, newest first. Works on the server (first page) and in
 * the browser (search and "Load more"). Malformed rows are dropped rather than failing the page.
 */
export async function getExplore(opts: { q?: string; cursor?: string | null } = {}): Promise<ExploreResult> {
  const base = apiBase()
  if (!base) {
    warnUnconfigured()
    return { status: 'down' }
  }
  const params = new URLSearchParams()
  const q = opts.q?.trim()
  if (q) params.set('q', q)
  if (opts.cursor) params.set('cursor', opts.cursor)
  const qs = params.toString()
  let res: Response
  try {
    res = await fetch(`${base}/api/sharing/explore${qs ? `?${qs}` : ''}`, { cache: 'no-store' })
  } catch {
    return { status: 'down' }
  }
  if (!res.ok) return { status: 'error' }
  const body: unknown = await res.json().catch(() => null)
  if (!body || typeof body !== 'object' || !Array.isArray((body as { results?: unknown }).results)) return { status: 'error' }
  const { results, next_cursor } = body as { results: unknown[]; next_cursor?: unknown }
  return {
    status: 'ok',
    page: { results: results.filter(isExploreItem), next_cursor: typeof next_cursor === 'string' && next_cursor ? next_cursor : null },
  }
}

/**
 * umbral's 400 puts field errors at the top level next to `code`
 * (`{"code":"validation_error","body":["…"],"non_field_errors":["…"]}`); collect them.
 */
function fieldErrors(data: unknown): Record<string, string[]> | undefined {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return undefined
  const out: Record<string, string[]> = {}
  for (const [k, v] of Object.entries(data)) {
    if (k !== 'code' && Array.isArray(v) && v.every((m) => typeof m === 'string')) out[k] = v
  }
  return Object.keys(out).length ? out : undefined
}

async function call<T>(path: string, method: 'GET' | 'POST', body?: unknown): Promise<ApiResult<T>> {
  const base = apiBase()
  if (!base) return { ok: false, status: 0, code: 'network' }
  try {
    const headers: Record<string, string> = { 'X-Visitor-Key': visitorKey() }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(`${base}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) return { ok: true, data: data as T }
    return { ok: false, status: res.status, code: data?.code ?? 'error', fields: fieldErrors(data) }
  } catch {
    return { ok: false, status: 0, code: 'network' }
  }
}

export const getComments = (slug: string) =>
  call<CommentList>(`/api/sharing/s/${encodeURIComponent(slug)}/comments`, 'GET')
export const postComment = (slug: string, body: NewComment) =>
  call<PublicComment>(`/api/sharing/s/${encodeURIComponent(slug)}/comments`, 'POST', body)
export const vote = (id: number) =>
  call<{ votes: number; voted: boolean }>(`/api/sharing/comments/${id}/vote`, 'POST', {})
/** Reports the whole share to the operators; once per visitor (repeats are accepted and ignored). */
export const reportShare = (slug: string, reason: string) =>
  call<unknown>(`/api/sharing/s/${encodeURIComponent(slug)}/report`, 'POST', { reason })
export const report = (id: number) => call<{ reports: number }>(`/api/sharing/comments/${id}/report`, 'POST', {})

const cards = new Map<string, Promise<ApiResult<ShareCard>>>()

/**
 * A share-link embed's card, cached in memory for the page's lifetime so a link repeated in a
 * thread (or re-rendered by a live update) is fetched once. Failed fetches are not cached.
 */
export function getShareCard(slug: string): Promise<ApiResult<ShareCard>> {
  let p = cards.get(slug)
  if (!p) {
    p = call<ShareCard>(`/api/sharing/s/${encodeURIComponent(slug)}/card`, 'GET')
    cards.set(slug, p)
    p.then((r) => {
      if (!r.ok && r.status !== 404) cards.delete(slug)
    })
  }
  return p
}
