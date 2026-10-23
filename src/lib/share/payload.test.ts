import { describe, expect, it } from 'vitest'
import { allBookmarks, allNotes, COLLECTION_DEPTH, NOTE_MAX, parsePayload, toIcon } from './payload'
import type { PBookmark, PCollection, PGraphNode, PNoteLink, PayloadItem } from './types'

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

describe('parsePayload notes', () => {
  const note = (extra: Record<string, unknown> = {}) => ({ key: 'n:1', title: 'Plan', body: 'Read **this** first', tags: ['ideas'], ...extra })
  const noteOf = (i: PayloadItem) => (i as Extract<PayloadItem, { kind: 'note' }>).note

  it('keeps valid note links and drops malformed ones', () => {
    const links = [
      { kind: 'bookmark', bookmark: bm({ favicon: 'http://x.test/f.ico' }) },
      { kind: 'collection', key: 'n:1/c:2', name: 'Reading', hue: 2, icon: { type: 'glyph', value: 'book' } },
      { kind: 'graph', key: 'n:1/g:4', name: 'Path' },
      { kind: 'graph', key: 'n:1/g:5' },
      { kind: 'collection', key: 'n:1/c:3', name: 'Bad hue', hue: 9 },
      { kind: 'bookmark', bookmark: { title: 'no url' } },
      'junk',
    ]
    const n = noteOf(parsePayload(json([{ key: 'n:1', kind: 'note', note: note({ links }) }]))!.items[0])
    expect(n.links).toHaveLength(3)
    expect(n.links![2]).toEqual({ kind: 'graph', key: 'n:1/g:4', name: 'Path' })
    expect(n.links![0]).toMatchObject({ kind: 'bookmark', bookmark: { favicon: undefined } })
    expect(n.links![1]).toEqual({ kind: 'collection', key: 'n:1/c:2', name: 'Reading', hue: 2, icon: { type: 'glyph', value: 'book' } })
  })

  it('keeps a note item between other items', () => {
    const p = parsePayload(json([{ key: 'b:1', kind: 'bookmark', bookmark: bm() }, { key: 'n:1', kind: 'note', note: note() }, { key: 'c:2', kind: 'collection', collection: coll() }]))!
    expect(p.items.map((i) => i.kind)).toEqual(['bookmark', 'note', 'collection'])
    expect(noteOf(p.items[1])).toEqual(note())
  })

  it('drops a malformed note item instead of failing the page', () => {
    const p = parsePayload(
      json([
        { key: 'n:1', kind: 'note', note: note({ title: 7 }) },
        { key: 'n:2', kind: 'note', note: note({ body: null }) },
        { key: 'n:3', kind: 'note', note: note({ key: '' }) },
        { key: 'n:4', kind: 'note' },
        { key: 'n:5', kind: 'note', note: 'text' },
        { key: 'b:1', kind: 'bookmark', bookmark: bm() },
      ]),
    )!
    expect(p.items.map((i) => i.key)).toEqual(['b:1'])
  })

  it('caps the body, keeps only string tags and treats missing tags as none', () => {
    const n = noteOf(only([{ key: 'n:1', kind: 'note', note: note({ body: 'x'.repeat(NOTE_MAX + 50), tags: ['a', 3, null, 'b'] }) }]))
    expect(n.body).toHaveLength(NOTE_MAX)
    expect(n.tags).toEqual(['a', 'b'])
    expect(noteOf(only([{ key: 'n:1', kind: 'note', note: note({ tags: undefined }) }])).tags).toEqual([])
  })

  it('keeps well-formed collection notes and drops the rest', () => {
    const c = collectionOf(only([{ key: 'c:2', kind: 'collection', collection: coll({ notes: [note({ key: 'c:2/n:1' }), { key: 'c:2/n:2' }, null, 'x', note({ key: 'c:2/n:3', title: '' })] }) }]))
    expect(c.notes?.map((n) => n.key)).toEqual(['c:2/n:1', 'c:2/n:3'])
    expect(c.bookmarks).toHaveLength(1)
  })

  it('ignores a collection notes field that is not a list, and cleans notes in graph collections', () => {
    expect(collectionOf(only([{ key: 'c:2', kind: 'collection', collection: coll({ notes: 'nope' }) }])).notes).toBeUndefined()
    expect(collectionOf(only([{ key: 'c:2', kind: 'collection', collection: coll() }])).notes).toBeUndefined()
    const g = only([
      {
        key: 'g:1',
        kind: 'graph',
        graph: { name: 'G', description: '', mode: 'board', steps: [], links: [], nodes: [{ id: 'k', stepId: null, x: 0, y: 0, ref: { kind: 'collection', key: 'g:1/n:k', collection: coll({ notes: [note({ key: 'g:1/n:k/n:1' }), 5] }) } }] },
      },
    ]) as Extract<PayloadItem, { kind: 'graph' }>
    const ref = g.graph.nodes[0].ref as Extract<PGraphNode['ref'], { kind: 'collection' }>
    expect(ref.collection.notes?.map((n) => n.key)).toEqual(['g:1/n:k/n:1'])
  })

  it('keeps note nodes in a graph and drops a malformed one with its arrows, not the graph', () => {
    const at = (id: string, ref: unknown) => ({ id, stepId: null, x: 0, y: 0, ref })
    const g = only([
      {
        key: 'g:1',
        kind: 'graph',
        graph: {
          name: 'G', description: '', mode: 'board', steps: [],
          nodes: [at('a', { kind: 'note', note: note({ key: 'g:1/n:a' }) }), at('b', { kind: 'bookmark', bookmark: bm() }), at('c', { kind: 'note', note: note({ title: 3 }) }), at('d', { kind: 'note' })],
          links: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'd', to: 'a' }],
        },
      },
    ]) as Extract<PayloadItem, { kind: 'graph' }>
    expect(g.graph.nodes.map((n) => n.id)).toEqual(['a', 'b'])
    expect(g.graph.nodes[0].ref).toEqual({ kind: 'note', note: { ...note({ key: 'g:1/n:a' }), links: undefined } })
    expect(g.graph.links).toEqual([{ from: 'a', to: 'b' }])
  })
})

