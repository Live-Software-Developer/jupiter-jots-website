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

function randomHex32(): string {
  const b = crypto.getRandomValues(new Uint8Array(16))
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('')
}

/** Client-side only. Persisted in localStorage, in-memory fallback. */
export function visitorKey(): string {
  try {
    const stored = localStorage.getItem('jj.visitor')
    if (stored && /^[0-9a-f]{32}$/.test(stored)) return stored
    const k = memoryKey ?? randomHex32()
    memoryKey = k
    localStorage.setItem('jj.visitor', k)
    return k
  } catch {
    return (memoryKey ??= randomHex32())
  }
}

export async function getShare(slug: string): Promise<ShareResult> {
  try {
    const res = await fetch(`${apiBase()}/api/sharing/s/${encodeURIComponent(slug)}`, { cache: 'no-store' })
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
