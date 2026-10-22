import type { PCollection, PayloadItem } from './types'

/** A collection a share page can open in a sheet: a collection item ("c:3") or a graph's collection node ("g:1/n:abc"). */
export interface SheetEntry {
  key: string
  collection: PCollection
  /** Name of the graph the collection sits in, for graph nodes. */
  graph?: string
}

/** Every collection in a payload that can open as a sheet, in payload order. */
export function sheetEntries(items: PayloadItem[]): SheetEntry[] {
  const out: SheetEntry[] = []
  for (const item of items) {
    if (item.kind === 'collection') out.push({ key: item.key, collection: item.collection })
    if (item.kind === 'graph') {
      for (const n of item.graph.nodes) {
        if (n.ref.kind === 'collection') out.push({ key: `${item.key}/n:${n.id}`, collection: n.ref.collection, graph: item.graph.name })
      }
    }
  }
  return out
}
