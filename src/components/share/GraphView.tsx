"use client"

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { plural } from "@/lib/share/format"
import { bandOf, boardColumns, computePath, NODE_W, type Box } from "@/lib/share/graph"
import { markdownPreview } from "@/lib/share/markdown"
import { allBookmarks, allNotes } from "@/lib/share/payload"
import { noteLabel } from "@/lib/share/targets"
import type { PGraph, PGraphNode, PNote } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { BookmarkLink, BookmarkMark } from "./BookmarkRow"
import { CollectionMark, Sheet, useCollectionSheet } from "./CollectionSheet"
import { GLYPH, ico } from "./icons"
import { Modal } from "./Modal"
import { NoteLinks } from "./NoteLinks"
import { NoteBody, NoteMark } from "./NoteRow"

// Read-only port of the extension's graph view (design: graph-view). Board and Canvas show the
// same nodes; Canvas places them at their saved x/y and zooms with a CSS transform.

type Mode = PGraph["mode"]
interface Wire {
  key: string
  from: string
  to: string
  d: string
}

// Same range as the extension's canvas; it opens fitted to the width, never above 100%.
export const ZOOM_MIN = 0.3
export const ZOOM_MAX = 1.6
const ZOOM_STEP = 0.1
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +z.toFixed(2)))

const I: Record<string, ReactNode> = {
  board: (
    <>
      <rect x="3.5" y="4" width="5" height="16" rx="1.5" />
      <rect x="9.5" y="4" width="5" height="11" rx="1.5" />
      <rect x="15.5" y="4" width="5" height="13" rx="1.5" />
    </>
  ),
  canvas: GLYPH.graph,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  shrink: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  arrow: <path d="M4 12h15M14 7l5 5-5 5" />,
}

const CARD =
  "group relative block w-full rounded-xl border border-border bg-card p-3 text-left transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-lg hover:shadow-foreground/5"

function NodeCard({ node, itemKey, graphName }: { node: PGraphNode; itemKey: string; graphName: string }) {
  const { open } = useCollectionSheet()
  if (node.ref.kind === "note") return <NoteNodeCard note={node.ref.note} graphName={graphName} />
  if (node.ref.kind === "collection") {
    const c = node.ref.collection
    const notes = allNotes(c).length
    return (
      <div className="relative pb-3">
        <span className="pointer-events-none absolute inset-x-2 -bottom-1.5 h-3 rounded-b-xl border border-t-0 border-border bg-card/70" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-x-4 -bottom-3 h-3 rounded-b-xl border border-t-0 border-border bg-card/40" aria-hidden="true" />
        <button type="button" aria-haspopup="dialog" onClick={(e) => open(`${itemKey}/n:${node.id}`, e.currentTarget)} className={cn(CARD, FOCUS_FLAT)}>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <CollectionMark icon={c.icon} hue={c.hue} px={20} className="size-5 rounded" glyph="size-3" emoji="text-xs" />
            <span className="min-w-0 truncate">Collection</span>
          </span>
          <span className="mt-1.5 block text-sm leading-snug font-medium break-words text-pretty text-card-foreground">{c.name}</span>
          {c.note ? <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{markdownPreview(c.note)}</span> : null}
          <span className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {ico(GLYPH.folder, "size-3.5")}
              {notes ? `${plural(notes, "note")} · ` : ""}
              {plural(allBookmarks(c).length, "link")}
            </span>
            <span className="ml-auto font-medium text-primary">Open</span>
          </span>
        </button>
      </div>
    )
  }
  const b = node.ref.bookmark
  const domain = b.domain.replace(/^www\./, "")
  return (
    <BookmarkLink url={b.url} className={cn(CARD, FOCUS_FLAT)}>
      <span className="flex items-center gap-2 text-xs text-muted-foreground">
        <BookmarkMark bookmark={b} px={20} pad="p-0.5" className="size-5 rounded text-xs font-semibold" />
        <span className="min-w-0 truncate">{domain}</span>
        {b.read ? (
          <span className="ml-auto text-primary" title="Read">
            {ico(I.check, "size-3.5", 2.4)}
            <span className="sr-only">Read</span>
          </span>
        ) : (
          <span className="ml-auto size-2.5 shrink-0 rounded-full border border-muted-foreground/50" title="Unread" />
        )}
      </span>
      <span className="mt-1.5 block text-sm leading-snug font-medium break-words text-pretty text-card-foreground">{b.title || domain}</span>
      {b.note ? <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{markdownPreview(b.note)}</span> : null}
      {b.tags.length ? (
        <span className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {b.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded bg-muted px-1.5 py-0.5">
              #{t}
            </span>
          ))}
        </span>
      ) : null}
    </BookmarkLink>
  )
}

