import Link from "next/link"

import { FOCUS_FLAT } from "@/components/site/styles"
import { formatDate } from "@/lib/share/format"
import type { PublicShare } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { type Band, type BandKind, bandTitle } from "./ShareBand"

const DOT: Record<BandKind | "share", string> = {
  share: "bg-foreground/60",
  graph: "bg-chart-1",
  collection: "bg-chart-5",
  bookmark: "bg-chart-2",
  bookmarks: "bg-chart-2",
}

/**
 * Aside next to the discussion (design: share-sidebar): comments per item, then the share's
 * details. `counts` maps a payload key ("" for the whole share) to its comment count; until
 * the discussion supplies it the rows show no numbers.
 */
export function ShareSidebar({
  share,
  bands,
  counts,
  active = "",
}: {
  share: PublicShare
  bands: Band[]
  counts?: Record<string, number>
  active?: string
}) {
  const rows: { key: string; kind: BandKind | "share"; label: string; count?: number }[] = [
    { key: "*", kind: "share", label: "Everything", count: counts ? share.comment_count : undefined },
    { key: "", kind: "share", label: "The whole share", count: counts?.[""] },
    ...bands.map((b) => ({ key: b.key, kind: b.kind, label: bandTitle(b), count: counts?.[b.key] })),
  ]
  const shared = formatDate(share.created_at)
  const expires = formatDate(share.expires_at)

  return (
    <div className="space-y-4 lg:sticky lg:top-20">
      <div className="rounded-2xl border border-border bg-card p-2 text-card-foreground">
        <p className="px-2.5 pt-2 pb-1.5 text-xs font-medium text-muted-foreground">Comments by item</p>
        <ul>
          {rows.map((row) => {
            const on = row.key === (active || "*")
            return (
              <li key={row.key}>
                <a
                  href="#discussion"
                  aria-current={on}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
                    on ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    FOCUS_FLAT,
                  )}
                >
                  <span className={cn("size-1.5 shrink-0 rounded-full", DOT[row.kind])} aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{row.label}</span>
                  {row.count !== undefined ? <span className="text-xs tabular-nums">{row.count}</span> : null}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
      <dl className="space-y-2 rounded-2xl border border-border p-4 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Visibility</dt>
          <dd className="text-right">{share.visibility === "private" ? "Private link" : "Public link"}</dd>
        </div>
        {shared ? (
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">Shared</dt>
            <dd className="text-right">{shared}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Expires</dt>
          <dd className="text-right">{expires || "Never"}</dd>
        </div>
        <div className="border-t border-border pt-2.5">
          <Link href="/support" className={cn("rounded text-muted-foreground underline-offset-4 hover:text-foreground hover:underline", FOCUS_FLAT)}>
            Report this share
          </Link>
        </div>
      </dl>
    </div>
  )
}
