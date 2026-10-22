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

/** Cubic path between two card boxes: sideways, down, backwards or upward depending on layout. */
export function computePath(a: Box, b: Box): string {
  const acx = (a.l + a.r) / 2, acy = (a.t + a.b) / 2
  const bcx = (b.l + b.r) / 2, bcy = (b.t + b.b) / 2
  if (b.l >= a.r - 4) {
    const c = Math.max(32, (b.l - a.r) / 2)
    return `M${a.r} ${acy}C${a.r + c} ${acy} ${b.l - c} ${bcy} ${b.l - 2} ${bcy}`
  }
  if (b.t >= a.b) {
    const c = Math.max(20, (b.t - a.b) / 2)
    return `M${acx} ${a.b}C${acx} ${a.b + c} ${bcx} ${b.t - c} ${bcx} ${b.t - 2}`
  }
  if (b.r <= a.l) {
    return `M${a.l} ${acy}C${a.l - 48} ${acy} ${b.r + 48} ${bcy} ${b.r + 2} ${bcy}`
  }
  const c = Math.max(20, (a.t - b.b) / 2)
  return `M${acx} ${a.t}C${acx} ${a.t - c} ${bcx} ${b.b + c} ${bcx} ${b.b + 2}`
}
