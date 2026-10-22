import type { PBookmark, PCollection, PayloadItem } from './types'

/** Something a comment can be about: a payload key ("" is the whole share) and its label. */
export interface CommentTarget {
  key: string
  label: string
}

/** One top-level item and the keys nested inside it (a collection's bookmarks, a graph's nodes). */
export interface TargetGroup {
  item: CommentTarget
  nested: CommentTarget[]
}

/**
 * Every key a comment of this share can carry, with labels, built on the server from the
 * payload so only labels cross into the client. `runs` maps the filter key of a band of
 * adjacent bookmarks to the keys it holds.
 */
export interface CommentTargets {
  groups: TargetGroup[]
  runs: Record<string, { label: string; keys: string[] }>
}

export const WHOLE_SHARE = 'The whole share'
/** Label for a key the payload no longer has (the item was removed from a live share). */
export const UNKNOWN_TARGET = 'this share'

const bookmarkLabel = (b: PBookmark) => b.title || b.domain || 'Untitled bookmark'
const collectionLabel = (c: PCollection) => c.name || 'Untitled collection'

export function commentTargets(items: PayloadItem[]): CommentTargets {
  const groups: TargetGroup[] = []
  const runs: CommentTargets['runs'] = {}
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'bookmark') {
      groups.push({ item: { key: item.key, label: bookmarkLabel(item.bookmark) }, nested: [] })
      // Adjacent loose bookmarks share one band on the page (see toBands); its links filter by all of them.
      if (items[i - 1]?.kind !== 'bookmark' && items[i + 1]?.kind === 'bookmark') {
        const keys: string[] = []
        for (let j = i; j < items.length && items[j].kind === 'bookmark'; j++) keys.push(items[j].key)
        runs[runKey(item.key)] = { label: 'Shared bookmarks', keys }
      }
    } else if (item.kind === 'collection') {
      groups.push({
        item: { key: item.key, label: collectionLabel(item.collection) },
        nested: item.collection.bookmarks.map((b) => ({ key: b.key, label: bookmarkLabel(b) })),
      })
    } else {
      const nested: CommentTarget[] = []
      for (const n of item.graph.nodes) {
        if (n.ref.kind === 'bookmark') nested.push({ key: n.ref.bookmark.key, label: bookmarkLabel(n.ref.bookmark) })
        else {
          nested.push({ key: n.ref.key, label: collectionLabel(n.ref.collection) })
          for (const b of n.ref.collection.bookmarks) nested.push({ key: b.key, label: bookmarkLabel(b) })
        }
      }
      groups.push({ item: { key: item.key, label: item.graph.name || 'Untitled graph' }, nested })
    }
  }
  return { groups, runs }
}

/** The filter key for a band of adjacent bookmarks that starts at `firstKey`. */
export const runKey = (firstKey: string) => `run:${firstKey}`

/** Label for a comment's key or a filter key; unknown keys read as "this share". */
export function targetLabel(t: CommentTargets, key: string): string {
  if (key === '') return WHOLE_SHARE
  if (t.runs[key]) return t.runs[key].label
  for (const g of t.groups) {
    if (g.item.key === key) return g.item.label
    const hit = g.nested.find((n) => n.key === key)
    if (hit) return hit.label
  }
  return UNKNOWN_TARGET
}

/** Whether `key` is a real target (something the composer can post on). */
export function isTarget(t: CommentTargets, key: string): boolean {
  return key === '' || t.groups.some((g) => g.item.key === key || g.nested.some((n) => n.key === key))
}

/**
 * Whether a comment on `itemKey` shows under `filter`: the key itself or anything nested in it
 * ("c:3" covers "c:3/b:12"; "g:1/n:a" covers "g:1/n:a/b:4"). A run covers each of its bookmarks.
 * The whole share ("") covers only comments on the whole share.
 */
export function inScope(t: CommentTargets, filter: string, itemKey: string): boolean {
  const covers = t.runs[filter]?.keys ?? [filter]
  return covers.some((k) => itemKey === k || (k !== '' && itemKey.startsWith(`${k}/`)))
}
