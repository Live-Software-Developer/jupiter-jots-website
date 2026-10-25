import type { PBookmark, PCollection, PGraph, PNote, PayloadItem } from './types'

/** What a target is, for the picker's icon. */
export type TargetKind = 'bookmark' | 'collection' | 'graph' | 'note'

/** Something a comment can be about: a payload key ("" is the whole share) and its label. */
export interface CommentTarget {
  key: string
  label: string
  kind: TargetKind
  /** 0 for a top-level item; each level nested inside it adds one. */
  depth: number
  /** The label of the target it sits in, for showing a nested pick on its own ("Near › Rust"). */
  parent?: string
}

/** One top-level item and the keys nested inside it, depth-first in page order (see CommentTarget.depth). */
export interface TargetGroup {
  item: CommentTarget
  nested: CommentTarget[]
}

/**
 * Every key a comment of this share can carry, with labels, built on the server from the
 * payload so only labels cross into the client. `runs` maps the filter key of a band of
 * adjacent bookmarks to the keys it holds. `covers` maps a sub-collection's key to the keys
 * inside it, which keep the top item's prefix ("c:3/c:7" holds "c:3/b:12").
 */
export interface CommentTargets {
  groups: TargetGroup[]
  runs: Record<string, { label: string; keys: string[] }>
  covers?: Record<string, string[]>
}

export const WHOLE_SHARE = 'The whole share'
/** Label for a key the payload no longer has (the item was removed from a live share). */
export const UNKNOWN_TARGET = 'this share'

export const bookmarkLabel = (b: PBookmark) => b.title || b.domain || 'Untitled bookmark'
export const collectionLabel = (c: PCollection) => c.name || 'Untitled collection'
export const graphLabel = (g: PGraph) => g.name || 'Untitled graph'
export const noteLabel = (n: PNote) => n.title || (n.lock ? 'Locked note' : 'Untitled note')

type Push = (t: CommentTarget) => void

/**
 * What sits inside a collection at `depth`, in the order its sheet lists it: each sub-collection
 * with its own contents one level deeper, then its notes and bookmarks. Returns every key inside.
 */
function collectionTargets(c: PCollection, depth: number, parent: string, push: Push, covers: Record<string, string[]>): string[] {
  const keys: string[] = []
  for (const sub of c.collections ?? []) {
    const label = collectionLabel(sub)
    push({ key: sub.key, label, kind: 'collection', depth, parent })
    const inner = collectionTargets(sub, depth + 1, label, push, covers)
    covers[sub.key] = [sub.key, ...inner]
    keys.push(sub.key, ...inner)
  }
  for (const n of c.notes ?? []) {
    noteTargets(n, depth, parent, push, covers)
    keys.push(n.key)
  }
  for (const b of c.bookmarks) {
    push({ key: b.key, label: bookmarkLabel(b), kind: 'bookmark', depth, parent })
    keys.push(b.key)
  }
  return keys
}

/** A graph's nodes at `depth`; a collection node's contents one level deeper. */
function graphTargets(g: PGraph, depth: number, parent: string, push: Push, covers: Record<string, string[]>) {
  for (const n of g.nodes) {
    if (n.ref.kind === 'bookmark') push({ key: n.ref.bookmark.key, label: bookmarkLabel(n.ref.bookmark), kind: 'bookmark', depth, parent })
    else if (n.ref.kind === 'note') noteTargets(n.ref.note, depth, parent, push, covers)
    else {
      const label = collectionLabel(n.ref.collection)
      push({ key: n.ref.key, label, kind: 'collection', depth, parent })
      collectionTargets(n.ref.collection, depth + 1, label, push, covers)
    }
  }
}

