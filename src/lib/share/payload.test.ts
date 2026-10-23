import { describe, expect, it } from 'vitest'
import { parsePayload, toIcon } from './payload'
import type { PBookmark, PCollection, PayloadItem } from './types'

const bm = (extra: Record<string, unknown> = {}) => ({
  key: 'b:1',
  url: 'https://example.com/a',
  title: 'A',
  domain: 'example.com',
  note: '',
  tags: [],
  read: false,
  ...extra,
})
const coll = (extra: Record<string, unknown> = {}) => ({ name: 'C', note: 'Why these', hue: 2, bookmarks: [bm()], ...extra })
const json = (items: unknown[]) => JSON.stringify({ v: 1, title: 'T', intro: '', curator: { name: 'Ada' }, items })

const only = (items: unknown[]) => parsePayload(json(items))!.items[0]
const bookmarkOf = (i: PayloadItem) => (i as Extract<PayloadItem, { kind: 'bookmark' }>).bookmark
const collectionOf = (i: PayloadItem) => (i as Extract<PayloadItem, { kind: 'collection' }>).collection

describe('parsePayload optional fields', () => {
  it('parses an older payload without favicons, images or icons', () => {
    const p = parsePayload(json([{ key: 'b:1', kind: 'bookmark', bookmark: bm() }, { key: 'c:2', kind: 'collection', collection: coll() }]))!
    expect(p.items).toHaveLength(2)
    expect(bookmarkOf(p.items[0])).toMatchObject({ title: 'A', favicon: undefined, image: undefined })
    expect(collectionOf(p.items[1])).toMatchObject({ name: 'C', note: 'Why these', icon: undefined })
  })

  it('keeps https favicon and image urls', () => {
    const b = bookmarkOf(only([{ key: 'b:1', kind: 'bookmark', bookmark: bm({ favicon: 'https://example.com/favicon.ico', image: 'https://cdn.example.com/og.png' }) }]))
    expect(b.favicon).toBe('https://example.com/favicon.ico')
    expect(b.image).toBe('https://cdn.example.com/og.png')
  })

  it.each([
    ['http', 'http://example.com/favicon.ico'],
    ['data', 'data:image/png;base64,AAAA'],
    ['javascript', 'javascript:alert(1)'],
    ['chrome-extension', 'chrome-extension://abc/_favicon/?pageUrl=x'],
    ['relative', '/favicon.ico'],
    ['too long', `https://example.com/${'a'.repeat(2048)}`],
    ['not a string', 42],
  ])('drops a %s favicon or image', (_, url) => {
    const b = bookmarkOf(only([{ key: 'b:1', kind: 'bookmark', bookmark: bm({ favicon: url, image: url }) }]))
    expect(b.favicon).toBeUndefined()
    expect(b.image).toBeUndefined()
  })

  it('cleans bookmarks inside collections and graph nodes', () => {
    const bad = bm({ favicon: 'data:x', image: 'http://x.test/a.png' })
    const graph = {
      name: 'G',
      description: '',
      mode: 'board',
      steps: [],
      links: [],
      nodes: [
        { id: 'n1', stepId: null, x: 0, y: 0, ref: { kind: 'bookmark', bookmark: bad } },
        { id: 'n2', stepId: null, x: 0, y: 0, ref: { kind: 'collection', key: 'c:9', collection: coll({ icon: { type: 'glyph', value: 'nope' }, bookmarks: [bad] }) } },
      ],
    }
    const p = parsePayload(json([{ key: 'c:1', kind: 'collection', collection: coll({ bookmarks: [bad] }) }, { key: 'g:2', kind: 'graph', graph }]))!
    const c = collectionOf(p.items[0])
    expect(c.bookmarks[0].favicon).toBeUndefined()
    const nodes = (p.items[1] as Extract<PayloadItem, { kind: 'graph' }>).graph.nodes
    expect((nodes[0].ref as { bookmark: PBookmark }).bookmark.image).toBeUndefined()
    const nc = (nodes[1].ref as { collection: PCollection }).collection
    expect(nc.icon).toBeUndefined()
    expect(nc.bookmarks[0].favicon).toBeUndefined()
  })

  it('keeps a valid collection icon', () => {
    expect(collectionOf(only([{ key: 'c:1', kind: 'collection', collection: coll({ icon: { type: 'glyph', value: 'inbox' } }) }])).icon).toEqual({
      type: 'glyph',
      value: 'inbox',
    })
  })
})

describe('toIcon', () => {
  it('accepts the known glyphs, short emoji and https images', () => {
    expect(toIcon({ type: 'glyph', value: 'folder' })).toEqual({ type: 'glyph', value: 'folder' })
    expect(toIcon({ type: 'emoji', value: '📚' })).toEqual({ type: 'emoji', value: '📚' })
    expect(toIcon({ type: 'emoji', value: '👩🏽‍💻' })).toEqual({ type: 'emoji', value: '👩🏽‍💻' })
    expect(toIcon({ type: 'image', url: 'https://example.com/logo.png' })).toEqual({ type: 'image', url: 'https://example.com/logo.png' })
  })

  it.each([
    ['unknown glyph', { type: 'glyph', value: 'skull' }],
    ['glyph with markup', { type: 'glyph', value: '<path d="M0 0"/>' }],
    ['the extension’s own type name', { type: 'icon', value: 'folder' }],
    ['long emoji', { type: 'emoji', value: 'x'.repeat(17) }],
    ['empty emoji', { type: 'emoji', value: '  ' }],
    ['non-string emoji', { type: 'emoji', value: 7 }],
    ['data-url image', { type: 'image', url: 'data:image/png;base64,AAAA' }],
    ['http image', { type: 'image', url: 'http://example.com/a.png' }],
    ['image under value', { type: 'image', value: 'https://example.com/a.png' }],
    ['null', null],
    ['string', 'folder'],
    ['array', []],
  ])('drops a %s', (_, raw) => {
    expect(toIcon(raw)).toBeUndefined()
  })
})
