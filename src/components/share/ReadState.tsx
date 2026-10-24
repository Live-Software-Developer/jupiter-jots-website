"use client"

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { loadReads, writeRead } from "@/lib/share/readStore"
import type { PBookmark } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { ico } from "./icons"

const CHECK = <path d="M5 12.5l4.5 4.5L19 7" />

interface ReadApi {
  isRead(bookmark: PBookmark): boolean
  toggle(bookmark: PBookmark): void
}

/** Standalone graphs/rows (tests, or a caller without a share) keep the payload's read state. */
const FALLBACK: ReadApi = { isRead: (bookmark) => bookmark.read, toggle: () => {} }
const ReadContext = createContext<ReadApi>(FALLBACK)

/**
 * Reader-local read progress for one share. It starts from the curator's payload snapshot and
 * layers this browser's own choices over it; IndexedDB keeps those choices across reloads without
 * sending them anywhere.
 */
export function ShareReadProvider({ slug, children }: { slug: string; children: ReactNode }) {
  const [overrides, setOverrides] = useState<Map<string, boolean>>(() => new Map())
  const overridesRef = useRef(overrides)

  useEffect(() => {
    let live = true
    void loadReads(slug).then((stored) => {
      if (!live) return
      // A click may land while IndexedDB is opening; keep it over the stored snapshot.
      for (const [key, read] of overridesRef.current) stored.set(key, read)
      overridesRef.current = stored
      setOverrides(stored)
    })
    return () => {
      live = false
    }
  }, [slug])

  const api = useMemo<ReadApi>(() => {
    const isRead = (bookmark: PBookmark) =>
      overrides.has(bookmark.key) ? overrides.get(bookmark.key)! : bookmark.read
    return {
      isRead,
      toggle: (bookmark) => {
        const current = overridesRef.current.has(bookmark.key)
          ? overridesRef.current.get(bookmark.key)!
          : bookmark.read
        const next = new Map(overridesRef.current)
        next.set(bookmark.key, !current)
        overridesRef.current = next
        setOverrides(next)
        void writeRead(slug, bookmark.key, !current)
      },
    }
  }, [overrides, slug])

  return <ReadContext.Provider value={api}>{children}</ReadContext.Provider>
}

export const useRead = () => useContext(ReadContext)

/** A small check/unread control used on rows, cards and graph nodes. */
export function BookmarkReadToggle({
  bookmark,
  className,
  label = false,
}: {
  bookmark: PBookmark
  className?: string
  /** A full "Mark as read" pill for the detail sheet; otherwise just the icon. */
  label?: boolean
}) {
  const { isRead, toggle } = useRead()
  const read = isRead(bookmark)
  return (
    <button
      type="button"
      aria-pressed={read}
      aria-label={read ? "Mark as unread" : "Mark as read"}
      title={read ? "Mark as unread" : "Mark as read"}
      onClick={(event) => {
        event.preventDefault()
        event.stopPropagation()
        toggle(bookmark)
      }}
      className={cn(
        label
          ? "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-border px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          : "grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
        read && "text-primary",
        FOCUS_FLAT,
        className,
      )}
    >
      {read ? ico(CHECK, "size-4", 2.4) : <span className="size-2.5 rounded-full border border-current" aria-hidden="true" />}
      {label ? <span>{read ? "Read" : "Mark as read"}</span> : null}
    </button>
  )
}
