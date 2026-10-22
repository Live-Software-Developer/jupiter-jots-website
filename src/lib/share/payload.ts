import type { SharePayload } from './types'

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
  return { ...p, curator: p.curator ?? { name: '' }, items }
}

/** A public share's payload string, or null when it is not valid v1 JSON. */
export function parsePayload(json: string): SharePayload | null {
  try {
    return toPayload(JSON.parse(json))
  } catch {
    return null
  }
}
