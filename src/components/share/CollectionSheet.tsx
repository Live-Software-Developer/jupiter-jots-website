"use client"

import Link from "next/link"
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"

import { btnPrimary, btnSecondary, FOCUS_FLAT } from "@/components/site/styles"
import { anchorFor, plural } from "@/lib/share/format"
import type { PBookmark, PCollection, PayloadItem } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { BookmarkRow, HUE_TINT } from "./BookmarkRow"
import { CopyLinkButton } from "./CopyLinkButton"

/** What a sheet shows: a collection item ("c:3") or a collection node inside a graph ("g:1/n:abc"). */
interface SheetEntry {
  key: string
  collection: PCollection
  /** Name of the graph the collection sits in, for graph nodes. */
  graph?: string
}

/** Every collection a payload can open, by item key. */
function sheetEntries(items: PayloadItem[]): Map<string, SheetEntry> {
  const out = new Map<string, SheetEntry>()
  for (const item of items) {
    if (item.kind === "collection") out.set(item.key, { key: item.key, collection: item.collection })
    if (item.kind === "graph") {
      for (const n of item.graph.nodes) {
        if (n.ref.kind !== "collection") continue
        const key = `${item.key}/n:${n.id}`
        out.set(key, { key, collection: n.ref.collection, graph: item.graph.name })
      }
    }
  }
  return out
}

export const CollectionSheetContext = createContext<{ open(key: string): void }>({ open: () => {} })

export const useCollectionSheet = () => useContext(CollectionSheetContext)

/**
 * Renders the comments on one collection inside its sheet, after the rows. It is called with the
 * sheet's key ("c:3" or "g:1/n:abc"); comments on the collection's bookmarks are nested under it
 * ("…/b:12"). The Discussion provides it; with no provider the sheet shows no comments.
 */
export const CollectionCommentsSlot = createContext<((itemKey: string) => ReactNode) | null>(null)

/** Holds the open sheet for the page; anything below can `open(key)` a collection. */
export function CollectionSheetProvider({ items, curator, children }: { items: PayloadItem[]; curator?: string; children: ReactNode }) {
  const entries = useMemo(() => sheetEntries(items), [items])
  const [current, setCurrent] = useState<SheetEntry | null>(null)
  const trigger = useRef<HTMLElement | null>(null)

  const open = useCallback(
    (key: string) => {
      const entry = entries.get(key)
      if (!entry) return
      trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
      setCurrent(entry)
    },
    [entries],
  )
  const close = useCallback(() => setCurrent(null), [])
  const value = useMemo(() => ({ open }), [open])

  // Focus goes back to whatever opened the sheet once it has unmounted.
  useEffect(() => {
    if (current) return
    const el = trigger.current
    trigger.current = null
    if (el?.isConnected) el.focus()
  }, [current])

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
    <button type="button" onClick={() => open(itemKey)} className={className} aria-haspopup="dialog">
      {children}
    </button>
  )
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const ico = (d: ReactNode, className = "size-4") => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {d}
  </svg>
)

const FOLDER = <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />

export const collectionTint = (hue: number) => HUE_TINT[(((Math.trunc(hue) || 1) - 1) % 5 + 5) % 5]

function matches(b: PBookmark, q: string): boolean {
  return [b.title, b.domain, b.note, ...b.tags].some((s) => s.toLowerCase().includes(q))
}

/**
 * A collection opened in place (design: collection-sheet): a modal dialog that is a right-hand
 * sheet from `sm` up and a bottom sheet on phones. Esc, the close button and the backdrop close it.
 */
function CollectionSheet({ entry, curator, onClose }: { entry: SheetEntry; curator?: string; onClose(): void }) {
  const { collection: c } = entry
  const titleId = useId()
  const panel = useRef<HTMLDivElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const [query, setQuery] = useState("")
  const renderComments = useContext(CollectionCommentsSlot)

  const q = query.trim().toLowerCase()
  const rows = q ? c.bookmarks.filter((b) => matches(b, q)) : c.bookmarks
  const context = entry.graph ? `in ${entry.graph}` : curator ? `from ${curator}` : ""

  useEffect(() => {
    closeBtn.current?.focus()
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = "hidden"

    // Capture phase on document: runs before (and stops) other Esc handlers, e.g. a full-screen graph's.
    const onKey = (e: KeyboardEvent) => {
      const el = panel.current
      if (!el) return
      if (e.key === "Escape") {
        e.preventDefault()
        e.stopPropagation()
        onClose()
        return
      }
      if (e.key !== "Tab") return
      const list = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (!list.length) return
      const first = list[0]
      const last = list[list.length - 1]
      const at = document.activeElement
      if (!el.contains(at)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (e.shiftKey && at === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && at === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener("keydown", onKey, true)
    return () => {
      document.removeEventListener("keydown", onKey, true)
      root.style.overflow = overflow
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50">
      <div data-sheet-backdrop className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-3xl border-t border-border bg-popover text-popover-foreground shadow-2xl sm:inset-y-0 sm:right-0 sm:left-auto sm:max-h-none sm:w-full sm:max-w-lg sm:rounded-none sm:border-t-0 sm:border-l"
      >
        <div className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden="true" />
        <div className="flex shrink-0 items-start gap-3 border-b border-border px-4 pt-3 pb-4 sm:px-5 sm:pt-5">
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", collectionTint(c.hue))} aria-hidden="true">
            {ico(FOLDER, "size-5")}
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
            onClick={onClose}
            aria-label="Close"
            className={cn(
              "grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
              FOCUS_FLAT,
            )}
          >
            {ico(<path d="M6 6l12 12M18 6L6 18" />, "size-5")}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]">
          {c.note ? <p className="px-4 pt-4 text-sm leading-relaxed text-pretty text-muted-foreground sm:px-5">{c.note}</p> : null}
          {c.bookmarks.length ? (
            <>
              <label className="mx-4 mt-4 flex h-9 items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground focus-within:ring-2 focus-within:ring-ring sm:mx-5">
                {ico(
                  <>
                    <circle cx="11" cy="11" r="6.5" />
                    <path d="m20 20-4.2-4.2" />
                  </>,
                )}
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
            Save this collection
          </Link>
          <CopyLinkButton hash={anchorFor(entry.key)} className={cn(btnSecondary("md"), "px-4")} />
        </div>
      </div>
    </div>
  )
}

