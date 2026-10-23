import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { apiBase, getComments, getShare, getShareCard, postComment, report, VISITOR_COOKIE, visitorKey, vote } from './api'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  localStorage.clear()
  document.cookie = `${VISITOR_COOKIE}=; Max-Age=0; Path=/`
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('getShare', () => {
  it('maps 200 to ok', async () => {
    fetchMock.mockResolvedValue(json(200, { slug: 'abc' }))
    expect(await getShare('abc')).toEqual({ status: 'ok', share: { slug: 'abc' } })
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://127.0.0.1:8000/api/sharing/s/abc')
  })
  it('maps 404 to missing', async () => {
    fetchMock.mockResolvedValue(json(404, { code: 'not_found' }))
    expect(await getShare('x')).toEqual({ status: 'missing' })
  })
  it('maps 410 to gone', async () => {
    fetchMock.mockResolvedValue(json(410, { code: 'gone' }))
    expect(await getShare('x')).toEqual({ status: 'gone' })
  })

  it('maps a 410 takedown to removed', async () => {
    fetchMock.mockResolvedValue(json(410, { code: 'removed' }))
    expect(await getShare('x')).toEqual({ status: 'removed' })
  })
  it('maps network errors and 5xx to error', async () => {
    fetchMock.mockRejectedValue(new Error('down'))
    expect(await getShare('x')).toEqual({ status: 'error' })
    fetchMock.mockResolvedValue(json(500, {}))
    expect(await getShare('x')).toEqual({ status: 'error' })
  })
  it('maps a 200 with a non-object body to error', async () => {
    for (const body of [null, 'text', 42, [1]]) {
      fetchMock.mockResolvedValue(json(200, body))
      expect(await getShare('x')).toEqual({ status: 'error' })
    }
  })
  it('sends no visitor header without a valid key', async () => {
    fetchMock.mockResolvedValue(json(200, {}))
    await getShare('x')
    await getShare('x', 'not-a-key')
    for (const c of fetchMock.mock.calls) expect(new Headers(c[1]?.headers).has('X-Visitor-Key')).toBe(false)
  })
  it('forwards a valid visitor key', async () => {
    fetchMock.mockResolvedValue(json(200, {}))
    await getShare('x', 'a'.repeat(32))
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('X-Visitor-Key')).toBe('a'.repeat(32))
  })
})

describe('visitor calls', () => {
  it('visitorKey is 32 hex and persisted', () => {
    const k = visitorKey()
    expect(k).toMatch(/^[0-9a-f]{32}$/)
    expect(localStorage.getItem('jj.visitor')).toBe(k)
    expect(visitorKey()).toBe(k)
  })
  it('visitorKey mirrors itself into the jj_visitor cookie', () => {
    const k = visitorKey()
    expect(document.cookie).toContain(`${VISITOR_COOKIE}=${k}`)
  })
  it('visitorKey adopts the cookie when localStorage is empty, and localStorage wins otherwise', () => {
    document.cookie = `${VISITOR_COOKIE}=${'b'.repeat(32)}; Path=/`
    expect(visitorKey()).toBe('b'.repeat(32))
    expect(localStorage.getItem('jj.visitor')).toBe('b'.repeat(32))
    localStorage.setItem('jj.visitor', 'c'.repeat(32))
    expect(visitorKey()).toBe('c'.repeat(32))
    expect(document.cookie).toContain(`${VISITOR_COOKIE}=${'c'.repeat(32)}`)
  })
  it('postComment sends X-Visitor-Key and body', async () => {
    fetchMock.mockResolvedValue(json(201, { id: 1 }))
    const r = await postComment('abc', { author_name: 'A', body: 'hi', item_key: '' })
    expect(r).toEqual({ ok: true, data: { id: 1 } })
    const [url, init] = fetchMock.mock.calls[0]
    expect(String(url)).toContain('/api/sharing/s/abc/comments')
    expect(init.method).toBe('POST')
    expect(new Headers(init.headers).get('X-Visitor-Key')).toBe(visitorKey())
    expect(JSON.parse(init.body)).toEqual({ author_name: 'A', body: 'hi', item_key: '' })
  })
  it('postComment surfaces error codes', async () => {
    fetchMock.mockResolvedValue(json(429, { code: 'throttled' }))
    expect(await postComment('abc', { author_name: 'A', body: 'x', item_key: '' })).toEqual({
      ok: false, status: 429, code: 'throttled', fields: undefined,
    })
  })
  it('postComment collects umbral field errors from the top level', async () => {
    fetchMock.mockResolvedValue(json(400, { code: 'validation_error', body: ['body must be 1-4000 characters.'], non_field_errors: ['No.'] }))
    expect(await postComment('abc', { author_name: 'A', body: '', item_key: '' })).toEqual({
      ok: false, status: 400, code: 'validation_error',
      fields: { body: ['body must be 1-4000 characters.'], non_field_errors: ['No.'] },
    })
  })
  it('getComments, vote and report send the key', async () => {
    fetchMock.mockResolvedValue(json(200, { comments: [], count: 0 }))
    await getComments('abc')
    fetchMock.mockResolvedValue(json(200, { votes: 2, voted: true }))
    expect(await vote(5)).toEqual({ ok: true, data: { votes: 2, voted: true } })
    fetchMock.mockResolvedValue(json(200, { reports: 1 }))
    expect(await report(5)).toEqual({ ok: true, data: { reports: 1 } })
    for (const c of fetchMock.mock.calls)
      expect(new Headers(c[1].headers).get('X-Visitor-Key')).toBe(visitorKey())
    expect(String(fetchMock.mock.calls[1][0])).toContain('/api/sharing/comments/5/vote')
  })
})

