import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getComments, getShare, postComment, report, visitorKey, vote } from './api'

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  localStorage.clear()
})
afterEach(() => vi.unstubAllGlobals())

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
  it('sends no visitor header', async () => {
    fetchMock.mockResolvedValue(json(200, {}))
    await getShare('x')
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).has('X-Visitor-Key')).toBe(false)
  })
})

describe('visitor calls', () => {
  it('visitorKey is 32 hex and persisted', () => {
    const k = visitorKey()
    expect(k).toMatch(/^[0-9a-f]{32}$/)
    expect(localStorage.getItem('jj.visitor')).toBe(k)
    expect(visitorKey()).toBe(k)
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
