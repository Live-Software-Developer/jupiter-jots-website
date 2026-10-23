import type { Visibility } from './types'

/**
 * The three visibilities as sent by the backend. Anything else (a future value, a broken row)
 * reads as `unlisted`: shown to whoever has the link, never listed or indexed.
 */
export function parseVisibility(v: unknown): Visibility {
  return v === 'public' || v === 'private' ? v : 'unlisted'
}

/**
 * A share page's robots rule. Only a `public` share (listed on /explore) may be indexed; its
 * links stay nofollow, since whoever made the share chose them and the page should not vouch
 * for them. Unlisted and private shares are `noindex`.
 */
export function shareRobots(v: Visibility): { index: boolean; follow: boolean } {
  return { index: v === 'public', follow: false }
}
