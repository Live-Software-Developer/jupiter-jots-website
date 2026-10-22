import type { ReactNode } from "react"

import { FOCUS } from "@/components/site/styles"
import { anchorFor, plural } from "@/lib/share/format"
import { bookmarkLabel, collectionLabel, graphLabel, runKey } from "@/lib/share/targets"
import type { PBookmark, PayloadItem } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { BookmarkLink, BookmarkRow, CARD_TINT, domainInitial, hueIndex } from "./BookmarkRow"
import { OpenCollectionButton } from "./CollectionSheet"
import { BandCommentsLink } from "./Discussion"
import { GraphView } from "./GraphView"
import { GLYPH, ico } from "./icons"

/** A band on the page: a payload item, or a run of adjacent loose bookmarks shown together. */
export type Band = PayloadItem | { key: string; kind: "bookmarks"; bookmarks: PBookmark[] }
export type BandKind = Band["kind"]

/** Payload order is band order; two or more bookmarks in a row share one band. */
export function toBands(items: PayloadItem[]): Band[] {
  const out: Band[] = []
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind !== "bookmark" || items[i + 1]?.kind !== "bookmark") {
      out.push(item)
      continue
    }
    const run: PBookmark[] = []
    const key = item.key
    while (i < items.length && items[i].kind === "bookmark") {
      run.push((items[i] as Extract<PayloadItem, { kind: "bookmark" }>).bookmark)
      i++
    }
    i--
    out.push({ key, kind: "bookmarks", bookmarks: run })
  }
  return out
}

/** Anchor id for a band, from its payload key ("c:3" -> "item-c-3"). */
export const bandId = (band: Band) => anchorFor(band.key)

/** The discussion filter for a band: its key, or every bookmark of a run of loose bookmarks. */
export const bandFilterKey = (band: Band) => (band.kind === "bookmarks" ? runKey(band.key) : band.key)

export function bandTitle(band: Band): string {
  switch (band.kind) {
    case "graph":
      return graphLabel(band.graph)
    case "collection":
      return collectionLabel(band.collection)
    case "bookmark":
      return bookmarkLabel(band.bookmark)
    case "bookmarks":
      return "Shared bookmarks"
  }
}

/** How many things the band holds: nodes for a graph, bookmarks otherwise. */
export function bandCount(band: Band): number {
  switch (band.kind) {
    case "graph":
      return band.graph.nodes.length
    case "collection":
      return band.collection.bookmarks.length
    case "bookmark":
      return 1
    case "bookmarks":
      return band.bookmarks.length
  }
}

/** Label, icon and tone per band kind, shared with the hero's "In this share" index. */
export const BAND_KIND: Record<BandKind, { label: string; icon: ReactNode; text: string; tile: string }> = {
  collection: {
    label: "Collection",
    icon: GLYPH.folder,
    text: "text-chart-5",
    tile: "bg-chart-5/15 text-chart-5",
  },
  graph: {
    label: "Graph",
    icon: GLYPH.graph,
    text: "text-chart-1",
    tile: "bg-chart-1/15 text-chart-1",
  },
  bookmarks: { label: "Bookmarks", icon: GLYPH.bookmark, text: "text-chart-2", tile: "bg-chart-2/15 text-chart-2" },
  bookmark: { label: "Bookmark", icon: GLYPH.bookmark, text: "text-chart-2", tile: "bg-chart-2/15 text-chart-2" },
}

export const bandIcon = (kind: BandKind, className?: string) => ico(BAND_KIND[kind].icon, className)

const ROWS_SHOWN = 4

function CollectionBody({ band }: { band: Extract<Band, { kind: "collection" }> }) {
  const all = band.collection.bookmarks
  if (!all.length) return <p className="text-sm text-muted-foreground">This collection is empty.</p>
  return (
    <>
      <div className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 md:[&>*:last-child:nth-child(odd)]:col-span-2 [&>*]:bg-card">
        {all.slice(0, ROWS_SHOWN).map((b, i) => (
          <BookmarkRow key={b.key || i} bookmark={b} />
        ))}
      </div>
      {all.length > ROWS_SHOWN ? (
        <OpenCollectionButton
          itemKey={band.key}
          className={cn("mt-3 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/10", FOCUS)}
        >
          See all {all.length} in the collection
        </OpenCollectionButton>
      ) : null}
    </>
  )
}

