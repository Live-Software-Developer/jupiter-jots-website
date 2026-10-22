import { describe, expect, it } from 'vitest'
import { commentTargets, inScope, isTarget, runKey, targetLabel } from './targets'
import type { PBookmark, PayloadItem } from './types'

const bm = (key: string, title: string): PBookmark => ({ key, url: 'https://x.dev', title, domain: 'x.dev', note: '', tags: [], read: false })

const items: PayloadItem[] = [
  { key: 'b:1', kind: 'bookmark', bookmark: bm('b:1', 'One') },
  { key: 'b:2', kind: 'bookmark', bookmark: bm('b:2', '') },
  { key: 'c:3', kind: 'collection', collection: { name: 'Reading', note: '', hue: 1, bookmarks: [bm('c:3/b:12', 'Twelve')] } },
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
    expect(targetLabel(t, 'g:4')).toBe('Path')
    expect(targetLabel(t, 'g:4/n:a')).toBe('Node A')
    expect(targetLabel(t, 'g:4/n:k')).toBe('Deep')
    expect(targetLabel(t, 'g:4/n:k/b:9')).toBe('Nine')
    expect(targetLabel(t, 'c:99')).toBe('this share')
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
  it('knows which keys can be posted on', () => {
    expect(isTarget(t, 'g:4/n:k/b:9')).toBe(true)
    expect(isTarget(t, runKey('b:1'))).toBe(false)
    expect(isTarget(t, 'c:99')).toBe(false)
  })
})