/** A note node: its title and a clamped plain preview; a click opens the whole note in a sheet. */
function NoteNodeCard({ note, graphName }: { note: PNote; graphName: string }) {
  const [open, setOpen] = useState(false)
  const trigger = useRef<HTMLButtonElement>(null)
  const preview = markdownPreview(note.body)
  // Runs after the native close, so the page is no longer inert and the card can take focus back.
  const close = useCallback(() => {
    setOpen(false)
    trigger.current?.focus()
  }, [])
  return (
    <>
      <button ref={trigger} type="button" aria-haspopup="dialog" onClick={() => setOpen(true)} className={cn(CARD, FOCUS_FLAT)}>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          <NoteMark className="size-5 rounded" glyph="size-3" />
          <span className="min-w-0 truncate">Note</span>
        </span>
        <span className="mt-1.5 block text-sm leading-snug font-medium break-words text-pretty text-card-foreground">{noteLabel(note)}</span>
        {preview ? <span className="mt-1 line-clamp-3 block text-xs leading-relaxed break-words text-muted-foreground">{preview}</span> : null}
        <span className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          {note.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded bg-muted px-1.5 py-0.5">
              #{t}
            </span>
          ))}
          <span className="ml-auto font-medium text-primary">Read</span>
        </span>
      </button>
      {open ? (
        <Sheet itemKey={note.key} onClose={close} mark={<NoteMark className="size-11 rounded-xl" glyph="size-5" />} kind="Note" title={noteLabel(note)} meta={`in ${graphName}`}>
          <div className="px-4 pt-4 pb-2 sm:px-5">
            {note.body ? (
              <NoteBody note={note} className="space-y-3 text-sm leading-relaxed text-pretty text-foreground/90" />
            ) : (
              <p className="text-sm text-muted-foreground">This note is empty.</p>
            )}
            <NoteLinks note={note} bleed="-mx-4 sm:-mx-5" />
            {note.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {note.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        </Sheet>
      ) : null}
    </>
  )
}

/** Arrowheads use an explicit `currentColor` fill (not `context-stroke`), one marker per tone. */
function Wires({ wires, hot }: { wires: Wire[]; hot: string | null }) {
  const mk = `${useId().replace(/[^a-z0-9]/gi, "")}-tip`
  const marker = (id: string, className: string) => (
    <marker id={id} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0 0L8 4L0 8Z" fill="currentColor" className={className} />
    </marker>
  )
  return (
    <svg className="pointer-events-none absolute inset-0 size-full overflow-visible text-muted-foreground/60" aria-hidden="true" data-wires>
      <defs>
        {marker(mk, "opacity-70")}
        {marker(`${mk}-hot`, "text-primary")}
      </defs>
      {wires.map((w) => {
        const on = hot !== null && (w.from === hot || w.to === hot)
        return (
          <path
            key={w.key}
            data-wire={w.key}
            d={w.d}
            className={cn("transition-colors", on ? "text-primary" : "opacity-70")}
            stroke="currentColor"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            markerEnd={`url(#${on ? `${mk}-hot` : mk})`}
          />
        )
      })}
    </svg>
  )
}

