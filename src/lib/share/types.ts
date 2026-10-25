export interface SharePayload {
  v: 1
  title: string
  intro: string
  curator: { name: string }
  items: PayloadItem[]
}
export type PayloadItem =
  | { key: string; kind: 'bookmark'; bookmark: PBookmark }
  | { key: string; kind: 'collection'; collection: PCollection }
  | { key: string; kind: 'graph'; graph: PGraph }
  | { key: string; kind: 'note'; note: PNote }
export interface PBookmark {
  key: string
  url: string
  title: string
  domain: string
  note: string
  tags: string[]
  read: boolean
  /** The site's icon, `https:` only. Optional: older payloads have none. */
  favicon?: string
  /** The page's preview (og:image), `https:` only. */
  image?: string
}
/** A note: `body` is markdown, rendered with the restricted subset in `markdown.tsx`. */
export interface PNote {
  key: string
  title: string
  body: string
  tags: string[]
  /** What the note is about: linked bookmarks in full, linked collections and graphs in full one level deep. */
  links?: PNoteLink[]
  /**
   * A password-locked note (the curator turned on "Include locked notes"): `body` is '' and there
   * are no tags or links until the viewer unlocks it with the note's own password, in the browser
   * only (`LockedNote.tsx`). `title` is '' when the curator hid it too.
   */
  lock?: PNoteLock
}
/**
 * A locked note as the payload carries it (the extension's PLockedNote): the stored lock copied as
 * it is. `toNote` turns it into a PNote with `lock`.
 */
export interface PLockedNote {
  key: string
  locked: true
  /** The visible title, or null when it is hidden (then `lock.title` holds it encrypted). */
  title: string | null
  lock: PNoteLock
}
/** PBKDF2-SHA256 (`iters`, base64 `salt`) -> AES-GCM-256; `body` and `title` are each base64(iv ‖ cipher) of a JSON string. */
export interface PNoteLock {
  v: 1
  salt: string
  iters: number
  body: string
  title?: string
}
/**
 * A linked collection or graph carries its contents (`collection` / `graph`, keys under
 * `<noteKey>/c:<id>` and `<noteKey>/g:<id>`), one level deep: the notes inside it link by name
 * only, so a share can't nest itself. Without them (older payloads, the inner level) it is a chip.
 */
export type PNoteLink =
  | { kind: 'bookmark'; bookmark: PBookmark }
  | { kind: 'collection'; key: string; name: string; hue: 1 | 2 | 3 | 4 | 5; icon?: PIcon; collection?: PCollection }
  | { kind: 'graph'; key: string; name: string; graph?: PGraph }
/** A collection's icon. A glyph is a name from the extension's glyph set (`MARK_GLYPHS`). */
export type PIcon = { type: 'glyph'; value: string } | { type: 'emoji'; value: string } | { type: 'image'; url: string }
export interface PCollection {
  name: string
  note: string
  hue: 1 | 2 | 3 | 4 | 5
  /** Optional: with none, the hue tile shows the folder glyph. */
  icon?: PIcon
  /** Its direct bookmarks (older payloads: every bookmark nested inside too). Use `allBookmarks` for totals. */
  bookmarks: PBookmark[]
  /** Listed before the bookmarks; keys 'c:<id>/n:<id>'. Optional: older payloads have none. */
  notes?: PNote[]
  /**
   * Sub-collections in the curator's order, each with only its direct items. Optional: older
   * payloads flattened them into `bookmarks` and `notes`. Bookmarks and notes at any depth keep
   * the top item's prefix ('c:3/b:12'); a sub-collection is 'c:3/c:7'.
   */
  collections?: PSubCollection[]
}
export type PSubCollection = PCollection & { key: string }
export interface PGraphNode {
  id: string
  stepId: string | null
  x: number
  y: number
  ref:
    | { kind: 'bookmark'; bookmark: PBookmark }
    | { kind: 'collection'; key: string; collection: PCollection }
    | { kind: 'note'; note: PNote }
}
export interface PGraph {
  name: string
  description: string
  mode: 'board' | 'canvas'
  steps: { id: string; label: string }[]
  nodes: PGraphNode[]
  links: { from: string; to: string }[]
}

/**
 * `unlisted`: anyone with the link, not listed, not indexed. `public`: also listed on /explore
 * and indexable. `private`: password-protected, end-to-end encrypted. Shares made before
 * board #880 were stored `public` and migrated to `unlisted`; `public` is still a valid value.
 */
export type Visibility = 'unlisted' | 'public' | 'private'
export type CommentMode = 'open' | 'held' | 'off'

export interface PublicShare {
  slug: string
  visibility: Visibility
  title: string
  curator_name: string
  summary: string
  /** JSON string for unlisted and public shares, cipher for private ones. */
  payload: string
  salt: string
  kdf_iters: number
  comment_mode: CommentMode
  locked: boolean
  /** The curator keeps this share's content in sync; the page follows `share_updated` events. */
  live?: boolean
  created_at: string
  updated_at: string
  expires_at: string | null
  comment_count: number
}

export interface PublicComment {
  id: number
  parent_id: number | null
  item_key: string
  author_name: string
  body: string
  status: 'visible' | 'held' | 'hidden'
  pinned: boolean
  votes: number
  /** Written by the share's owner from the extension (a "Curator" badge). */
  is_curator?: boolean
  created_at: string
  mine: boolean
  /** Whether this visitor marked it helpful; sent when the request carries a visitor key. */
  voted?: boolean
}
export interface HiddenComment {
  id: number
  parent_id: number | null
  hidden: true
}
export interface CommentList {
  comments: (PublicComment | HiddenComment)[]
  count: number
}
export interface NewComment {
  author_name: string
  body: string
  item_key: string
  parent_id?: number
}

/** `GET /api/sharing/s/{slug}/card`: what a share-link embed in a comment shows. */
export type ShareCard =
  | { status: 'ok'; visibility: 'unlisted' | 'public'; title: string; curator_name: string; summary: string; updated_at: string | null }
  | { status: 'ok'; visibility: 'private'; title: string; curator_name: string }
  | { status: 'gone' | 'removed' }

/** One card on /explore: never the payload or anything about the owner. */
export interface ExploreItem {
  slug: string
  title: string
  curator_name: string
  summary: string
  updated_at: string
}
/** `GET /api/sharing/explore`: 20 per page; pass `next_cursor` back for the next one. */
export interface ExplorePage {
  results: ExploreItem[]
  next_cursor: string | null
}
/** `down`: no backend configured or unreachable; `error`: it answered with a failure. */
export type ExploreResult = { status: 'ok'; page: ExplorePage } | { status: 'down' | 'error' }

export type ShareResult =
  | { status: 'ok'; share: PublicShare }
  | { status: 'missing' | 'gone' | 'removed' | 'error' }

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; fields?: Record<string, string[]> }
