import type { ApiResult, CommentList, NewComment, PublicComment, PublicShare, ShareResult } from './types'

const FALLBACK = 'http://127.0.0.1:8000'

/** The backend base URL, without a trailing slash: `JJ_API_URL` on the server, `NEXT_PUBLIC_JJ_API_URL` in the browser. */
export function apiBase(): string {
  const url =
    typeof window === 'undefined'
      ? process.env.JJ_API_URL ?? process.env.NEXT_PUBLIC_JJ_API_URL
      : process.env.NEXT_PUBLIC_JJ_API_URL
  return (url || FALLBACK).replace(/\/+$/, '')
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
  try {
    const headers: Record<string, string> = isVisitorKey(visitor) ? { 'X-Visitor-Key': visitor } : {}
    const res = await fetch(`${apiBase()}/api/sharing/s/${encodeURIComponent(slug)}`, { cache: 'no-store', headers })
    if (res.status === 404) return { status: 'missing' }
    if (res.status === 410) return { status: 'gone' }
    if (!res.ok) return { status: 'error' }
    const body: unknown = await res.json()
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 'error' }
    return { status: 'ok', share: body as PublicShare }
  } catch {
    return { status: 'error' }
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
  try {
    const headers: Record<string, string> = { 'X-Visitor-Key': visitorKey() }
    if (body !== undefined) headers['Content-Type'] = 'application/json'
    const res = await fetch(`${apiBase()}${path}`, {
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
export const report = (id: number) => call<{ reports: number }>(`/api/sharing/comments/${id}/report`, 'POST', {})
