"use client"

import Link from "next/link"
import { createContext, useCallback, useContext, useId, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react"

import { btnPrimary, btnSecondary, FOCUS_FLAT } from "@/components/site/styles"
import { collectionCounts, type SheetEntry } from "@/lib/share/collections"
import { anchorFor, plural } from "@/lib/share/format"
import { MARKDOWN_CLASS, renderMarkdown } from "@/lib/share/markdown"
import type { MarkGlyph } from "@/lib/share/payload"
import { allBookmarks, allNotes } from "@/lib/share/payload"
import type { PBookmark, PCollection, PIcon, PNote, PSubCollection } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { BookmarkRow, HUE_TINT } from "./BookmarkRow"
import { CopyLinkButton } from "./CopyLinkButton"
import { GLYPH, ico, MARK_GLYPH } from "./icons"
import { Modal } from "./Modal"
import { NoteRow } from "./NoteRow"
import { SafeImg } from "./SafeImg"

/** `trigger` is the element focus returns to when the sheet closes (the clicked button). */
export const CollectionSheetContext = createContext<{ open(key: string, trigger?: HTMLElement | null): void }>({ open: () => {} })

export const useCollectionSheet = () => useContext(CollectionSheetContext)

/**
 * Renders the comments on one collection inside its sheet, after the rows. It is called with the
 * sheet's key ("c:3" or "g:1/n:abc"); comments on the collection's bookmarks are nested under it
 * ("…/b:12"). The Discussion provides it; with no provider the sheet shows no comments.
 */
export const CollectionCommentsSlot = createContext<((itemKey: string, options?: { tabbed?: boolean }) => ReactNode) | null>(null)

/**
 * Holds the open sheet for the page; anything below can `open(key, trigger)` a collection.
 * `collections` is `sheetEntries(payload.items)`, computed on the server so only the collections
 * cross into the client bundle.
 */
export function CollectionSheetProvider({ collections, curator, children }: { collections: SheetEntry[]; curator?: string; children: ReactNode }) {
  const entries = useMemo(() => new Map(collections.map((e) => [e.key, e])), [collections])
  // A sheet can open another (a note's linked collection), so they stack; each remembers its trigger.
  const [stack, setStack] = useState<SheetEntry[]>([])
  const triggers = useRef(new Map<string, HTMLElement | null>())

  const open = useCallback(
    (key: string, from?: HTMLElement | null) => {
      const entry = entries.get(key)
      if (!entry) return
      triggers.current.set(key, from ?? null)
      setStack((s) => (s.some((e) => e.key === key) ? s : [...s, entry]))
    },
    [entries],
  )
  // Runs after the native close, so the page (or the sheet below) is no longer inert and the trigger can take focus.
  const close = useCallback((key: string) => {
    const el = triggers.current.get(key)
    triggers.current.delete(key)
    setStack((s) => s.filter((e) => e.key !== key))
    if (el?.isConnected) el.focus()
  }, [])
  const value = useMemo(() => ({ open }), [open])

  return (
    <CollectionSheetContext.Provider value={value}>
      {children}
      {stack.map((entry) => (
        <CollectionSheet key={entry.key} entry={entry} curator={curator} onClose={() => close(entry.key)} />
      ))}
    </CollectionSheetContext.Provider>
  )
}

/** A button anywhere on the page that opens a collection's sheet. */
export function OpenCollectionButton({ itemKey, className, children }: { itemKey: string; className: string; children: ReactNode }) {
  const { open } = useCollectionSheet()
  return (
    <button type="button" onClick={(e: MouseEvent<HTMLButtonElement>) => open(itemKey, e.currentTarget)} className={className} aria-haspopup="dialog">
      {children}
    </button>
  )
}

export const collectionTint = (hue: number) => HUE_TINT[(((Math.trunc(hue) || 1) - 1) % 5 + 5) % 5]

/**
 * A collection's tile, as in the extension: its glyph or emoji on its hue, or its logo on a plain
 * card. No icon, or a logo that fails, shows the folder glyph on the hue. `className` sizes the
 * tile, `glyph` the glyph and `emoji` the emoji's type; `px` is the tile's size.
 */
export function CollectionMark({
  icon,
  hue,
  px,
  className,
  glyph,
  emoji,
}: {
  icon?: PIcon
  hue: number
  px: number
  className: string
  glyph: string
  emoji: string
}) {
  const tile = (content: ReactNode) => (
    <span className={cn("grid shrink-0 place-items-center", collectionTint(hue), className)} aria-hidden="true">
      {content}
    </span>
  )
  const folder = tile(ico(MARK_GLYPH.folder, glyph, 1.8))
  switch (icon?.type) {
    case "image":
      return <SafeImg src={icon.url} width={px} height={px} className={cn("shrink-0 border border-border bg-card object-cover", className)} fallback={folder} />
    case "emoji":
      return tile(<span className={cn("leading-none", emoji)}>{icon.value}</span>)
    case "glyph":
      return tile(ico(MARK_GLYPH[icon.value as MarkGlyph] ?? MARK_GLYPH.folder, glyph, 1.8))
    default:
      return folder
  }
}

function matches(b: PBookmark, q: string): boolean {
  return [b.title, b.domain, b.note, ...b.tags].some((s) => s.toLowerCase().includes(q))
}

const noteMatches = (n: PNote, q: string) => [n.title, n.body, ...n.tags].some((s) => s.toLowerCase().includes(q))

/**
 * What of a collection the filter `q` keeps, at every level: matching notes and bookmarks, and
 * the sub-collections with a match inside (a sub-collection whose name matches keeps everything).
 * Null when nothing inside matches.
 */
function filterCollection<C extends PCollection>(c: C, q: string): C | null {
  if (!q) return c
  const collections = (c.collections ?? []).flatMap((s) => {
    const kept = s.name.toLowerCase().includes(q) ? s : filterCollection(s, q)
    return kept ? [kept] : []
  })
  const notes = (c.notes ?? []).filter((n) => noteMatches(n, q))
  const bookmarks = c.bookmarks.filter((b) => matches(b, q))
  return collections.length + notes.length + bookmarks.length ? { ...c, collections, notes, bookmarks } : null
}

const countOf = (c: PCollection) => allNotes(c).length + allBookmarks(c).length

/** A collection's contents in its sheet: sub-collections (nested sections), then its notes and bookmarks. */
function CollectionRows({ collection: c, depth, filtering }: { collection: PCollection; depth: number; filtering: boolean }) {
  return (
    <>
      {(c.collections ?? []).map((s) => (
        <SubCollection key={s.key} sub={s} depth={depth} filtering={filtering} />
      ))}
      {(c.notes ?? []).map((n, i) => (
        <NoteRow key={n.key || i} note={n} />
      ))}
      {c.bookmarks.map((b, i) => (
        <BookmarkRow key={b.key || i} bookmark={b} />
      ))}
    </>
  )
}

/**
 * A sub-collection as a collapsible section: its mark, name and count, then its contents indented
 * under a rule. The first level starts open, deeper ones closed; a filter opens every level.
 */
function SubCollection({ sub, depth, filtering }: { sub: PSubCollection; depth: number; filtering: boolean }) {
  const [open, setOpen] = useState(depth === 0)
  const id = useId()
  const shown = open || filtering
  const count = countOf(sub)
  return (
    <section data-sub-collection aria-label={sub.name}>
      <button
        type="button"
        aria-expanded={shown}
        aria-controls={id}
        disabled={filtering}
        onClick={() => setOpen((o) => !o)}
        className={cn("flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-accent/40 disabled:cursor-default sm:px-5", FOCUS_FLAT)}
      >
        {ico(GLYPH.chevronRight, cn("size-4 shrink-0 text-muted-foreground transition-transform", shown && "rotate-90"))}
        <CollectionMark icon={sub.icon} hue={sub.hue} px={28} className="size-7 rounded-lg" glyph="size-3.5" emoji="text-base" />
        <span className="min-w-0 flex-1 truncate text-sm font-medium" title={sub.name}>
          {sub.name || "Untitled collection"}
        </span>
        <span className="shrink-0 rounded-full bg-muted px-2 text-xs tabular-nums text-muted-foreground">{count}</span>
      </button>
      {shown ? (
        <div id={id} className={cn("divide-y divide-border border-l-2 border-border", depth < 3 ? "ml-6 sm:ml-8" : "ml-2")}>
          {sub.note ? (
            <div className={cn(MARKDOWN_CLASS, "space-y-2 px-4 py-3 text-sm leading-relaxed text-pretty break-words text-muted-foreground sm:px-5")}>{renderMarkdown(sub.note)}</div>
          ) : null}
          {count || sub.collections?.length ? (
            <CollectionRows collection={sub} depth={depth + 1} filtering={filtering} />
          ) : (
            <p className="px-4 py-3 text-sm text-muted-foreground sm:px-5">Empty.</p>
          )}
        </div>
      ) : null}
    </section>
  )
}

/**
 * A collection opened in place (design: collection-sheet), in the shared `Sheet`: its note,
 * a filter across every level, then its sub-collections and its own notes and bookmarks.
 */
function CollectionSheet({ entry, curator, onClose }: { entry: SheetEntry; curator?: string; onClose(): void }) {
  const { collection: c } = entry
  const [query, setQuery] = useState("")

  const q = query.trim().toLowerCase()
  const shown = filterCollection(c, q)
  const total = countOf(c)
  const hasAny = total > 0 || !!c.collections?.length
  const context = entry.graph ? `in ${entry.graph}` : entry.note ? `linked from ${entry.note}` : curator ? `from ${curator}` : ""

  return (
    <Sheet
      itemKey={entry.key}
      onClose={onClose}
      mark={<CollectionMark icon={c.icon} hue={c.hue} px={44} className="size-11 rounded-xl" glyph="size-5" emoji="text-2xl" />}
      kind="Collection"
      title={c.name}
      meta={`${collectionCounts(c)}${context ? ` · ${context}` : ""}`}
      commentsTab
    >
      {c.note ? (
        <div className={cn(MARKDOWN_CLASS, "space-y-2 px-4 pt-4 text-sm leading-relaxed text-pretty break-words text-muted-foreground sm:px-5")}>{renderMarkdown(c.note)}</div>
      ) : null}
      {hasAny ? (
        <>
          <label className="mx-4 mt-4 flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-ring sm:mx-5">
            {ico(GLYPH.search)}
            <span className="sr-only">Filter this collection</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter this collection"
              className="min-w-0 flex-1 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </label>
          <p className="sr-only" aria-live="polite">
            {q ? `${shown ? countOf(shown) : 0} of ${plural(total, "item")} shown` : ""}
          </p>
          {shown ? (
            <div className="mt-2 divide-y divide-border">
              <CollectionRows collection={shown} depth={0} filtering={!!q} />
            </div>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">Nothing matches “{query.trim()}”.</p>
          )}
        </>
      ) : (
        <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">This collection is empty.</p>
      )}
    </Sheet>
  )
}

const TOP_KIND: Record<string, string> = { g: "graph", c: "collection", n: "note", b: "bookmark" }

/**
 * The sheet chrome (design: collection-sheet): a native modal dialog that is a right-hand sheet
 * from `sm` up and a bottom sheet on phones, with the item's comments after `children` and a
 * copy-link footer. Esc, the close button and the backdrop close it; `onClose` runs after.
 */
export function Sheet({
  itemKey,
  onClose,
  mark,
  kind,
  title,
  meta,
  wide = false,
  commentsTab = false,
  children,
}: {
  itemKey: string
  onClose(): void
  mark: ReactNode
  kind: string
  title: ReactNode
  meta: string
  /** Covers the whole viewport (a graph), instead of a side or bottom sheet. */
  wide?: boolean
  /** Give comments their own tab instead of appending them after long content. */
  commentsTab?: boolean
  children: ReactNode
}) {
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const renderComments = useContext(CollectionCommentsSlot)
  const [tab, setTab] = useState<'content' | 'comments'>('content')
  const tabbed = commentsTab && !!renderComments
  const dismiss = () => dialog.current?.close()

  return (
    <Modal dialogRef={dialog} initialFocus={closeBtn} onClose={onClose} aria-labelledby={titleId} className="text-popover-foreground">
      <div data-sheet-backdrop className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={dismiss} aria-hidden="true" />
      <div
        data-sheet={wide ? "wide" : "side"}
        className={cn(
          "absolute flex flex-col bg-popover text-popover-foreground shadow-2xl",
          wide
            ? "inset-0"
            : "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-3xl border-t border-border sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-full sm:max-w-lg sm:rounded-none sm:border-t-0 sm:border-l",
        )}
      >
        {wide ? null : <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden="true" />}
        <div className="flex shrink-0 items-start gap-3 border-b border-border px-4 pt-3 pb-4 sm:px-5 sm:pt-5">
          {mark}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{kind}</p>
            <h2 id={titleId} className="mt-0.5 font-serif text-2xl leading-tight break-words text-balance">
              {title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">{meta}</p>
          </div>
          <button
            ref={closeBtn}
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              FOCUS_FLAT,
            )}
          >
            {ico(GLYPH.close, "size-5")}
          </button>
        </div>
        {tabbed ? (
          <div role="tablist" aria-label="Sheet sections" className="flex shrink-0 gap-1 border-b border-border px-3 sm:px-4">
            {(['content', 'comments'] as const).map((id) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  "h-10 border-b-2 px-2.5 text-sm font-medium transition-colors",
                  tab === id ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
                  FOCUS_FLAT,
                )}
              >
                {id === "content" ? "Content" : "Comments"}
              </button>
            ))}
          </div>
        ) : null}
        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]"
          role={tabbed ? "tabpanel" : undefined}
        >
          {tabbed && tab === "comments" ? (
            renderComments(itemKey, { tabbed: true })
          ) : (
            <>
              {children}
              {renderComments && !tabbed ? renderComments(itemKey) : null}
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <Link href="/#get" className={cn(btnPrimary("md"), "flex-1 sm:flex-none")}>
            Get Jupiter Jots
          </Link>
          {/* A nested sheet (a graph node, a note's link) does not open from a link; its anchor is the top item's. */}
          <CopyLinkButton
            hash={anchorFor(itemKey)}
            label={itemKey.includes("/") ? `Copy link to ${TOP_KIND[itemKey[0]] ?? "share"}` : "Copy link"}
            className={cn(btnSecondary("md"), "px-4")}
          />
        </div>
      </div>
    </Modal>
  )
}
