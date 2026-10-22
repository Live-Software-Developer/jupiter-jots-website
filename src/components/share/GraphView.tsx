"use client"

import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { bandOf, boardColumns, computePath, NODE_W, type Box } from "@/lib/share/graph"
import type { PGraph, PGraphNode } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { BookmarkLink, hueFor, initialOf } from "./BookmarkRow"
import { collectionTint, useCollectionSheet } from "./CollectionSheet"

// Read-only port of the extension's graph view (design: graph-view). Board and Canvas show the
// same nodes; Canvas places them at their saved x/y and zooms with a CSS transform.

type Mode = PGraph["mode"]
interface Wire {
  key: string
  from: string
  to: string
  d: string
}

const ZOOM_MIN = 0.5
const ZOOM_MAX = 1.5
const ZOOM_STEP = 0.1

const ico = (d: ReactNode, className = "size-4", strokeWidth = 1.7) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {d}
  </svg>
)

const I = {
  board: (
    <>
      <rect x="3.5" y="4" width="5" height="16" rx="1.5" />
      <rect x="9.5" y="4" width="5" height="11" rx="1.5" />
      <rect x="15.5" y="4" width="5" height="13" rx="1.5" />
    </>
  ),
  canvas: (
    <>
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="13" cy="18" r="2.5" />
      <path d="M8.4 7.6 15.6 6.4M7.6 9 11.6 16M17 8.4 14.2 15.8" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  shrink: <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  folder: <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />,
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

function NodeCard({ node, itemKey }: { node: PGraphNode; itemKey: string }) {
  const { open } = useCollectionSheet()
  if (node.ref.kind === "collection") {
    const c = node.ref.collection
    return (
      <div className="relative pb-3">
        <span className="pointer-events-none absolute inset-x-2 -bottom-1.5 h-3 rounded-b-xl border border-t-0 border-border bg-card/70" aria-hidden="true" />
        <span className="pointer-events-none absolute inset-x-4 -bottom-3 h-3 rounded-b-xl border border-t-0 border-border bg-card/40" aria-hidden="true" />
        <button type="button" aria-haspopup="dialog" onClick={() => open(`${itemKey}/n:${node.id}`)} className={cn(CARD, FOCUS_FLAT)}>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className={cn("grid size-5 shrink-0 place-items-center rounded", collectionTint(c.hue))} aria-hidden="true">
              {ico(I.folder, "size-3")}
            </span>
            <span className="min-w-0 truncate">Collection</span>
          </span>
          <span className="mt-1.5 block text-sm leading-snug font-medium break-words text-pretty text-card-foreground">{c.name}</span>
          {c.note ? <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{c.note}</span> : null}
          <span className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {ico(I.folder, "size-3.5")}
              {c.bookmarks.length} {c.bookmarks.length === 1 ? "link" : "links"}
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
        <span className={cn("grid size-5 shrink-0 place-items-center rounded text-xs font-semibold", hueFor(b.domain))} aria-hidden="true">
          {initialOf(b.domain)}
        </span>
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
      {b.note ? <span className="mt-1 line-clamp-2 block text-xs leading-relaxed text-muted-foreground">{b.note}</span> : null}
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

function Wires({ wires, hot }: { wires: Wire[]; hot: string | null }) {
  const mk = `${useId().replace(/[^a-z0-9]/gi, "")}-tip`
  return (
    <svg className="pointer-events-none absolute inset-0 size-full overflow-visible text-muted-foreground/60" aria-hidden="true" data-wires>
      <defs>
        <marker id={mk} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0L8 4L0 8Z" fill="context-stroke" />
        </marker>
      </defs>
      {wires.map((w) => {
        const on = hot !== null && (w.from === hot || w.to === hot)
        return (
          <path
            key={w.key}
            d={w.d}
            className={cn("transition-colors", on ? "text-primary" : "opacity-70")}
            stroke="currentColor"
            strokeWidth={1.5}
            fill="none"
            strokeLinecap="round"
            markerEnd={`url(#${mk})`}
          />
        )
      })}
    </svg>
  )
}

/** Wires between the surface's `[data-gid]` cards, re-measured whenever the surface resizes. */
function useWires(graph: PGraph, deps: unknown[]) {
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
    return () => {
      live = false
      ro.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [redraw, ...deps])

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
  const { surface, wires } = useWires(graph, [full])

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
                      <NodeCard node={node} itemKey={itemKey} />
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

function Canvas({ graph, itemKey, full, hot, setHot, scale }: ViewProps & { scale: number }) {
  const { surface, wires } = useWires(graph, [full])
  const w = Math.max(1100, ...graph.nodes.map((n) => n.x + NODE_W + 80))
  const h = Math.max(520, ...graph.nodes.map((n) => n.y + 220))
  const bands = bandOf(graph)
  const stepIndex = new Map(graph.steps.map((s, i) => [s.id, i]))

  return (
    <div
      className={cn(
        "overflow-auto overscroll-contain bg-muted/20 bg-[radial-gradient(circle,var(--border)_0.0625rem,transparent_0.0625rem)] [background-size:1.25rem_1.25rem] [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]",
        full ? "min-h-0 flex-1" : "h-[28rem] sm:h-[34rem]",
      )}
    >
      <div style={{ width: w * scale, height: h * scale }}>
        <div ref={surface} data-surface className="relative origin-top-left" style={{ width: w, height: h, transform: `scale(${scale})` }}>
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
            <div key={n.id} data-node={n.id} data-gid={n.id} className="absolute" style={{ left: n.x, top: n.y, width: NODE_W }} {...hotProps(n.id, setHot)}>
              <NodeCard node={n} itemKey={itemKey} />
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
 * canvas, full screen (Esc leaves it), wires that light up on hover, collection nodes that open
 * their sheet (`<itemKey>/n:<nodeId>`) and bookmark nodes that open in a new tab.
 */
export function GraphView({ graph, itemKey }: { graph: PGraph; itemKey: string }) {
  const [mode, setMode] = useState<Mode>(graph.mode === "canvas" ? "canvas" : "board")
  const [scale, setScale] = useState(1)
  const [full, setFull] = useState(false)
  const [hot, setHot] = useState<string | null>(null)

  useEffect(() => {
    if (!full) return
    const root = document.documentElement
    const overflow = root.style.overflow
    root.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) setFull(false)
    }
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("keydown", onKey)
      root.style.overflow = overflow
    }
  }, [full])

  const zoom = (d: number) => setScale((s) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, +(s + d).toFixed(2))))
  const hasLinks = graph.links.length > 0
  const hasBookmarks = graph.nodes.some((n) => n.ref.kind === "bookmark")

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
  return (
    <div
      data-graph-shell
      className={cn(
        "text-card-foreground",
        full ? "fixed inset-0 z-50 flex flex-col bg-card" : "overflow-hidden rounded-2xl border border-border bg-card",
      )}
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
                {Math.round(scale * 100)}%
              </span>
              <button type="button" aria-label="Zoom in" onClick={() => zoom(ZOOM_STEP)} className={TOOL}>
                {ico(I.plus)}
              </button>
            </span>
          ) : null}
          <button type="button" aria-label={full ? "Exit full screen" : "Full screen"} onClick={() => setFull((f) => !f)} className={TOOL}>
            {ico(full ? I.shrink : I.expand)}
          </button>
        </span>
      </div>
      {mode === "board" ? <Board {...view} /> : <Canvas {...view} scale={scale} />}
    </div>
  )
}