describe('backend URL', () => {
  it('defaults to the local backend outside production', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('NEXT_PUBLIC_JJ_API_URL', '')
    vi.stubEnv('JJ_API_URL', '')
    expect(apiBase()).toBe('http://127.0.0.1:8000')
  })
  it('uses NEXT_PUBLIC_JJ_API_URL in the browser, without a trailing slash', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_JJ_API_URL', 'https://api.example.com/')
    vi.stubEnv('JJ_API_URL', 'http://10.0.0.2:8000')
    expect(apiBase()).toBe('https://api.example.com')
  })
  it('prefers JJ_API_URL on the server', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_JJ_API_URL', 'https://api.example.com')
    vi.stubEnv('JJ_API_URL', 'http://10.0.0.2:8000/')
    vi.stubGlobal('window', undefined)
    expect(apiBase()).toBe('http://10.0.0.2:8000')
  })
  it('has no localhost fallback in production', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_JJ_API_URL', '')
    vi.stubEnv('JJ_API_URL', '')
    expect(apiBase()).toBeNull()
    // The browser bundle has no URL, so a server-only one is not enough.
    vi.stubEnv('JJ_API_URL', 'http://10.0.0.2:8000')
    vi.stubGlobal('window', undefined)
    expect(apiBase()).toBeNull()
  })
  it('production without a URL: getShare is an error, fetches nothing and warns once', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_JJ_API_URL', '')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await getShare('abcdefghij')).toEqual({ status: 'error' })
    expect(await getShare('abcdefghij')).toEqual({ status: 'error' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('NEXT_PUBLIC_JJ_API_URL')
  })
  it('production without a URL: visitor calls fail as network errors without fetching', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_JJ_API_URL', '')
    expect(await getComments('abc')).toEqual({ ok: false, status: 0, code: 'network' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('getShareCard', () => {
  it('fetches a card once per slug', async () => {
    fetchMock.mockImplementation(async () => json(200, { status: 'ok', visibility: 'private', title: 'T', curator_name: 'A' }))
    const a = await getShareCard('card000001')
    const b = await getShareCard('card000001')
    expect(a).toEqual({ ok: true, data: { status: 'ok', visibility: 'private', title: 'T', curator_name: 'A' } })
    expect(b).toEqual(a)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://127.0.0.1:8000/api/sharing/s/card000001/card')
  })
  it('does not cache a failed fetch', async () => {
    fetchMock.mockRejectedValueOnce(new Error('down'))
    expect((await getShareCard('card000002')).ok).toBe(false)
    await Promise.resolve()
    fetchMock.mockResolvedValueOnce(json(200, { status: 'gone' }))
    expect(await getShareCard('card000002')).toEqual({ ok: true, data: { status: 'gone' } })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