/** Wires between the surface's `[data-gid]` cards, re-measured whenever the surface or any card resizes. */
function useWires(graph: PGraph) {
  const surface = useRef<HTMLDivElement>(null)
  const [wires, setWires] = useState<Wire[]>([])

  const redraw = useCallback(() => {
    const s = surface.current
    if (!s) return
    const cards = new Map([...s.querySelectorAll<HTMLElement>("[data-gid]")].map((el) => [el.dataset.gid, el]))
    const box = (id: string): Box | null => {
      const el = cards.get(id)
      if (!el) return null
      let l = 0
      let t = 0
      for (let e: HTMLElement | null = el; e && e !== s; e = e.offsetParent as HTMLElement | null) {
        l += e.offsetLeft
        t += e.offsetTop
      }
      return { l, t, r: l + el.offsetWidth, b: t + el.offsetHeight }
    }
    const next: Wire[] = []
    for (const lk of graph.links) {
      const a = box(lk.from)
      const b = box(lk.to)
      if (a && b) next.push({ key: `${lk.from}>${lk.to}`, from: lk.from, to: lk.to, d: computePath(a, b) })
    }
    setWires((prev) => (prev.length === next.length && prev.every((w, i) => w.key === next[i].key && w.d === next[i].d) ? prev : next))
  }, [graph])

  useLayoutEffect(() => {
    redraw()
    const s = surface.current
    let live = true
    document.fonts?.ready.then(() => live && redraw())
    if (!s || typeof ResizeObserver === "undefined") return () => void (live = false)
    const ro = new ResizeObserver(redraw)
    ro.observe(s)
    for (const card of s.querySelectorAll("[data-gid]")) ro.observe(card)
    return () => {
      live = false
      ro.disconnect()
    }
  }, [redraw])

  return { surface, wires }
}

interface ViewProps {
  graph: PGraph
  itemKey: string
  full: boolean
  hot: string | null
  setHot(id: string | null): void
}

/** Hover or focus on a card lights up its wires. */
const hotProps = (id: string, setHot: (id: string | null) => void) => ({
  onMouseEnter: () => setHot(id),
  onMouseLeave: () => setHot(null),
  onFocus: () => setHot(id),
  onBlur: () => setHot(null),
})

function Board({ graph, itemKey, full, hot, setHot }: ViewProps) {
  const cols = useMemo(() => boardColumns(graph), [graph])
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph])
  const derived = cols.length > 0 && cols[0].derived
  const { surface, wires } = useWires(graph)

  return (
    <>
      {derived && graph.links.length ? (
        <p className="flex items-center gap-2 border-b border-border px-3 py-2 text-xs text-muted-foreground">
          {ico(I.info, "size-3.5")}
          This graph has no steps, so the columns follow the arrows.
        </p>
      ) : null}
      <div
        className={cn(
          "overflow-x-auto overscroll-x-contain [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin] max-lg:snap-x max-lg:snap-mandatory max-lg:scroll-px-3",
          full && "min-h-0 flex-1 overflow-y-auto",
        )}
      >
        <div ref={surface} className="relative flex w-max min-w-full items-stretch gap-3 p-3">
          {cols.map((col, i) => (
            <div
              key={col.key}
              role="group"
              aria-label={col.label}
              className="flex w-[min(18rem,82vw)] shrink-0 snap-start snap-always flex-col rounded-xl bg-muted/50 p-2 lg:w-auto lg:max-w-sm lg:min-w-64 lg:flex-1"
            >
              <header className="flex items-center gap-2 px-1.5 pt-0.5 pb-2.5">
                <span className="text-xs font-medium tabular-nums text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="min-w-0 truncate text-sm font-medium">{col.label}</h3>
                <span className="ml-auto rounded-full bg-background px-1.5 text-xs tabular-nums text-muted-foreground">{col.nodeIds.length}</span>
              </header>
              <ol className="flex flex-1 flex-col gap-2.5">
                {col.nodeIds.map((id) => {
                  const node = byId.get(id)
                  return node ? (
                    <li key={id} data-gid={id} {...hotProps(id, setHot)}>
                      <NodeCard node={node} itemKey={itemKey} graphName={graph.name} />
                    </li>
                  ) : null
                })}
                {!col.nodeIds.length ? (
                  <li className="grid min-h-28 place-items-center rounded-xl border border-dashed border-border px-4 text-center text-xs text-muted-foreground">
                    Nothing here yet
                  </li>
                ) : null}
              </ol>
            </div>
          ))}
          <Wires wires={wires} hot={hot} />
        </div>
      </div>
    </>
  )
}

