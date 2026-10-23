import type { PNote } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { BookmarkRow } from "./BookmarkRow"
import { CollectionMark } from "./CollectionSheet"
import { GLYPH, ico } from "./icons"

/**
 * What the note links to: its bookmarks as rows, its collections and graphs as name chips (their
 * contents aren't shared). `bleed` is the negative margin that takes the rows to the container's edges.
 */
export function NoteLinks({ links, bleed }: { links: NonNullable<PNote["links"]>; bleed: string }) {
  const bookmarks = links.flatMap((l) => (l.kind === "bookmark" ? [l.bookmark] : []))
  const chips = links.filter((l) => l.kind !== "bookmark")
  return (
    <section aria-label="Linked" className="mt-6 border-t border-border pt-5">
      <h3 className="text-xs font-medium text-muted-foreground">Linked</h3>
      {bookmarks.length > 0 ? (
        <div className={cn("mt-2 divide-y divide-border", bleed)}>
          {bookmarks.map((b) => (
            <BookmarkRow key={b.key} bookmark={b} />
          ))}
        </div>
      ) : null}
      {chips.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {chips.map((c) => (
            <li key={c.key} className="inline-flex max-w-full items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 text-sm">
              {c.kind === "collection" ? (
                <CollectionMark icon={c.icon} hue={c.hue} px={24} className="size-6 rounded-full" glyph="size-3.5" emoji="text-sm" />
              ) : (
                <span className="grid size-6 place-items-center rounded-full bg-muted text-muted-foreground" aria-hidden="true">
                  {ico(GLYPH.graph, "size-3.5")}
                </span>
              )}
              <span className="min-w-0 truncate">{c.name}</span>
              {c.kind === "graph" && <span className="text-xs text-muted-foreground">Graph</span>}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
