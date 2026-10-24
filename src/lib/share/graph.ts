// Mirrors the Jupiter Jots extension's pure graph rules so share pages lay out
// exactly like the app:
//   - jj_source_code/src/lib/graph.ts            -> boardColumns, bandOf (+ layout constants)
//   - jj_source_code/src/components/graph/Wires.tsx -> computePath
// Payload nodes always carry x/y, so no auto-placement is ported.
import type { PGraph } from './types'

export const NODE_W = 240
export const COL_X0 = 40
export const COL_STEP = 300
export const ROW_Y0 = 64
export const ROW_STEP = 176
const BAND_PAD = 20

export interface BoardColumn {
  key: string
  label: string
  stepId: string | null
  derived: boolean
  nodeIds: string[]
}

function depths(g: PGraph): Map<string, number> {
  const memo = new Map<string, number>()
  const incoming = (id: string) => g.links.filter((l) => l.to === id).map((l) => l.from)
  const depth = (id: string): number => {
    const known = memo.get(id)
    if (known !== undefined) return known
    memo.set(id, 0) // guards against malformed cyclic data
    const d = Math.max(-1, ...incoming(id).map(depth)) + 1
    memo.set(id, d)
    return d
  }
  for (const n of g.nodes) depth(n.id)
  return memo
}

export function boardColumns(g: PGraph): BoardColumn[] {
  if (g.steps.length) {
    const cols: BoardColumn[] = g.steps.map((s) => ({
      key: s.id,
      label: s.label,
      stepId: s.id,
      derived: false,
      nodeIds: g.nodes.filter((n) => n.stepId === s.id).map((n) => n.id),
    }))
    const stepIds = new Set(g.steps.map((s) => s.id))
    const loose = g.nodes.filter((n) => n.stepId === null || !stepIds.has(n.stepId)).map((n) => n.id)
    if (loose.length) cols.push({ key: 'none', label: 'No step', stepId: null, derived: false, nodeIds: loose })
    return cols
  }
  if (!g.links.length) {
    return [{ key: 'all', label: 'All items', stepId: null, derived: true, nodeIds: g.nodes.map((n) => n.id) }]
  }
  const d = depths(g)
  const max = Math.max(...d.values())
  const cols: BoardColumn[] = []
  for (let i = 0; i <= max; i++) {
    const label = i === 0 ? 'Start here' : i === max ? 'Finally' : 'Then'
    cols.push({
      key: `depth-${i}`,
      label,
      stepId: null,
      derived: true,
      nodeIds: g.nodes.filter((n) => d.get(n.id) === i).map((n) => n.id),
    })
  }
  return cols
}

export function bandOf(g: PGraph): { stepId: string; x0: number; x1: number }[] {
  const out: { stepId: string; x0: number; x1: number }[] = []
  for (const s of g.steps) {
    const xs = g.nodes.filter((n) => n.stepId === s.id).map((n) => n.x)
    if (!xs.length) continue
    out.push({ stepId: s.id, x0: Math.min(...xs) - BAND_PAD, x1: Math.max(...xs) + NODE_W + BAND_PAD })
  }
  return out
}

export interface Box { l: number; t: number; r: number; b: number }

/** The visible canvas, normalised to include nodes that were dragged to negative coordinates. */
export const CANVAS_PAD = 40
const NODE_H = 220
export interface CanvasBounds { x: number; y: number; w: number; h: number }

export function canvasBounds(g: PGraph): CanvasBounds {
  if (!g.nodes.length) return { x: -CANVAS_PAD, y: -CANVAS_PAD, w: 1100, h: 520 }
  const minX = Math.min(...g.nodes.map((n) => n.x))
  const minY = Math.min(...g.nodes.map((n) => n.y))
  const maxX = Math.max(...g.nodes.map((n) => n.x + NODE_W))
  const maxY = Math.max(...g.nodes.map((n) => n.y + NODE_H))
  const x = minX - CANVAS_PAD
  const y = minY - CANVAS_PAD
  return {
    x,
    y,
    w: Math.max(1100, maxX - x + CANVAS_PAD),
    h: Math.max(520, maxY - y + CANVAS_PAD),
  }
}

export interface EdgeAnchors {
  from: { x: number; y: number }
  to: { x: number; y: number }
  axis: 'vertical' | 'horizontal'
}

/** Meet each card at the centre of the side that faces the other card. */
export function edgeAnchors(a: Box, b: Box): EdgeAnchors {
  const acx = (a.l + a.r) / 2
  const acy = (a.t + a.b) / 2
  const bcx = (b.l + b.r) / 2
  const bcy = (b.t + b.b) / 2
  const dx = bcx - acx
  const dy = bcy - acy
  if (Math.abs(dy) >= Math.abs(dx)) {
    return dy >= 0
      ? { from: { x: acx, y: a.b }, to: { x: bcx, y: b.t }, axis: 'vertical' }
      : { from: { x: acx, y: a.t }, to: { x: bcx, y: b.b }, axis: 'vertical' }
  }
  return dx >= 0
    ? { from: { x: a.r, y: acy }, to: { x: b.l, y: bcy }, axis: 'horizontal' }
    : { from: { x: a.l, y: acy }, to: { x: b.r, y: bcy }, axis: 'horizontal' }
}

/** Cubic path from the centre of one facing side to the centre of the other. */
export function computePath(a: Box, b: Box): string {
  const { from, to, axis } = edgeAnchors(a, b)
  if (axis === 'vertical') {
    const dir = to.y >= from.y ? 1 : -1
    const c = Math.max(6, Math.abs(to.y - from.y) / 2)
    return `M${from.x} ${from.y}C${from.x} ${from.y + dir * c} ${to.x} ${to.y - dir * c} ${to.x} ${to.y}`
  }
  const dir = to.x >= from.x ? 1 : -1
  const c = Math.max(6, Math.abs(to.x - from.x) / 2)
  return `M${from.x} ${from.y}C${from.x + dir * c} ${from.y} ${to.x - dir * c} ${to.y} ${to.x} ${to.y}`
}
