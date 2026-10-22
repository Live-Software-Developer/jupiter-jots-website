import type { ReactNode } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { safeUrl } from "@/lib/share/format"
import type { PBookmark } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { GLYPH, ico } from "./icons"

/** Tints for the five chart hues; a collection's `hue` (1-5) indexes this directly. */
export const HUE_TINT = [
  "bg-chart-1/15 text-chart-1",
  "bg-chart-2/15 text-chart-2",
  "bg-chart-3/15 text-chart-3",
  "bg-chart-4/15 text-chart-4",
  "bg-chart-5/15 text-chart-5",
] as const

/** The lone-bookmark card's panel and tile, in the same five hues as HUE_TINT. Written out in full so Tailwind sees every class. */
export const CARD_TINT = [
  { panel: "bg-chart-1/10", tile: "bg-chart-1/20 text-chart-1" },
  { panel: "bg-chart-2/10", tile: "bg-chart-2/20 text-chart-2" },
  { panel: "bg-chart-3/10", tile: "bg-chart-3/20 text-chart-3" },
  { panel: "bg-chart-4/10", tile: "bg-chart-4/20 text-chart-4" },
  { panel: "bg-chart-5/10", tile: "bg-chart-5/20 text-chart-5" },
] as const

/** A stable hue pick from any string: a bookmark's domain (payload bookmarks carry no colour) or a commenter's name. */
export function hueIndex(seed: string): number {
  let h = 0
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % HUE_TINT.length
}

export const hueFor = (domain: string) => HUE_TINT[hueIndex(domain)]

export const domainInitial = (domain: string) => (domain.replace(/^www\./, "")[0] || "?").toUpperCase()

/** A link to the bookmark when its URL is http(s), plain content otherwise. */
export function BookmarkLink({ url, className, children }: { url: string; className: string; children: ReactNode }) {
  const href = safeUrl(url)
  if (!href) return <div className={className}>{children}</div>
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  )
}

/** One bookmark in a band or sheet list (design: share-bookmark-row). */
export function BookmarkRow({ bookmark }: { bookmark: PBookmark }) {
  return (
    <div data-bookmark-row className="group px-4 py-4 transition-colors hover:bg-accent/40 sm:px-5">
      <BookmarkLink url={bookmark.url} className={cn("flex items-start gap-3.5 rounded-lg sm:gap-4", FOCUS_FLAT)}>
        <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold", hueFor(bookmark.domain))} aria-hidden="true">
          {domainInitial(bookmark.domain)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="text-sm font-medium break-words text-foreground">{bookmark.title || bookmark.domain}</span>
            <span className="text-xs text-muted-foreground">{bookmark.domain}</span>
          </span>
          {bookmark.note ? <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{bookmark.note}</span> : null}
          {bookmark.tags.length > 0 ? (
            <span className="mt-2 flex flex-wrap gap-1">
              {bookmark.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </span>
          ) : null}
        </span>
        {ico(GLYPH.external, "mt-1.5 size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground")}
      </BookmarkLink>
    </div>
  )
}