describe('nested collections', () => {
  const sub = (key: string, extra: Record<string, unknown> = {}) => ({ key, ...coll({ bookmarks: [bm({ key: `${key}-b`, title: key })] }), ...extra })

  it('parses an old flat payload as it was', () => {
    const c = collectionOf(only([{ key: 'c:2', kind: 'collection', collection: coll({ bookmarks: [bm({ key: 'c:2/b:1' }), bm({ key: 'c:2/b:9' })] }) }]))
    expect(c.collections).toBeUndefined()
    expect(allBookmarks(c).map((b) => b.key)).toEqual(['c:2/b:1', 'c:2/b:9'])
  })

  it('keeps nested sub-collections in order, re-checks them and totals every level', () => {
    const c = collectionOf(
      only([
        {
          key: 'c:2',
          kind: 'collection',
          collection: coll({
            notes: [{ key: 'c:2/n:1', title: 'N', body: '', tags: [] }],
            collections: [
              sub('c:2/c:4', { icon: { type: 'glyph', value: 'nope' }, collections: [sub('c:2/c:5', { notes: [{ key: 'c:2/n:2', title: 'M', body: '', tags: [] }] })] }),
              { name: 'no key', bookmarks: [] },
              { key: 'c:2/c:6', name: 'no bookmarks' },
              'junk',
              sub('c:2/c:7', { hue: 9 }),
            ],
          }),
        },
      ]),
    )
    expect(c.collections?.map((s) => s.key)).toEqual(['c:2/c:4', 'c:2/c:7'])
    expect(c.collections?.[0].icon).toBeUndefined()
    expect(c.collections?.[1].hue).toBe(1)
    expect(c.collections?.[0].collections?.[0].key).toBe('c:2/c:5')
    expect(allBookmarks(c).map((b) => b.title)).toEqual(['A', 'c:2/c:4', 'c:2/c:5', 'c:2/c:7'])
    expect(allNotes(c).map((n) => n.key)).toEqual(['c:2/n:1', 'c:2/n:2'])
  })

  it(`drops levels below ${COLLECTION_DEPTH}`, () => {
    let deep: Record<string, unknown> = sub('c:2/c:last')
    for (let i = 20; i > 0; i--) deep = sub(`c:2/c:${i}`, { collections: [deep] })
    const c = collectionOf(only([{ key: 'c:2', kind: 'collection', collection: coll({ collections: [deep] }) }]))
    let depth = 0
    for (let s = c.collections?.[0]; s; s = s.collections?.[0]) depth++
    expect(depth).toBe(COLLECTION_DEPTH)
  })
})