/** Canvas size: every node plus a margin, never smaller than the design's 1100 × 520. */
export const canvasSize = (graph: PGraph) => ({
  w: Math.max(1100, ...graph.nodes.map((n) => n.x + NODE_W + 80)),
  h: Math.max(520, ...graph.nodes.map((n) => n.y + 220)),
})

function Canvas({ graph, itemKey, full, hot, setHot, scale, onFit }: ViewProps & { scale: number | null; onFit(z: number): void }) {
  const { surface, wires } = useWires(graph)
  const pane = useRef<HTMLDivElement>(null)
  const { w, h } = canvasSize(graph)
  const bands = bandOf(graph)
  const stepIndex = new Map(graph.steps.map((s, i) => [s.id, i]))
  const z = scale ?? 1

  // First time the canvas shows: fit the graph's width, capped at 100%. Unmeasured (0) stays at 100%.
  useLayoutEffect(() => {
    if (scale !== null) return
    const width = pane.current?.clientWidth ?? 0
    onFit(width > 0 ? clampZoom(Math.min(1, width / w)) : 1)
  }, [scale, onFit, w])

  return (
    <div
      ref={pane}
      className={cn(
        "overflow-auto overscroll-contain bg-muted/20 bg-[radial-gradient(circle,var(--border)_0.0625rem,transparent_0.0625rem)] [background-size:1.25rem_1.25rem] [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]",
        full ? "min-h-0 flex-1" : "h-[28rem] sm:h-[34rem]",
      )}
    >
      <div style={{ width: w * z, height: h * z }}>
        <div ref={surface} data-surface className="relative origin-top-left" style={{ width: w, height: h, transform: `scale(${z})` }}>
          {bands.map((band) => {
            const i = stepIndex.get(band.stepId) ?? 0
            return (
              <div
                key={band.stepId}
                className="absolute top-3 bottom-3 rounded-2xl border border-dashed border-border/70 bg-muted/25"
                style={{ left: band.x0, width: band.x1 - band.x0 }}
              >
                <span className="absolute top-2.5 left-3 text-xs text-muted-foreground">
                  <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span> · {graph.steps[i]?.label}
                </span>
              </div>
            )
          })}
          <Wires wires={wires} hot={hot} />
          {graph.nodes.map((n) => (
            <div key={n.id} data-gid={n.id} className="absolute" style={{ left: n.x, top: n.y, width: NODE_W }} {...hotProps(n.id, setHot)}>
              <NodeCard node={n} itemKey={itemKey} graphName={graph.name} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const TOOL = cn("grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", FOCUS_FLAT)

/**
 * A shared graph, read-only: Board/Canvas toggle (starting at the graph's own mode), zoom on the
 * canvas, full screen in a native modal dialog (Esc leaves it), wires that light up on hover,
 * collection and note nodes that open their sheet (`<itemKey>/n:<nodeId>`) and bookmark nodes that
 * open in a new tab.
 */
export function GraphView({ graph, itemKey }: { graph: PGraph; itemKey: string }) {
  const [mode, setMode] = useState<Mode>(graph.mode === "canvas" ? "canvas" : "board")
  const [scale, setScale] = useState<number | null>(null)
  const [full, setFull] = useState(false)
  const [hot, setHot] = useState<string | null>(null)
  const [placeholder, setPlaceholder] = useState(0)
  const shell = useRef<HTMLDivElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const toggle = useRef<HTMLButtonElement>(null)
  const wasFull = useRef(false)

  // Leaving full screen remounts the inline view; give its toggle button focus back.
  useEffect(() => {
    if (wasFull.current && !full) toggle.current?.focus()
    wasFull.current = full
  }, [full])

  const zoom = (d: number) => setScale((s) => clampZoom((s ?? 1) + d))
  const onFit = useCallback((z: number) => setScale(z), [])
  const hasLinks = graph.links.length > 0
  const hasBookmarks = graph.nodes.some((n) => n.ref.kind === "bookmark")

  const enterFull = () => {
    // Hold the band's height while the graph lives in the top layer, so the page doesn't jump.
    setPlaceholder(shell.current?.offsetHeight ?? 0)
    setFull(true)
  }

  const seg = (m: Mode, label: string) => {
    const on = mode === m
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => setMode(m)}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-sm font-medium transition-colors",
          on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          FOCUS_FLAT,
        )}
      >
        {ico(I[m])}
        {label}
      </button>
    )
  }

  const view = { graph, itemKey, full, hot, setHot }
  const body = (
    <div
      ref={shell}
      data-graph-shell
      className={cn("text-card-foreground", full ? "flex size-full flex-col bg-card" : "overflow-hidden rounded-2xl border border-border bg-card")}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        {full ? <p className="mr-1 min-w-0 truncate text-sm font-medium">{graph.name}</p> : null}
        <span className="inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="View">
          {seg("board", "Board")}
          {seg("canvas", "Canvas")}
        </span>
        <span className="ml-auto flex items-center gap-2">
          {hasLinks || hasBookmarks ? (
            <span className="hidden items-center gap-3 text-xs text-muted-foreground xl:flex">
              {hasBookmarks ? (
                <>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="text-primary">{ico(I.check, "size-3.5", 2.4)}</span>
                    Read
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full border border-muted-foreground/50" aria-hidden="true" />
                    Unread
                  </span>
                </>
              ) : null}
              {hasLinks ? (
                <span className="inline-flex items-center gap-1.5">
                  {ico(I.arrow, "size-3.5")}
                  Read before
                </span>
              ) : null}
            </span>
          ) : null}
          {mode === "canvas" ? (
            <span className="flex items-center rounded-md border border-border">
              <button type="button" aria-label="Zoom out" onClick={() => zoom(-ZOOM_STEP)} className={TOOL}>
                {ico(I.minus)}
              </button>
              <span className="w-11 text-center text-xs tabular-nums text-muted-foreground" aria-live="polite">
                {Math.round((scale ?? 1) * 100)}%
              </span>
              <button type="button" aria-label="Zoom in" onClick={() => zoom(ZOOM_STEP)} className={TOOL}>
                {ico(I.plus)}
              </button>
            </span>
          ) : null}
          <button
            ref={toggle}
            type="button"
            aria-label={full ? "Exit full screen" : "Full screen"}
            onClick={full ? () => dialog.current?.close() : enterFull}
            className={TOOL}
          >
            {ico(full ? I.shrink : I.expand)}
          </button>
        </span>
      </div>
      {mode === "board" ? <Board {...view} /> : <Canvas {...view} scale={scale} onFit={onFit} />}
    </div>
  )

  if (!full) return body
  return (
    <>
      <div style={{ height: placeholder }} aria-hidden="true" />
      <Modal dialogRef={dialog} initialFocus={toggle} onClose={() => setFull(false)} aria-label={graph.name}>
        {body}
      </Modal>
    </>
  )
}