/** A note, then the collections and graphs it carries (links with contents) one level deeper. */
function noteTargets(n: PNote, depth: number, parent: string | undefined, push: Push, covers: Record<string, string[]>) {
  const label = noteLabel(n)
  push({ key: n.key, label, kind: 'note', depth, parent })
  for (const l of n.links ?? []) {
    if (l.kind === 'collection' && l.collection) {
      const name = collectionLabel(l.collection)
      push({ key: l.key, label: name, kind: 'collection', depth: depth + 1, parent: label })
      collectionTargets(l.collection, depth + 2, name, push, covers)
    } else if (l.kind === 'graph' && l.graph) {
      const name = graphLabel(l.graph)
      push({ key: l.key, label: name, kind: 'graph', depth: depth + 1, parent: label })
      graphTargets(l.graph, depth + 2, name, push, covers)
    }
  }
}

export function commentTargets(items: PayloadItem[]): CommentTargets {
  const groups: TargetGroup[] = []
  const runs: CommentTargets['runs'] = {}
  const covers: Record<string, string[]> = {}
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const all: CommentTarget[] = []
    const push: Push = (t) => all.push(t)
    if (item.kind === 'bookmark') {
      push({ key: item.key, label: bookmarkLabel(item.bookmark), kind: 'bookmark', depth: 0 })
      // Adjacent loose bookmarks share one band on the page (see toBands); its links filter by all of them.
      if (items[i - 1]?.kind !== 'bookmark' && items[i + 1]?.kind === 'bookmark') {
        const keys: string[] = []
        for (let j = i; j < items.length && items[j].kind === 'bookmark'; j++) keys.push(items[j].key)
        runs[runKey(item.key)] = { label: 'Shared bookmarks', keys }
      }
    } else if (item.kind === 'collection') {
      const label = collectionLabel(item.collection)
      push({ key: item.key, label, kind: 'collection', depth: 0 })
      collectionTargets(item.collection, 1, label, push, covers)
    } else if (item.kind === 'note') {
      noteTargets(item.note, 0, undefined, push, covers)
    } else {
      const label = graphLabel(item.graph)
      push({ key: item.key, label, kind: 'graph', depth: 0 })
      graphTargets(item.graph, 1, label, push, covers)
    }
    groups.push({ item: all[0], nested: all.slice(1) })
  }
  return { groups, runs, covers }
}

/** The filter key for a band of adjacent bookmarks that starts at `firstKey`. */
export const runKey = (firstKey: string) => `run:${firstKey}`

/**
 * key -> label for every postable key, built once per targets object (it crosses from the server
 * as plain data, so the map is built lazily on first lookup).
 */
const labelMaps = new WeakMap<CommentTargets, Map<string, string>>()
function labelsOf(t: CommentTargets): Map<string, string> {
  let m = labelMaps.get(t)
  if (!m) {
    m = new Map([['', WHOLE_SHARE]])
    for (const g of t.groups) {
      if (!m.has(g.item.key)) m.set(g.item.key, g.item.label)
      for (const n of g.nested) if (!m.has(n.key)) m.set(n.key, n.label)
    }
    labelMaps.set(t, m)
  }
  return m
}

const runOf = (t: CommentTargets, key: string) => (Object.hasOwn(t.runs, key) ? t.runs[key] : undefined)

/** Label for a comment's key or a filter key; unknown keys read as "this share". */
export function targetLabel(t: CommentTargets, key: string): string {
  return runOf(t, key)?.label ?? labelsOf(t).get(key) ?? UNKNOWN_TARGET
}

/** Whether `key` is a real target (something the composer can post on). */
export function isTarget(t: CommentTargets, key: string): boolean {
  return labelsOf(t).has(key)
}

/**
 * Whether a comment on `itemKey` shows under `filter`: the key itself or anything nested in it
 * ("c:3" covers "c:3/b:12"; "g:1/n:a" covers "g:1/n:a/b:4"). A run covers each of its bookmarks,
 * and a sub-collection everything inside it ("c:3/c:7" covers "c:3/b:12" when 12 is filed there).
 * The whole share ("") covers only comments on the whole share.
 */
export function inScope(t: CommentTargets, filter: string, itemKey: string): boolean {
  const covers = runOf(t, filter)?.keys ?? (t.covers && Object.hasOwn(t.covers, filter) ? t.covers[filter] : [filter])
  return covers.some((k) => itemKey === k || (k !== '' && itemKey.startsWith(`${k}/`)))
}
