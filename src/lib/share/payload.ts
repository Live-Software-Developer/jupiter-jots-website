import { httpsUrl } from './format'
import type { PBookmark, PCollection, PIcon, PNote, PNoteLink, PayloadItem, SharePayload } from './types'

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

/** A note the page can show, or null for a malformed one. */
export function toNote(raw: unknown): PNote | null {
  const n = raw as Record<string, unknown> | null
  if (!n || typeof n !== 'object' || typeof n.key !== 'string' || !n.key || typeof n.title !== 'string' || typeof n.body !== 'string') return null
  return {
    key: n.key,
    title: n.title,
    body: n.body.length > NOTE_MAX ? n.body.slice(0, NOTE_MAX) : n.body,
    tags: Array.isArray(n.tags) ? n.tags.filter((t): t is string => typeof t === 'string') : [],
    links: Array.isArray(n.links) ? n.links.map(toNoteLink).filter((l) => l !== null) : undefined,
  }
}

/** A note's link the page can show, or null for a malformed one. */
function toNoteLink(raw: unknown): PNoteLink | null {
  const l = raw as Record<string, unknown> | null
  if (!l || typeof l !== 'object') return null
  if (l.kind === 'bookmark') {
    const b = l.bookmark as Record<string, unknown> | null
    if (!b || typeof b.key !== 'string' || typeof b.url !== 'string' || typeof b.title !== 'string') return null
    return { kind: 'bookmark', bookmark: bookmark(b as unknown as PBookmark) }
  }
  if (l.kind === 'collection' && typeof l.key === 'string' && typeof l.name === 'string' && [1, 2, 3, 4, 5].includes(l.hue as number)) {
    return { kind: 'collection', key: l.key, name: l.name, hue: l.hue as PCollection['hue'], icon: toIcon(l.icon) }
  }
  return null
}

// The optional fields are re-checked here so a bad one is dropped, never rendered.
const bookmark = (b: PBookmark): PBookmark => ({ ...b, favicon: httpsUrl(b.favicon), image: httpsUrl(b.image) })
const collection = (c: PCollection): PCollection => ({
  ...c,
  icon: toIcon(c.icon),
  bookmarks: Array.isArray(c.bookmarks) ? c.bookmarks.map(bookmark) : [],
  notes: Array.isArray(c.notes) ? c.notes.map(toNote).filter((n) => n !== null) : undefined,
})

function clean(i: PayloadItem): PayloadItem | null {
  switch (i.kind) {
    case 'note': {
      const note = toNote(i.note)
      return note ? { ...i, note } : null
    }
    case 'bookmark':
      return { ...i, bookmark: bookmark(i.bookmark) }
    case 'collection':
      return { ...i, collection: collection(i.collection) }
    case 'graph':
      return {
        ...i,
        graph: {
          ...i.graph,
          nodes: i.graph.nodes.map((n) => ({
            ...n,
            ref:
              n.ref?.kind === 'collection'
                ? { ...n.ref, collection: collection(n.ref.collection) }
                : n.ref?.kind === 'bookmark'
                  ? { ...n.ref, bookmark: bookmark(n.ref.bookmark) }
                  : n.ref,
          })),
        },
      }
  }
}

/**
 * A share payload (parsed JSON: the public share's, or a private share's after decryption),
 * or null when it is not v1. Items of unknown kinds, and malformed notes, are dropped.
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
