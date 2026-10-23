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
/** A collection's icon. A glyph is a name from the extension's glyph set (`MARK_GLYPHS`). */
export type PIcon = { type: 'glyph'; value: string } | { type: 'emoji'; value: string } | { type: 'image'; url: string }
export interface PCollection {
  name: string
  note: string
  hue: 1 | 2 | 3 | 4 | 5
  /** Optional: with none, the hue tile shows the folder glyph. */
  icon?: PIcon
  bookmarks: PBookmark[]
}
export interface PGraphNode {
  id: string
  stepId: string | null
  x: number
  y: number
  ref:
    | { kind: 'bookmark'; bookmark: PBookmark }
    | { kind: 'collection'; key: string; collection: PCollection }
}
export interface PGraph {
  name: string
  description: string
  mode: 'board' | 'canvas'
  steps: { id: string; label: string }[]
  nodes: PGraphNode[]
  links: { from: string; to: string }[]
}

export type Visibility = 'public' | 'private'
export type CommentMode = 'open' | 'held' | 'off'

export interface PublicShare {
  slug: string
  visibility: Visibility
  title: string
  curator_name: string
  summary: string
  /** JSON string for public shares, cipher for private ones. */
  payload: string
  salt: string
  kdf_iters: number
  comment_mode: CommentMode
  locked: boolean
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

export type ShareResult =
  | { status: 'ok'; share: PublicShare }
  | { status: 'missing' | 'gone' | 'error' }

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; fields?: Record<string, string[]> }
