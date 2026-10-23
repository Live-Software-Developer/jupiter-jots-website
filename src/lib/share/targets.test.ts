import { describe, expect, it } from 'vitest'
import { commentTargets, inScope, isTarget, runKey, targetLabel } from './targets'
import type { PBookmark, PayloadItem } from './types'

const bm = (key: string, title: string): PBookmark => ({ key, url: 'https://x.dev', title, domain: 'x.dev', note: '', tags: [], read: false })

const items: PayloadItem[] = [
  { key: 'b:1', kind: 'bookmark', bookmark: bm('b:1', 'One') },
  { key: 'b:2', kind: 'bookmark', bookmark: bm('b:2', '') },
  {
    key: 'c:3',
    kind: 'collection',
    collection: { name: 'Reading', note: '', hue: 1, bookmarks: [bm('c:3/b:12', 'Twelve')], notes: [{ key: 'c:3/n:5', title: 'Why', body: '', tags: [] }] },
  },
  { key: 'n:6', kind: 'note', note: { key: 'n:6', title: '', body: 'Loose', tags: [] } },
  {
    key: 'g:4',
    kind: 'graph',
    graph: {
      name: 'Path',
      description: '',
      mode: 'board',
      steps: [],
      links: [],
      nodes: [
        { id: 'a', stepId: null, x: 0, y: 0, ref: { kind: 'bookmark', bookmark: bm('g:4/n:a', 'Node A') } },
        {
          id: 'k',
          stepId: null,
          x: 0,
          y: 0,
          ref: { kind: 'collection', key: 'g:4/n:k', collection: { name: 'Deep', note: '', hue: 2, bookmarks: [bm('g:4/n:k/b:9', 'Nine')] } },
        },
        { id: 'm', stepId: null, x: 0, y: 0, ref: { kind: 'note', note: { key: 'g:4/n:m', title: 'Why this order', body: '', tags: [] } } },
      ],
    },
  },
]
const t = commentTargets(items)

describe('commentTargets', () => {
  it('labels every key shape and falls back to "this share"', () => {
    expect(targetLabel(t, '')).toBe('The whole share')
    expect(targetLabel(t, 'b:1')).toBe('One')
    expect(targetLabel(t, 'b:2')).toBe('x.dev')
    expect(targetLabel(t, 'c:3')).toBe('Reading')
    expect(targetLabel(t, 'c:3/b:12')).toBe('Twelve')
    expect(targetLabel(t, 'c:3/n:5')).toBe('Why')
    expect(targetLabel(t, 'n:6')).toBe('Untitled note')
    expect(targetLabel(t, 'g:4')).toBe('Path')
    expect(targetLabel(t, 'g:4/n:a')).toBe('Node A')
    expect(targetLabel(t, 'g:4/n:k')).toBe('Deep')
    expect(targetLabel(t, 'g:4/n:k/b:9')).toBe('Nine')
    expect(targetLabel(t, 'g:4/n:m')).toBe('Why this order')
    expect(targetLabel(t, 'c:99')).toBe('this share')
    expect(targetLabel(t, 'constructor')).toBe('this share')
    expect(inScope(t, 'constructor', 'b:1')).toBe(false)
  })
  it('groups adjacent bookmarks into a run', () => {
    expect(t.runs[runKey('b:1')]).toEqual({ label: 'Shared bookmarks', keys: ['b:1', 'b:2'] })
    expect(targetLabel(t, runKey('b:1'))).toBe('Shared bookmarks')
  })
  it('scopes a filter to the key and what is nested in it', () => {
    expect(inScope(t, 'c:3', 'c:3')).toBe(true)
    expect(inScope(t, 'c:3', 'c:3/b:12')).toBe(true)
    expect(inScope(t, 'c:3', 'c:30')).toBe(false)
    expect(inScope(t, 'g:4/n:k', 'g:4/n:k/b:9')).toBe(true)
    expect(inScope(t, '', 'c:3')).toBe(false)
    expect(inScope(t, '', '')).toBe(true)
    expect(inScope(t, runKey('b:1'), 'b:2')).toBe(true)
  })
  it("offers notes as targets, a collection's notes before its bookmarks", () => {
    expect(isTarget(t, 'n:6')).toBe(true)
    expect(isTarget(t, 'c:3/n:5')).toBe(true)
    expect(isTarget(t, 'g:4/n:m')).toBe(true)
    expect(inScope(t, 'g:4', 'g:4/n:m')).toBe(true)
    expect(inScope(t, 'c:3', 'c:3/n:5')).toBe(true)
    expect(t.groups.find((g) => g.item.key === 'c:3')?.nested.map((n) => n.key)).toEqual(['c:3/n:5', 'c:3/b:12'])
  })
  it('knows which keys can be posted on', () => {
    expect(isTarget(t, 'g:4/n:k/b:9')).toBe(true)
    expect(isTarget(t, runKey('b:1'))).toBe(false)
    expect(isTarget(t, 'c:99')).toBe(false)
  })
})

