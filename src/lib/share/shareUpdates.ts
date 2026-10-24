/**
 * The `updated_at` from a `share_updated` event when it is newer than the page's
 * copy, otherwise null. View counts also write the share row, so an event can
 * carry the timestamp the page already has; that must not trigger a refresh.
 */
export function newerShareUpdate(data: unknown, current: string): string | null {
  if (!data || typeof data !== "object" || Array.isArray(data)) return null
  const at = (data as { updated_at?: unknown }).updated_at
  if (typeof at !== "string") return null
  // A view re-sends exactly the timestamp the page already has.
  if (at === current) return null
  const next = Date.parse(at)
  if (Number.isNaN(next)) return null
  const seen = Date.parse(current)
  if (!Number.isNaN(seen) && next < seen) return null
  // JS dates stop at milliseconds while chrono keeps microseconds, so a different string in
  // the same millisecond is a newer write, not a duplicate.
  return at
}
