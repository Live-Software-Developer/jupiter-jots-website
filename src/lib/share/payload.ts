import { httpsUrl } from './format'
import type { PBookmark, PCollection, PIcon, PayloadItem, SharePayload } from './types'

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

// The optional fields are re-checked here so a bad one is dropped, never rendered.
const bookmark = (b: PBookmark): PBookmark => ({ ...b, favicon: httpsUrl(b.favicon), image: httpsUrl(b.image) })
const collection = (c: PCollection): PCollection => ({ ...c, icon: toIcon(c.icon), bookmarks: Array.isArray(c.bookmarks) ? c.bookmarks.map(bookmark) : [] })

function clean(i: PayloadItem): PayloadItem {
  switch (i.kind) {
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
 * or null when it is not v1. Items of unknown kinds are dropped.
 */
export function toPayload(raw: unknown): SharePayload | null {
  const p = raw as SharePayload | null
  if (!p || typeof p !== 'object' || p.v !== 1 || !Array.isArray(p.items)) return null
  const items = p.items.filter(
    (i) =>
      (i?.kind === 'bookmark' && i.bookmark) ||
      (i?.kind === 'collection' && Array.isArray(i.collection?.bookmarks)) ||
      (i?.kind === 'graph' && [i.graph?.nodes, i.graph?.steps, i.graph?.links].every(Array.isArray)),
  )
  return { ...p, curator: p.curator ?? { name: '' }, items: items.map(clean) }
}

/** A public share's payload string, or null when it is not valid v1 JSON. */
export function parsePayload(json: string): SharePayload | null {
  try {
    return toPayload(JSON.parse(json))
  } catch {
    return null
  }
}
