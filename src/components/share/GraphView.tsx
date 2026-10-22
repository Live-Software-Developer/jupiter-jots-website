import { cn } from "@/lib/utils"
import { boardColumns } from "@/lib/share/graph"
import { plural } from "@/lib/share/format"
import type { PGraph, PGraphNode } from "@/lib/share/types"

import { BookmarkLink, HUE_TINT, hueFor, initialOf } from "./BookmarkRow"

// Interim static board: one column per step, cards in order, no wires or canvas.
// Task 4 replaces this file with the interactive GraphView (Board/Canvas, wires, sheet).

function NodeCard({ node }: { node: PGraphNode }) {
  const card = "flex items-start gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground"
  if (node.ref.kind === "collection") {
    const c = node.ref.collection
    return (
      <div className={card}>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold", HUE_TINT[(c.hue - 1) % 5])} aria-hidden="true">
          {c.bookmarks.length}
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium break-words">{c.name}</span>
          <span className="block text-xs text-muted-foreground">Collection · {plural(c.bookmarks.length, "bookmark")}</span>
        </span>
      </div>
    )
  }
  const b = node.ref.bookmark
  return (
    <BookmarkLink url={b.url} className={cn(card, "transition-colors hover:border-foreground/25")}>
      <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg text-xs font-semibold", hueFor(b.domain))} aria-hidden="true">
        {initialOf(b.domain)}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium break-words">{b.title || b.domain}</span>
        <span className="block text-xs text-muted-foreground">{b.domain}</span>
      </span>
    </BookmarkLink>
  )
}

export function GraphView({ graph }: { graph: PGraph }) {
  const byId = new Map(graph.nodes.map((n) => [n.id, n]))
  const columns = boardColumns(graph)
  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto rounded-2xl border border-border bg-muted/30 p-3 sm:p-4">
      {columns.map((col) => (
        <div key={col.key} className="w-64 shrink-0 snap-start">
          <p className="px-1 text-xs font-medium text-muted-foreground">
            {col.label} <span className="tabular-nums">· {col.nodeIds.length}</span>
          </p>
          <ul className="mt-2 space-y-2">
            {col.nodeIds.map((id) => {
              const node = byId.get(id)
              return node ? (
                <li key={id}>
                  <NodeCard node={node} />
                </li>
              ) : null
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}
