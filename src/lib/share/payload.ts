import { httpsUrl } from './format'
import type { PBookmark, PCollection, PGraph, PGraphNode, PIcon, PNote, PNoteLink, PNoteLock, PSubCollection, PayloadItem, SharePayload } from './types'

/** The extension's collection glyphs (its `GLYPH_CHOICES`); any other glyph name is dropped. */
export const MARK_GLYPHS = [
  'folder', 'code', 'palette', 'book', 'utensils', 'plane', 'briefcase', 'gift', 'star', 'heart',
  'music', 'film', 'camera', 'cap', 'leaf', 'home', 'globe', 'bulb', 'bag', 'inbox',
] as const
export type MarkGlyph = (typeof MARK_GLYPHS)[number]

const isGlyph = (v: unknown): v is MarkGlyph => typeof v === 'string' && (MARK_GLYPHS as readonly string[]).includes(v)

/** A collection icon the page can show, or undefined for a missing or malformed one. */
export function toIcon(raw: unknown): PIcon | undefined {
  const i = raw as Record<string, unknown> | null
  if (!i || typeof i !== 'object') return undefined
  if (i.type === 'glyph') return isGlyph(i.value) ? { type: 'glyph', value: i.value } : undefined
  if (i.type === 'emoji') {
    const v = typeof i.value === 'string' ? i.value.trim() : ''
    return v && v.length <= 16 ? { type: 'emoji', value: v } : undefined
  }
  if (i.type === 'image') {
    const url = httpsUrl(i.url)
    return url ? { type: 'image', url } : undefined
  }
  return undefined
}

/** Longest note body the page renders; anything past it is cut. */
export const NOTE_MAX = 20_000

/**
 * A note the page can show, or null for a malformed one. `embed` false (a note inside a linked
 * collection or graph) keeps its collection and graph links as name-only chips, so embedding
 * stays one level deep whatever the payload says.
 */
export function toNote(raw: unknown, embed = true): PNote | null {
  const n = raw as Record<string, unknown> | null
  if (n && typeof n === 'object' && n.locked === true) return toLockedNote(n)
  if (!n || typeof n !== 'object' || typeof n.key !== 'string' || !n.key || typeof n.title !== 'string' || typeof n.body !== 'string') return null
  return {
    key: n.key,
    title: n.title,
    body: n.body.length > NOTE_MAX ? n.body.slice(0, NOTE_MAX) : n.body,
    tags: Array.isArray(n.tags) ? n.tags.filter((t): t is string => typeof t === 'string') : [],
    links: Array.isArray(n.links) ? n.links.map((l) => toNoteLink(l, embed)).filter((l) => l !== null) : undefined,
  }
}

const isCipher = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/**
 * A locked note (PLockedNote) as a PNote with `lock`: no body, tags or links until it is unlocked.
 * Null when the lock is malformed. Salt and iteration count are checked when it is unlocked.
 */
function toLockedNote(n: Record<string, unknown>): PNote | null {
  const l = n.lock as Record<string, unknown> | null
  if (typeof n.key !== 'string' || !n.key || !l || typeof l !== 'object' || l.v !== 1) return null
  if (typeof l.salt !== 'string' || typeof l.iters !== 'number' || !isCipher(l.body) || (l.title !== undefined && !isCipher(l.title))) return null
  const hidden = l.title !== undefined
  if (!hidden && typeof n.title !== 'string') return null
  const lock: PNoteLock = { v: 1, salt: l.salt, iters: l.iters, body: l.body, ...(hidden && { title: l.title as string }) }
  return { key: n.key, title: hidden ? '' : (n.title as string), body: '', tags: [], lock }
}

const isHue = (h: unknown): h is PCollection['hue'] => [1, 2, 3, 4, 5].includes(h as number)

/** A note's link the page can show, or null for a malformed one. Contents that fail the checks leave a name-only chip. */
function toNoteLink(raw: unknown, embed: boolean): PNoteLink | null {
  const l = raw as Record<string, unknown> | null
  if (!l || typeof l !== 'object') return null
  if (l.kind === 'bookmark') {
    const b = toBookmark(l.bookmark)
    return b ? { kind: 'bookmark', bookmark: b } : null
  }
  if (l.kind === 'collection' && typeof l.key === 'string' && typeof l.name === 'string' && isHue(l.hue)) {
    const c = embed ? toCollection(l.collection, 0, false) : null
    return { kind: 'collection', key: l.key, name: l.name, hue: l.hue, icon: toIcon(l.icon), ...(c && { collection: c }) }
  }
  if (l.kind === 'graph' && typeof l.key === 'string' && typeof l.name === 'string') {
    const g = embed ? toGraph(l.graph, false) : null
    return { kind: 'graph', key: l.key, name: l.name, ...(g && { graph: g }) }
  }
  return null
}

/** Deepest sub-collection level the page renders; anything below is dropped. */
export const COLLECTION_DEPTH = 8