describe('nested targets', () => {
  const nested: PayloadItem[] = [
    {
      key: 'c:3',
      kind: 'collection',
      collection: {
        name: 'Web3',
        note: '',
        hue: 1,
        bookmarks: [bm('c:3/b:1', 'Top')],
        collections: [
          {
            key: 'c:3/c:7',
            name: 'Near',
            note: '',
            hue: 2,
            bookmarks: [bm('c:3/b:2', 'Rust cross contract calls')],
            notes: [{ key: 'c:3/n:4', title: 'Why Near', body: '', tags: [] }],
            collections: [{ key: 'c:3/c:8', name: 'Deeper', note: '', hue: 3, bookmarks: [bm('c:3/b:3', 'Staking')] }],
          },
        ],
      },
    },
    {
      key: 'n:5',
      kind: 'note',
      note: {
        key: 'n:5',
        title: 'Plan',
        body: '',
        tags: [],
        links: [
          { kind: 'collection', key: 'n:5/c:9', name: 'Linked', hue: 1, collection: { name: 'Linked', note: '', hue: 1, bookmarks: [bm('n:5/c:9/b:1', 'L1')] } },
          {
            kind: 'graph',
            key: 'n:5/g:2',
            name: 'G',
            graph: { name: 'G', description: '', mode: 'board', steps: [], links: [], nodes: [{ id: 'x', stepId: null, x: 0, y: 0, ref: { kind: 'bookmark', bookmark: bm('n:5/g:2/n:x', 'Gx') } }] },
          },
          { kind: 'graph', key: 'n:5/g:3', name: 'Name only' },
        ],
      },
    },
  ]
  const n = commentTargets(nested)
  const flat = (i: number) => [n.groups[i].item, ...n.groups[i].nested].map((x) => [x.key, x.kind, x.depth, x.parent ?? null])

  it('lists sub-collections, then their notes and bookmarks, with depth and parent', () => {
    expect(flat(0)).toEqual([
      ['c:3', 'collection', 0, null],
      ['c:3/c:7', 'collection', 1, 'Web3'],
      ['c:3/c:8', 'collection', 2, 'Near'],
      ['c:3/b:3', 'bookmark', 3, 'Deeper'],
      ['c:3/n:4', 'note', 2, 'Near'],
      ['c:3/b:2', 'bookmark', 2, 'Near'],
      ['c:3/b:1', 'bookmark', 1, 'Web3'],
    ])
  })

  it("puts a note's linked collections and graphs under it; name-only links are not targets", () => {
    expect(flat(1)).toEqual([
      ['n:5', 'note', 0, null],
      ['n:5/c:9', 'collection', 1, 'Plan'],
      ['n:5/c:9/b:1', 'bookmark', 2, 'Linked'],
      ['n:5/g:2', 'graph', 1, 'Plan'],
      ['n:5/g:2/n:x', 'bookmark', 2, 'G'],
    ])
    expect(isTarget(n, 'n:5/g:3')).toBe(false)
    expect(inScope(n, 'n:5', 'n:5/g:2/n:x')).toBe(true)
  })

  it('a sub-collection filter covers what is inside it, though its keys keep the top prefix', () => {
    expect(targetLabel(n, 'c:3/c:7')).toBe('Near')
    expect(inScope(n, 'c:3/c:7', 'c:3/b:2')).toBe(true)
    expect(inScope(n, 'c:3/c:7', 'c:3/b:3')).toBe(true)
    expect(inScope(n, 'c:3/c:7', 'c:3/b:1')).toBe(false)
    expect(inScope(n, 'c:3', 'c:3/b:3')).toBe(true)
  })
})