function BookmarksBody({ bookmarks }: { bookmarks: PBookmark[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {bookmarks.map((b, i) => (
        <div key={b.key || i} className="overflow-hidden rounded-2xl border border-border bg-card">
          <BookmarkRow bookmark={b} />
        </div>
      ))}
    </div>
  )
}

/** A lone bookmark gets the large card from the bookmark share design. */
function BookmarkCard({ bookmark, curator }: { bookmark: PBookmark; curator?: string }) {
  const tint = CARD_TINT[hueIndex(bookmark.domain)]
  return (
    <BookmarkLink
      url={bookmark.url}
      className={cn(
        "group grid overflow-hidden rounded-3xl border border-border bg-card text-card-foreground transition-colors hover:border-foreground/25 md:grid-cols-5",
        FOCUS,
      )}
    >
      <div className={cn("relative grid min-h-48 place-items-center md:col-span-2 md:min-h-72", tint.panel)}>
        <span className={cn("grid size-20 place-items-center rounded-3xl font-serif text-4xl", tint.tile)} aria-hidden="true">
          {domainInitial(bookmark.domain)}
        </span>
        <span className="absolute bottom-3 left-3 rounded-full bg-background/80 px-2.5 py-1 text-xs text-muted-foreground backdrop-blur">{bookmark.domain}</span>
      </div>
      <div className="flex min-w-0 flex-col p-5 sm:p-8 md:col-span-3">
        <h3 className="text-2xl leading-snug font-medium break-words text-pretty">{bookmark.title || bookmark.domain}</h3>
        {bookmark.note ? (
          <blockquote className="mt-5 border-l-2 border-primary/50 pl-4 text-base leading-relaxed text-pretty text-muted-foreground">
            {bookmark.note}
            <span className="mt-2 block text-xs">— {curator ? `${curator}'s note` : "The curator's note"}</span>
          </blockquote>
        ) : null}
        {bookmark.tags.length > 0 ? (
          <div className="mt-5 flex flex-wrap gap-1.5">
            {bookmark.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-sm font-medium text-primary">
          Open {bookmark.domain}
          {ico(GLYPH.external, "size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5")}
        </span>
      </div>
    </BookmarkLink>
  )
}

function meta(band: Band): string {
  switch (band.kind) {
    case "graph": {
      const steps = band.graph.steps.length
      const nodes = plural(band.graph.nodes.length, "node")
      return steps ? `${plural(steps, "step")} · ${nodes}` : nodes
    }
    case "collection":
      return plural(band.collection.bookmarks.length, "bookmark")
    case "bookmarks":
      return plural(band.bookmarks.length, "bookmark")
    case "bookmark":
      return ""
  }
}

/**
 * One item of a share as a band (design: share-band). `index` is 0-based; the "01" eyebrow
 * only shows when the share holds more than one band. Graphs run full width.
 */
export function ShareBand({ item, index, total, curator }: { item: Band; index: number; total: number; curator?: string }) {
  const kind = BAND_KIND[item.kind]
  const full = item.kind === "graph"
  const wrap = "mx-auto w-full max-w-6xl px-3 sm:px-6"
  const heading = item.kind === "bookmark" ? item.bookmark.domain : bandTitle(item)
  const note = item.kind === "graph" ? item.graph.description : item.kind === "collection" ? item.collection.note : ""
  const info = meta(item)

  return (
    <section id={bandId(item)} className="scroll-mt-20 border-t border-border py-10 sm:py-14">
      <div className={wrap}>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-4">
          <div className="min-w-0 flex-1 basis-80">
            <p className="flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
              {total > 1 ? (
                <>
                  <span className="tabular-nums">{String(index + 1).padStart(2, "0")}</span>
                  <span className="h-px w-4 bg-border" aria-hidden="true" />
                </>
              ) : null}
              <span className={cn("inline-flex items-center gap-1.5", kind.text)}>
                {ico(kind.icon, "size-3.5")}
                <span className="text-muted-foreground">{kind.label}</span>
              </span>
              {info ? (
                <>
                  <span className="text-border" aria-hidden="true">
                    ·
                  </span>
                  <span>{info}</span>
                </>
              ) : null}
            </p>
            <h2 className="mt-2 font-serif text-3xl leading-tight tracking-tight break-words text-balance sm:text-4xl">{heading}</h2>
            {note ? <p className="mt-2 max-w-2xl text-base leading-relaxed text-pretty text-muted-foreground">{note}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 empty:hidden">
            <BandCommentsLink
              filter={bandFilterKey(item)}
              className={cn("inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", FOCUS)}
            />
            {item.kind === "collection" ? (
              <OpenCollectionButton
                itemKey={item.key}
                className={cn("inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium transition-colors hover:bg-accent", FOCUS)}
              >
                Open collection
                {ico(GLYPH.chevronRight)}
              </OpenCollectionButton>
            ) : null}
          </div>
        </div>
      </div>
      <div className={cn(full ? "px-3 sm:px-6" : wrap, "mt-6 sm:mt-8")}>
        {item.kind === "graph" ? <GraphView graph={item.graph} itemKey={item.key} /> : null}
        {item.kind === "collection" ? <CollectionBody band={item} /> : null}
        {item.kind === "bookmarks" ? <BookmarksBody bookmarks={item.bookmarks} /> : null}
        {item.kind === "bookmark" ? <BookmarkCard bookmark={item.bookmark} curator={curator} /> : null}
      </div>
    </section>
  )
}
