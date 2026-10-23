"use client"

import { useCallback, useRef, useState } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { plural } from "@/lib/share/format"
import { graphLabel, noteLabel } from "@/lib/share/targets"
import type { PGraph, PNote, PNoteLink } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { BookmarkRow } from "./BookmarkRow"
import { CollectionMark, OpenCollectionButton, Sheet } from "./CollectionSheet"
import { GraphView } from "./GraphView"
import { GLYPH, ico } from "./icons"

const CHIP = "inline-flex max-w-full items-center gap-2 rounded-full border border-border py-1 pr-3 pl-1 text-sm"
/** A chip that opens a sheet: it looks pressable and says so with a chevron. */
const CHIP_BUTTON = cn(CHIP, "bg-card transition-colors hover:border-foreground/25 hover:bg-accent", FOCUS_FLAT)

type Chip = Exclude<PNoteLink, { kind: "bookmark" }>

const GraphTile = () => (
  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-chart-1/15 text-chart-1" aria-hidden="true">
    {ico(GLYPH.graph, "size-3.5")}
  </span>
)

function ChipBody({ chip, openable }: { chip: Chip; openable: boolean }) {
  return (
    <>
      {chip.kind === "collection" ? (
        <CollectionMark icon={chip.icon} hue={chip.hue} px={24} className="size-6 rounded-full" glyph="size-3.5" emoji="text-sm" />
      ) : (
        <GraphTile />
      )}
      <span className="min-w-0 truncate" title={chip.name}>
        {chip.name || (chip.kind === "graph" ? "Untitled graph" : "Untitled collection")}
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{chip.kind === "graph" ? "Graph" : "Collection"}</span>
      {openable ? ico(GLYPH.chevronRight, "size-3.5 shrink-0 text-muted-foreground") : null}
    </>
  )
}

/** A note's linked graph in a full-screen sheet, with Board/Canvas and its nodes' own sheets. */
export function GraphSheet({ graph, itemKey, note, onClose }: { graph: PGraph; itemKey: string; note: PNote; onClose(): void }) {
  const steps = graph.steps.length
  const nodes = plural(graph.nodes.length, "node")
  return (
    <Sheet
      wide
      itemKey={itemKey}
      onClose={onClose}
      mark={
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-chart-1/15 text-chart-1" aria-hidden="true">
          {ico(GLYPH.graph, "size-5")}
        </span>
      }
      kind="Graph"
      title={graphLabel(graph)}
      meta={`${steps ? `${plural(steps, "step")} · ` : ""}${nodes} · linked from ${noteLabel(note)}`}
    >
      {graph.description ? <p className="px-4 pt-4 text-sm leading-relaxed text-pretty text-muted-foreground sm:px-5">{graph.description}</p> : null}
      <div className="px-3 pt-4 sm:px-5">
        <GraphView graph={graph} itemKey={itemKey} />
      </div>
    </Sheet>
  )
}

function GraphChip({ chip, graph, note }: { chip: Chip; graph: PGraph; note: PNote }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  // Runs after the native close, so the page is no longer inert and the chip can take focus back.
  const close = useCallback(() => {
    setOpen(false)
    trigger.current?.focus()
  }, [])
  return (
    <>
      <button ref={trigger} type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={CHIP_BUTTON}>
        <ChipBody chip={chip} openable />
      </button>
      {open ? <GraphSheet graph={graph} itemKey={chip.key} note={note} onClose={close} /> : null}
    </>
  )
}

/**
 * What the note links to: its bookmarks as rows, its collections and graphs as chips. A chip
 * with contents opens them (a collection in its sheet, a graph full screen); one without (older
 * payloads, or a note inside a linked collection or graph) is a plain chip that still says what
 * it is. `bleed` is the negative margin that takes the rows to the container's edges.
 */
export function NoteLinks({ note, bleed }: { note: PNote; bleed: string }) {
  const links = note.links ?? []
  const bookmarks = links.flatMap((l) => (l.kind === "bookmark" ? [l.bookmark] : []))
  const chips = links.filter((l): l is Chip => l.kind !== "bookmark")
  if (!links.length) return null
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
            <li key={c.key} className="max-w-full min-w-0">
              {c.kind === "collection" && c.collection ? (
                <OpenCollectionButton itemKey={c.key} className={CHIP_BUTTON}>
                  <ChipBody chip={c} openable />
                </OpenCollectionButton>
              ) : c.kind === "graph" && c.graph ? (
                <GraphChip chip={c} graph={c.graph} note={note} />
              ) : (
                <span className={CHIP}>
                  <ChipBody chip={c} openable={false} />
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
