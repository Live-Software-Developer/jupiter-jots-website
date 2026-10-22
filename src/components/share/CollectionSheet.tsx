"use client"

import Link from "next/link"
import { createContext, useCallback, useContext, useId, useMemo, useRef, useState, type MouseEvent, type ReactNode } from "react"

import { btnPrimary, btnSecondary, FOCUS_FLAT } from "@/components/site/styles"
import type { SheetEntry } from "@/lib/share/collections"
import { anchorFor, plural } from "@/lib/share/format"
import type { PBookmark } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { BookmarkRow, HUE_TINT } from "./BookmarkRow"
import { CopyLinkButton } from "./CopyLinkButton"
import { GLYPH, ico } from "./icons"
import { Modal } from "./Modal"

/** `trigger` is the element focus returns to when the sheet closes (the clicked button). */
export const CollectionSheetContext = createContext<{ open(key: string, trigger?: HTMLElement | null): void }>({ open: () => {} })

export const useCollectionSheet = () => useContext(CollectionSheetContext)

/**
 * Renders the comments on one collection inside its sheet, after the rows. It is called with the
 * sheet's key ("c:3" or "g:1/n:abc"); comments on the collection's bookmarks are nested under it
 * ("…/b:12"). The Discussion provides it; with no provider the sheet shows no comments.
 */
export const CollectionCommentsSlot = createContext<((itemKey: string) => ReactNode) | null>(null)

/**
 * Holds the open sheet for the page; anything below can `open(key, trigger)` a collection.
 * `collections` is `sheetEntries(payload.items)`, computed on the server so only the collections
 * cross into the client bundle.
 */
export function CollectionSheetProvider({ collections, curator, children }: { collections: SheetEntry[]; curator?: string; children: ReactNode }) {
  const entries = useMemo(() => new Map(collections.map((e) => [e.key, e])), [collections])
  const [current, setCurrent] = useState<SheetEntry | null>(null)
  const trigger = useRef<HTMLElement | null>(null)

  const open = useCallback(
    (key: string, from?: HTMLElement | null) => {
      const entry = entries.get(key)
      if (!entry) return
      trigger.current = from ?? null
      setCurrent(entry)
    },
    [entries],
  )
  // Runs after the native close, so the page is no longer inert and the trigger can take focus.
  const close = useCallback(() => {
    const el = trigger.current
    trigger.current = null
    setCurrent(null)
    if (el?.isConnected) el.focus()
  }, [])
  const value = useMemo(() => ({ open }), [open])

  return (
    <CollectionSheetContext.Provider value={value}>
      {children}
      {current ? <CollectionSheet key={current.key} entry={current} curator={curator} onClose={close} /> : null}
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

function matches(b: PBookmark, q: string): boolean {
  return [b.title, b.domain, b.note, ...b.tags].some((s) => s.toLowerCase().includes(q))
}

/**
 * A collection opened in place (design: collection-sheet): a native modal dialog that is a
 * right-hand sheet from `sm` up and a bottom sheet on phones. Esc, the close button and the
 * backdrop close it; the provider then returns focus to the trigger.
 */
function CollectionSheet({ entry, curator, onClose }: { entry: SheetEntry; curator?: string; onClose(): void }) {
  const { collection: c } = entry
  const titleId = useId()
  const dialog = useRef<HTMLDialogElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState("")
  const renderComments = useContext(CollectionCommentsSlot)

  const q = query.trim().toLowerCase()
  const rows = q ? c.bookmarks.filter((b) => matches(b, q)) : c.bookmarks
  const context = entry.graph ? `in ${entry.graph}` : curator ? `from ${curator}` : ""
  const dismiss = () => dialog.current?.close()

  return (
    <Modal dialogRef={dialog} initialFocus={closeBtn} onClose={onClose} aria-labelledby={titleId} className="text-popover-foreground">
      <div data-sheet-backdrop className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={dismiss} aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-border bg-popover text-popover-foreground shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-full sm:max-w-lg sm:rounded-none sm:border-t-0 sm:border-l">
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden="true" />
        <div className="flex shrink-0 items-start gap-3 border-b border-border px-4 pt-3 pb-4 sm:px-5 sm:pt-5">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", collectionTint(c.hue))} aria-hidden="true">
            {ico(GLYPH.folder, "size-5")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">Collection</p>
            <h2 id={titleId} className="mt-0.5 font-serif text-2xl leading-tight break-words text-balance">
              {c.name}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {plural(c.bookmarks.length, "bookmark")}
              {context ? ` · ${context}` : ""}
            </p>
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
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
          {c.note ? <p className="px-4 pt-4 text-sm leading-relaxed text-pretty text-muted-foreground sm:px-5">{c.note}</p> : null}
          {c.bookmarks.length ? (
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
                {q ? `${rows.length} of ${plural(c.bookmarks.length, "bookmark")} shown` : ""}
              </p>
              {rows.length ? (
                <div className="mt-2 divide-y divide-border">
                  {rows.map((b, i) => (
                    <BookmarkRow key={b.key || i} bookmark={b} />
                  ))}
                </div>
              ) : (
                <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">No bookmarks match “{query.trim()}”.</p>
              )}
            </>
          ) : (
            <p className="px-4 py-6 text-sm text-muted-foreground sm:px-5">This collection is empty.</p>
          )}
          {renderComments ? renderComments(entry.key) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5">
          <Link href="/#get" className={cn(btnPrimary("md"), "flex-1 sm:flex-none")}>
            Get Jupiter Jots
          </Link>
          <CopyLinkButton hash={anchorFor(entry.key)} className={cn(btnSecondary("md"), "px-4")} />
        </div>
      </div>
    </Modal>
  )
}
