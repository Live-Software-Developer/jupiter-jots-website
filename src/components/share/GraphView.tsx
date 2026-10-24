"use client"

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { plural } from "@/lib/share/format"
import { bandOf, boardColumns, canvasBounds, computePath, NODE_W, type Box } from "@/lib/share/graph"
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
  fit: (
    <>
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
      <circle cx="12" cy="12" r="2.5" />
    </>
  ),
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
    <marker id={id} viewBox="0 0 8 8" refX="8" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
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
        <div ref={surface} className="relative flex min-h-[28rem] w-max min-w-full items-stretch gap-3 p-3 sm:min-h-[34rem]">
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
              <ol className="flex flex-1 flex-col gap-4">
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

/** Kept for callers: the padded, normalised canvas rectangle. */
export const canvasSize = canvasBounds

interface ViewState {
  x: number
  y: number
  z: number
}

const START_VIEW: ViewState = { x: 0, y: 0, z: 1 }
const FIT_PAD = 24

function Canvas({ graph, itemKey, full, hot, setHot }: ViewProps) {
  const { surface, wires } = useWires(graph)
  const pane = useRef<HTMLDivElement>(null)
  // Nodes can have negative x/y (dragged left or up in the app). Normalise them so the whole
  // graph lives in a positive rectangle; otherwise the first columns are cropped and cannot be
  // reached by scrolling.
  const { x: bx, y: by, w, h } = useMemo(() => canvasBounds(graph), [graph])
  const [view, setView] = useState<ViewState | null>(null)
  const shown = view ?? START_VIEW
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ id: number; x: number; y: number; ox: number; oy: number } | null>(null)
  const bands = bandOf(graph)
  const stepIndex = new Map(graph.steps.map((s, i) => [s.id, i]))

  /** Fit the whole graph (not just its width) into the pane and centre it. */
  const fit = useCallback(() => {
    const el = pane.current
    if (!el) return
    const pw = el.clientWidth
    const ph = el.clientHeight
    if (pw <= 0 || ph <= 0) return
    const z = clampZoom(Math.min(1, (pw - FIT_PAD * 2) / w, (ph - FIT_PAD * 2) / h))
    setView({ z, x: Math.round((pw - w * z) / 2), y: Math.round((ph - h * z) / 2) })
  }, [w, h])

  useLayoutEffect(() => {
    fit()
  }, [fit])

  const zoomBy = (delta: number) => {
    setView((current) => {
      const base = current ?? START_VIEW
      const z = clampZoom(base.z + delta)
      if (z === base.z) return base
      const el = pane.current
      const cx = (el?.clientWidth ?? 0) / 2
      const cy = (el?.clientHeight ?? 0) / 2
      const k = z / base.z
      return { z, x: cx - (cx - base.x) * k, y: cy - (cy - base.y) * k }
    })
  }

  const startPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest("a, button, [data-gid], [data-canvas-controls]")) return
    const v = view ?? START_VIEW
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: v.x, oy: v.y }
    setDragging(true)
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Pointer capture is best effort; moves still arrive while the pointer is over the pane.
    }
    e.preventDefault()
  }

  const movePan = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    setView((current) => ({
      ...(current ?? START_VIEW),
      x: d.ox + e.clientX - d.x,
      y: d.oy + e.clientY - d.y,
    }))
  }

  const endPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (drag.current?.id !== e.pointerId) return
    drag.current = null
    setDragging(false)
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // Already released.
    }
  }

  return (
    <div
      ref={pane}
      role="region"
      aria-label={`${graph.name} canvas`}
      tabIndex={0}
      onPointerDown={startPan}
      onPointerMove={movePan}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      className={cn(
        "relative touch-none overflow-hidden bg-muted/20 bg-[radial-gradient(circle,var(--border)_0.0625rem,transparent_0.0625rem)] [background-size:1.25rem_1.25rem]",
        full ? "min-h-0 flex-1" : "h-[28rem] sm:h-[34rem]",
        dragging ? "cursor-grabbing" : "cursor-grab",
        FOCUS_FLAT,
      )}
    >
      <div
        ref={surface}
        data-surface
        className="absolute top-0 left-0 origin-top-left select-none"
        style={{ width: w, height: h, transform: `translate(${shown.x}px, ${shown.y}px) scale(${shown.z})` }}
      >
        {bands.map((band) => {
          const i = stepIndex.get(band.stepId) ?? 0
          return (
            <div
              key={band.stepId}
              className="absolute top-3 bottom-3 rounded-2xl border border-dashed border-border/70 bg-muted/25"
              style={{ left: band.x0 - bx, width: band.x1 - band.x0 }}
            >
              <span className="absolute top-2.5 left-3 text-xs text-muted-foreground">
                <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span> · {graph.steps[i]?.label}
              </span>
            </div>
          )
        })}
        <Wires wires={wires} hot={hot} />
        {graph.nodes.map((n) => (
          <div key={n.id} data-gid={n.id} className="absolute" style={{ left: n.x - bx, top: n.y - by, width: NODE_W }} {...hotProps(n.id, setHot)}>
            <NodeCard node={n} itemKey={itemKey} graphName={graph.name} />
          </div>
        ))}
      </div>
      <CanvasControls z={shown.z} onZoom={zoomBy} onFit={fit} />
    </div>
  )
}

const CANVAS_CONTROL = cn("grid size-8 place-items-center border-b border-border text-muted-foreground transition-colors last:border-b-0 hover:bg-accent hover:text-foreground", FOCUS_FLAT)

/** Canvas zoom and fit controls, bottom-left like the app's canvas. */
function CanvasControls({ z, onZoom, onFit }: { z: number; onZoom(delta: number): void; onFit(): void }) {
  return (
    <div
      data-canvas-controls
      role="group"
      aria-label="Canvas controls"
      className="absolute bottom-3 left-3 z-10 flex flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <span className="border-b border-border px-2 py-1 text-center text-[11px] leading-4 tabular-nums text-muted-foreground" aria-live="polite">
        {Math.round(z * 100)}%
      </span>
      <button type="button" aria-label="Zoom in" title="Zoom in" onClick={() => onZoom(ZOOM_STEP)} className={CANVAS_CONTROL}>
        {ico(I.plus)}
      </button>
      <button type="button" aria-label="Zoom out" title="Zoom out" onClick={() => onZoom(-ZOOM_STEP)} className={CANVAS_CONTROL}>
        {ico(I.minus)}
      </button>
      <button type="button" aria-label="Fit view" title="Fit view" onClick={onFit} className={CANVAS_CONTROL}>
        {ico(I.fit)}
      </button>
    </div>
  )
}

const TOOL = cn("grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground", FOCUS_FLAT)

/**
 * A shared graph, read-only: Board/Canvas toggle (starting at the graph's own mode), a canvas that
 * fits and centres itself with drag-to-pan and on-canvas zoom/fit controls, full screen in a native
 * modal dialog (Esc leaves it), wires that light up on hover, collection and note nodes that open
 * their sheet (`<itemKey>/n:<nodeId>`) and bookmark nodes that open in a new tab.
 */
export function GraphView({ graph, itemKey }: { graph: PGraph; itemKey: string }) {
  const [mode, setMode] = useState<Mode>(graph.mode === "canvas" ? "canvas" : "board")
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
      {mode === "board" ? <Board {...view} /> : <Canvas {...view} />}
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