// The optional fields are re-checked here so a bad one is dropped, never rendered.
const bookmark = (b: PBookmark): PBookmark => ({ ...b, favicon: httpsUrl(b.favicon), image: httpsUrl(b.image) })
function toBookmark(raw: unknown): PBookmark | null {
  const b = raw as Record<string, unknown> | null
  if (!b || typeof b !== 'object' || typeof b.key !== 'string' || typeof b.url !== 'string' || typeof b.title !== 'string') return null
  return bookmark(b as unknown as PBookmark)
}

/**
 * A collection with its sub-collections re-checked (malformed ones dropped, nothing below
 * `COLLECTION_DEPTH`), or null when it isn't a collection. `embed` is passed to its notes.
 */
function toCollection(raw: unknown, depth: number, embed: boolean): PCollection | null {
  const c = raw as Record<string, unknown> | null
  if (!c || typeof c !== 'object' || typeof c.name !== 'string' || !Array.isArray(c.bookmarks)) return null
  const subs =
    depth < COLLECTION_DEPTH && Array.isArray(c.collections)
      ? c.collections.flatMap((s): PSubCollection[] => {
          const sub = typeof s?.key === 'string' && s.key ? toCollection(s, depth + 1, embed) : null
          return sub ? [{ ...sub, key: s.key }] : []
        })
      : []
  return {
    name: c.name,
    note: typeof c.note === 'string' ? c.note : '',
    hue: isHue(c.hue) ? c.hue : 1,
    icon: toIcon(c.icon),
    bookmarks: c.bookmarks.map(toBookmark).filter((b) => b !== null),
    notes: Array.isArray(c.notes) ? c.notes.map((n) => toNote(n, embed)).filter((n) => n !== null) : undefined,
    ...(subs.length > 0 && { collections: subs }),
  }
}

/** A graph node with its ref re-checked, or null for a malformed one (the rest of the graph still renders). */
function node(n: PGraphNode, embed: boolean): PGraphNode | null {
  switch (n?.ref?.kind) {
    case 'collection': {
      const collection = toCollection(n.ref.collection, 0, embed)
      return collection && typeof n.ref.key === 'string' ? { ...n, ref: { ...n.ref, collection } } : null
    }
    case 'bookmark': {
      const b = toBookmark(n.ref.bookmark)
      return b ? { ...n, ref: { kind: 'bookmark', bookmark: b } } : null
    }
    case 'note': {
      const note = toNote(n.ref.note, embed)
      return note ? { ...n, ref: { kind: 'note', note } } : null
    }
    default:
      return null
  }
}

/** A graph with its nodes re-checked; a dropped node takes its arrows with it. Null when it isn't a graph. */
function toGraph(raw: unknown, embed: boolean): PGraph | null {
  const g = raw as PGraph | null
  if (!g || typeof g !== 'object' || ![g.nodes, g.steps, g.links].every(Array.isArray)) return null
  const nodes = g.nodes.map((n) => node(n, embed)).filter((n) => n !== null)
  const kept = new Set(nodes.map((n) => n.id))
  return { ...g, name: typeof g.name === 'string' ? g.name : '', nodes, links: g.links.filter((l) => kept.has(l?.from) && kept.has(l?.to)) }
}

/** Every bookmark in a collection, its sub-collections' included, in page order. */
export function allBookmarks(c: PCollection): PBookmark[] {
  return [...c.bookmarks, ...(c.collections ?? []).flatMap(allBookmarks)]
}

/** Every note in a collection, its sub-collections' included, in page order. */
export function allNotes(c: PCollection): PNote[] {
  return [...(c.notes ?? []), ...(c.collections ?? []).flatMap(allNotes)]
}

function clean(i: PayloadItem): PayloadItem | null {
  switch (i.kind) {
    case 'note': {
      const note = toNote(i.note)
      return note ? { ...i, note } : null
    }
    case 'bookmark':
      return { ...i, bookmark: bookmark(i.bookmark) }
    case 'collection': {
      const collection = toCollection(i.collection, 0, true)
      return collection ? { ...i, collection } : null
    }
    case 'graph': {
      const graph = toGraph(i.graph, true)
      return graph ? { ...i, graph } : null
    }
  }
}

/**
 * A share payload (parsed JSON: the public share's, or a private share's after decryption),
 * or null when it is not v1. Items of unknown kinds, and malformed notes and note nodes, are dropped.
 */
export function toPayload(raw: unknown): SharePayload | null {
  const p = raw as SharePayload | null
  if (!p || typeof p !== 'object' || p.v !== 1 || !Array.isArray(p.items)) return null
  const items = p.items.filter(
    (i) =>
      (i?.kind === 'bookmark' && i.bookmark) ||
      (i?.kind === 'collection' && Array.isArray(i.collection?.bookmarks)) ||
      (i?.kind === 'graph' && [i.graph?.nodes, i.graph?.steps, i.graph?.links].every(Array.isArray)) ||
      i?.kind === 'note',
  )
  return { ...p, curator: p.curator ?? { name: '' }, items: items.map(clean).filter((i) => i !== null) }
}

/** A public share's payload string, or null when it is not valid v1 JSON. */
export function parsePayload(json: string): SharePayload | null {
  try {
    return toPayload(JSON.parse(json))
  } catch {
    return null
  }
}
