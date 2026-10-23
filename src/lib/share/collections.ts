import { plural } from './format'
import { allBookmarks, allNotes } from './payload'
import type { PCollection, PGraph, PNote, PayloadItem } from './types'

/** "2 notes · 5 bookmarks", counting every level. Server-safe, so bands use it too. */
export function collectionCounts(c: PCollection): string {
  const notes = allNotes(c).length
  const bookmarks = plural(allBookmarks(c).length, 'bookmark')
  return notes ? `${plural(notes, 'note')} · ${bookmarks}` : bookmarks
}

/**
 * A collection a share page can open in a sheet: a collection item ("c:3"), a graph's collection
 * node ("g:1/n:abc") or a note's linked collection ("n:5/c:7", "g:1/n:abc/c:7", "n:5/g:2/n:x").
 */
export interface SheetEntry {
  key: string
  collection: PCollection
  /** Name of the graph the collection sits in, for graph nodes. */
  graph?: string
  /** Title of the note that links it, for linked collections. */
  note?: string
}

/** Every collection in a payload that can open as a sheet, in payload order. */
export function sheetEntries(items: PayloadItem[]): SheetEntry[] {
  const out: SheetEntry[] = []
  const fromNote = (n: PNote) => {
    for (const l of n.links ?? []) {
      if (l.kind === 'collection' && l.collection) {
        out.push({ key: l.key, collection: l.collection, note: n.title || 'Untitled note' })
        fromCollection(l.collection)
      }
      if (l.kind === 'graph' && l.graph) fromGraph(l.graph, l.key)
    }
  }
  const fromCollection = (c: PCollection) => {
    for (const n of c.notes ?? []) fromNote(n)
    for (const s of c.collections ?? []) fromCollection(s)
  }
  const fromGraph = (g: PGraph, key: string) => {
    for (const n of g.nodes) {
      if (n.ref.kind === 'collection') {
        out.push({ key: `${key}/n:${n.id}`, collection: n.ref.collection, graph: g.name })
        fromCollection(n.ref.collection)
      }
      if (n.ref.kind === 'note') fromNote(n.ref.note)
    }
  }
  for (const item of items) {
    if (item.kind === 'collection') {
      out.push({ key: item.key, collection: item.collection })
      fromCollection(item.collection)
    }
    if (item.kind === 'graph') fromGraph(item.graph, item.key)
    if (item.kind === 'note') fromNote(item.note)
  }
  return out
}
