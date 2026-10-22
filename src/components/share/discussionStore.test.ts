import { describe, expect, it } from 'vitest'
import { commentTargets } from '@/lib/share/targets'
import type { PublicComment } from '@/lib/share/types'
import { buildThreads, initialState, reducer, type Entry, type Shown, type State } from './discussionStore'

const c = (id: number, extra: Partial<Shown> = {}): Shown => ({
  id,
  parent_id: null,
  item_key: '',
  author_name: 'Ada',
  body: `Comment ${id}`,
  status: 'visible',
  pinned: false,
  votes: 0,
  created_at: '2026-10-22T10:00:00Z',
  mine: false,
  ...extra,
})
const loaded = (...comments: Entry[]): State => reducer(initialState(), { type: 'load', comments })
const live = (x: Shown) => ({ ...x, mine: undefined }) as unknown as Shown // live projection: no mine / voted
const targets = commentTargets([])

describe('reducer', () => {
  it('upsert keeps mine and voted that the live projection lacks; votes are absolute', () => {
    let s = loaded(c(1, { mine: true, voted: true, votes: 1 }))
    s = reducer(s, { type: 'upsert', comment: live(c(1, { votes: 4 })) })
    s = reducer(s, { type: 'upsert', comment: live(c(1, { votes: 4 })) })
    expect(s.byId.get(1)).toMatchObject({ mine: true, voted: true, votes: 4 })
  })

  it('upsert inserts an id never seen (approval) and drops held comments that are not ours', () => {
    let s = loaded()
    s = reducer(s, { type: 'upsert', comment: live(c(7)) })
    expect(s.byId.has(7)).toBe(true)
    s = reducer(s, { type: 'upsert', comment: live(c(8, { status: 'held' })) })
    expect(s.byId.has(8)).toBe(false)
    s = reducer(s, { type: 'upsert', comment: c(9, { status: 'held', mine: true }) })
    expect(s.byId.get(9)).toMatchObject({ status: 'held', mine: true })
  })

  it('approval of our held comment keeps mine and clears held', () => {
    let s = loaded(c(3, { status: 'held', mine: true }))
    s = reducer(s, { type: 'upsert', comment: live(c(3)) })
    expect(s.byId.get(3)).toMatchObject({ status: 'visible', mine: true })
  })

  it('hide stubs a known comment, keeping parent and item key, and ignores unknown ids', () => {
    let s = loaded(c(1), c(2, { parent_id: 1, item_key: 'c:3' }))
    const before = s
    s = reducer(s, { type: 'hide', id: 99 })
    expect(s).toBe(before)
    s = reducer(s, { type: 'hide', id: 2 })
    expect(s.byId.get(2)).toEqual({ id: 2, parent_id: 1, hidden: true, item_key: 'c:3' })
  })

  it('upsert un-hides a stub', () => {
    let s = loaded({ id: 4, parent_id: null, hidden: true })
    s = reducer(s, { type: 'upsert', comment: live(c(4, { body: 'Back' })) })
    expect(s.byId.get(4)).toMatchObject({ body: 'Back', mine: false })
  })

  it('load replaces the list but keeps local report flags', () => {
    let s = loaded(c(1), c(2))
    s = reducer(s, { type: 'patch', id: 1, patch: { reported: true } })
    s = reducer(s, { type: 'load', comments: [c(1)] })
    expect([...s.byId.keys()]).toEqual([1])
    expect(s.byId.get(1)).toMatchObject({ reported: true })
  })

  it('failed is an error only before the first load', () => {
    expect(reducer(initialState(), { type: 'failed' }).status).toBe('error')
    const ok = loaded(c(1))
    expect(reducer(ok, { type: 'failed' })).toBe(ok)
  })
})

describe('buildThreads', () => {
  const order = (s: State, sort: 'top' | 'new' = 'top') =>
    buildThreads([...s.byId.values()], s.byId, targets, null, sort).map((t) => [t.top.id, t.replies.map((r) => r.id)])

  it('nests an approved held reply under its parent in id order', () => {
    let s = loaded(c(1), c(2, { parent_id: 1 }), c(4, { parent_id: 1 }))
    s = reducer(s, { type: 'upsert', comment: live(c(3, { parent_id: 1 })) })
    expect(order(s)).toEqual([[1, [2, 3, 4]]])
  })

  it('sorts an approved top-level comment into its place: votes for Top, id for Newest', () => {
    let s = loaded(c(1, { votes: 5 }), c(5, { votes: 0 }))
    s = reducer(s, { type: 'upsert', comment: live(c(3, { votes: 2 })) })
    expect(order(s, 'top').map(([id]) => id)).toEqual([1, 3, 5])
    expect(order(s, 'new').map(([id]) => id)).toEqual([5, 3, 1])
  })

  it('shows replies with an unknown parent as top-level', () => {
    const s = loaded(c(2, { parent_id: 42 } as Partial<PublicComment>))
    expect(order(s)).toEqual([[2, []]])
  })
})