describe('note links with contents', () => {
  const graph = (nodes: unknown[]) => ({ name: 'G', description: '', mode: 'board', steps: [], links: [], nodes })
  const note = (links: unknown[], key = 'n:1') => ({ key, title: 'T', body: '', tags: [], links })
  const linksOf = (i: PayloadItem) => (i as Extract<PayloadItem, { kind: 'note' }>).note.links!

  it('accepts the old name-only shape and the new one with contents', () => {
    const links = linksOf(
      only([
        {
          key: 'n:1',
          kind: 'note',
          note: note([
            { kind: 'collection', key: 'n:1/c:2', name: 'Old', hue: 2 },
            { kind: 'graph', key: 'n:1/g:3', name: 'Old graph' },
            { kind: 'collection', key: 'n:1/c:4', name: 'New', hue: 3, collection: coll({ collections: [{ key: 'n:1/c:4/c:5', ...coll() }] }) },
            { kind: 'graph', key: 'n:1/g:6', name: 'New graph', graph: graph([{ id: 'a', stepId: null, x: 0, y: 0, ref: { kind: 'bookmark', bookmark: bm({ key: 'n:1/g:6/n:a' }) } }]) },
            { kind: 'graph', key: 'n:1/g:7', name: 'Bad contents', graph: { nodes: 'x' } },
          ]),
        },
      ]),
    )
    expect(links.map((l) => [l.kind, 'key' in l ? l.key : '', 'collection' in l || 'graph' in l])).toEqual([
      ['collection', 'n:1/c:2', false],
      ['graph', 'n:1/g:3', false],
      ['collection', 'n:1/c:4', true],
      ['graph', 'n:1/g:6', true],
      ['graph', 'n:1/g:7', false],
    ])
    const c = links[2] as Extract<PNoteLink, { kind: 'collection' }>
    expect(c.collection?.collections?.[0].key).toBe('n:1/c:4/c:5')
  })

  it('embeds one level only: notes inside a linked graph keep their links as name-only chips', () => {
    const inner = note([{ kind: 'graph', key: 'x/g:9', name: 'H', graph: graph([]) }, { kind: 'collection', key: 'x/c:9', name: 'C', hue: 1, collection: coll() }], 'n:1/g:6/n:a')
    const links = linksOf(
      only([{ key: 'n:1', kind: 'note', note: note([{ kind: 'graph', key: 'n:1/g:6', name: 'G', graph: graph([{ id: 'a', stepId: null, x: 0, y: 0, ref: { kind: 'note', note: inner } }]) }]) }]),
    )
    const g = (links[0] as Extract<PNoteLink, { kind: 'graph' }>).graph!
    const n = g.nodes[0].ref as Extract<PGraphNode['ref'], { kind: 'note' }>
    expect(n.note.links).toEqual([
      { kind: 'graph', key: 'x/g:9', name: 'H' },
      { kind: 'collection', key: 'x/c:9', name: 'C', hue: 1, icon: undefined },
    ])
  })
})
