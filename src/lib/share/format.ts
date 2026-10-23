const DATE = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

/** "18 Oct 2026"; UTC so server and client agree. Empty for a missing or bad date. */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : DATE.format(d)
}

/** Up to two initials for an avatar: "Ada Okafor" -> "AO". */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '?'
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

/** Only http(s) links leave the page; anything else (javascript:, data:, garbage) is not linked. */
export function safeUrl(url: string): string | null {
  return /^https?:\/\//i.test(url.trim()) ? url.trim() : null
}

/** An image address the page may load: an `https:` URL of at most 2048 characters, else undefined. */
export function httpsUrl(url: unknown): string | undefined {
  if (typeof url !== 'string' || url.length > 2048) return undefined
  try {
    return new URL(url).protocol === 'https:' ? url : undefined
  } catch {
    return undefined
  }
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

/** Anchor id for a payload item's band, from its key; nested keys resolve to their top item ("g:1/n:a" -> "item-g-1"). */
export const anchorFor = (key: string) => `item-${key.split('/')[0].replace(/[^a-z0-9]+/gi, '-')}`
