import { describe, expect, it } from 'vitest'
import { bandOf, boardColumns, canvasBounds, computePath } from './graph'
import type { PGraph, PGraphNode } from './types'

const node = (id: string, stepId: string | null = null, x = 0, y = 0): PGraphNode => ({
  id,
  stepId,
  x,
  y,
  ref: { kind: 'bookmark', bookmark: { key: id, url: '', title: id, domain: '', note: '', tags: [], read: false } },
})
const graph = (p: Partial<PGraph>): PGraph => ({
  name: 'G', description: '', mode: 'board', steps: [], nodes: [], links: [], ...p,
})

describe('boardColumns', () => {
  it('uses a single derived column when stepless and linkless', () => {
    const cols = boardColumns(graph({ nodes: [node('a'), node('b'), node('c')] }))
    expect(cols).toHaveLength(1)
    expect(cols[0]).toMatchObject({ key: 'all', label: 'All items', derived: true, nodeIds: ['a', 'b', 'c'] })
  })
  it('derives depth columns from links', () => {
    const g = graph({
      nodes: [node('a'), node('b'), node('c'), node('d')],
      links: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }, { from: 'a', to: 'd' }],
    })
    const cols = boardColumns(g)
    expect(cols.map((c) => c.nodeIds)).toEqual([['a'], ['b', 'd'], ['c']])
    expect(cols.map((c) => c.label)).toEqual(['Start here', 'Then', 'Finally'])
    expect(cols.map((c) => c.key)).toEqual(['depth-0', 'depth-1', 'depth-2'])
    expect(cols.every((c) => c.derived)).toBe(true)
  })
  it('labels two depths Start here / Finally', () => {
    const g = graph({ nodes: [node('a'), node('b')], links: [{ from: 'a', to: 'b' }] })
    expect(boardColumns(g).map((c) => c.label)).toEqual(['Start here', 'Finally'])
  })
  it('adds a No step column only when needed', () => {
    const steps = [{ id: 's1', label: 'One' }]
    expect(boardColumns(graph({ steps, nodes: [node('a', 's1')] })).map((c) => c.key)).toEqual(['s1'])
    const cols = boardColumns(graph({ steps, nodes: [node('a', 's1'), node('b'), node('c', 'gone')] }))
    expect(cols.map((c) => c.key)).toEqual(['s1', 'none'])
    expect(cols[1]).toMatchObject({ label: 'No step', stepId: null, derived: false, nodeIds: ['b', 'c'] })
  })
  it('survives cyclic data', () => {
    const g = graph({ nodes: [node('a'), node('b')], links: [{ from: 'a', to: 'b' }, { from: 'b', to: 'a' }] })
    expect(boardColumns(g).length).toBeGreaterThan(0)
  })
})

describe('bandOf', () => {
  it('spans min x - 20 to max x + 240 + 20 and skips empty steps', () => {
    const g = graph({
      steps: [{ id: 's1', label: 'One' }, { id: 's2', label: 'Two' }],
      nodes: [node('a', 's1', 40), node('b', 's1', 340)],
    })
    expect(bandOf(g)).toEqual([{ stepId: 's1', x0: 20, x1: 600 }])
  })
})

describe('canvasBounds', () => {
  it('includes nodes dragged to negative coordinates and keeps the design minimum', () => {
    const g = graph({ nodes: [node('a', null, -120, -40), node('b', null, 340, 240)] })
    const b = canvasBounds(g)
    expect(b.x).toBe(-160)
    expect(b.y).toBe(-80)
    expect(b.w).toBe(Math.max(1100, 340 + 240 + 40 - b.x))
    expect(b.h).toBe(Math.max(520, 240 + 220 + 40 - b.y))
    expect(-120 - b.x).toBeGreaterThan(0)
    expect(-40 - b.y).toBeGreaterThan(0)
  })
})

describe('computePath', () => {
  const box = (l: number, t: number, r: number, b: number) => ({ l, t, r, b })
  it('routes sideways between facing centres', () => {
    expect(computePath(box(0, 0, 100, 50), box(200, 100, 300, 150))).toBe('M100 25C150 25 150 125 200 125')
  })
  it('routes down between facing centres', () => {
    expect(computePath(box(0, 0, 100, 50), box(10, 100, 110, 150))).toBe('M50 50C50 75 60 75 60 100')
  })
  it('routes backwards between facing centres', () => {
    expect(computePath(box(200, 0, 300, 50), box(0, 10, 100, 40))).toBe('M200 25C150 25 150 25 100 25')
  })
  it('routes upward between facing centres', () => {
    expect(computePath(box(0, 100, 100, 150), box(10, 0, 110, 50))).toBe('M50 100C50 75 60 75 60 50')
  })
})
