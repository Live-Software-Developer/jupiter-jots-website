"use client"

import { useCallback, useState, type ReactNode } from "react"

import { btnPrimary } from "@/components/site/styles"
import { safeUrl } from "@/lib/share/format"
import { MARKDOWN_CLASS, renderMarkdown } from "@/lib/share/markdown"
import type { PBookmark } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { BookmarkSheetContext } from "./bookmarkSheetContext"
import { Sheet } from "./CollectionSheet"
import { GLYPH, ico } from "./icons"
import { BookmarkReadToggle } from "./ReadState"
import { SafeImg } from "./SafeImg"

function SheetMark({ bookmark }: { bookmark: PBookmark }) {
  const initial = (bookmark.domain.replace(/^www\./, "")[0] || "?").toUpperCase()
  return (
    <SafeImg
      src={bookmark.favicon}
      width={44}
      height={44}
      className="size-11 shrink-0 rounded-xl bg-muted object-contain p-1.5"
      fallback={<span className="grid size-11 shrink-0 place-items-center rounded-xl bg-muted text-sm font-semibold">{initial}</span>}
    />
  )
}

/**
 * The read-focused bookmark sheet for a share visitor: preview, the curator's note, tags, a
 * local read toggle and one explicit Open link. It never opens the page just because the card
 * was clicked.
 */
function BookmarkSheet({ bookmark, onClose }: { bookmark: PBookmark; onClose(): void }) {
  const href = safeUrl(bookmark.url)
  return (
    <Sheet
      itemKey={bookmark.key}
      onClose={onClose}
      mark={<SheetMark bookmark={bookmark} />}
      kind="Bookmark"
      title={bookmark.title || bookmark.domain}
      meta={bookmark.domain}
      commentsTab
    >
      <div className="px-4 pt-4 pb-6 sm:px-5">
        {bookmark.image ? (
          <SafeImg
            src={bookmark.image}
            width={1200}
            height={630}
            className="mb-4 aspect-[2/1] w-full rounded-xl border border-border object-cover"
            fallback={null}
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          <BookmarkReadToggle bookmark={bookmark} label />
          {href ? (
            <a href={href} target="_blank" rel="noopener noreferrer nofollow ugc" className={cn(btnPrimary("sm"), "gap-1.5")}>
              Open link
              {ico(GLYPH.external, "size-3.5")}
            </a>
          ) : null}
        </div>
        <p className="mt-4 break-all text-xs text-muted-foreground">{bookmark.url}</p>
        {bookmark.tags.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {bookmark.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        {bookmark.note ? (
          <div className={cn(MARKDOWN_CLASS, "mt-5 space-y-3 text-sm leading-relaxed break-words text-foreground/90")}>
            {renderMarkdown(bookmark.note)}
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted-foreground">The curator didn’t add a note to this bookmark.</p>
        )}
      </div>
    </Sheet>
  )
}

/** Opens one bookmark sheet at a time and returns focus to the card that opened it. */
export function BookmarkSheetProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<{ bookmark: PBookmark; trigger: HTMLElement | null } | null>(null)
  const openBookmark = useCallback((bookmark: PBookmark, trigger?: HTMLElement | null) => {
    setOpen({ bookmark, trigger: trigger ?? null })
  }, [])
  const close = useCallback(() => {
    const trigger = open?.trigger
    setOpen(null)
    trigger?.focus()
  }, [open])

  return (
    <BookmarkSheetContext.Provider value={openBookmark}>
      {children}
      {open ? <BookmarkSheet bookmark={open.bookmark} onClose={close} /> : null}
    </BookmarkSheetContext.Provider>
  )
}
