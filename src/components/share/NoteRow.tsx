import { MARKDOWN_CLASS, renderMarkdown } from "@/lib/share/markdown"
import { NOTE_MAX } from "@/lib/share/payload"
import { noteLabel } from "@/lib/share/targets"
import type { PNote } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { GLYPH, ico } from "./icons"

/** A note's tile, in the notes hue. `className` sizes the tile, `glyph` the glyph. */
export const NoteMark = ({ className, glyph = "size-4" }: { className: string; glyph?: string }) => (
  <span className={cn("grid shrink-0 place-items-center bg-chart-4/15 text-chart-4", className)} aria-hidden="true">
    {ico(GLYPH.note, glyph)}
  </span>
)

/** A note's rendered markdown body; the full note, up to the parser's cap. */
export const NoteBody = ({ note, className }: { note: PNote; className?: string }) =>
  note.body ? <div className={cn(MARKDOWN_CLASS, "wrap-anywhere", className)}>{renderMarkdown(note.body, NOTE_MAX)}</div> : null

/**
 * One note in a collection's band or sheet, above its bookmarks. `clamp` cuts the body to four
 * lines (the band); the sheet shows it in full.
 */
export function NoteRow({ note, clamp = false }: { note: PNote; clamp?: boolean }) {
  return (
    <div data-note-row className="flex items-start gap-3.5 px-4 py-4 sm:gap-4 sm:px-5">
      <NoteMark className="size-9 rounded-lg" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium break-words text-foreground">{noteLabel(note)}</p>
        <NoteBody note={note} className={cn("mt-1 space-y-2 text-sm leading-relaxed text-muted-foreground", clamp && "line-clamp-4")} />
        {note.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {note.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
