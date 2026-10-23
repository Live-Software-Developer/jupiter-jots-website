import { FOCUS_FLAT } from "@/components/site/styles"
import { formatDate } from "@/lib/share/format"
import type { PublicShare } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { ItemCommentCount, ItemFilterLink } from "./Discussion"
import { ReportShare } from "./ReportShare"
import { type Band, type BandKind, bandFilterKey, bandTitle } from "./ShareBand"
import { VISIBILITY_LABEL } from "./VisibilityBadge"

const DOT: Record<BandKind | "share", string> = {
  share: "bg-foreground/60",
  graph: "bg-chart-1",
  collection: "bg-chart-5",
  bookmark: "bg-chart-2",
  bookmarks: "bg-chart-2",
  note: "bg-chart-4",
}

/**
 * Aside next to the discussion (design: share-sidebar): comments per item, then the share's
 * details. Each row sets the discussion's item filter; counts come from the discussion store.
 */
export function ShareSidebar({ share, bands }: { share: PublicShare; bands: Band[] }) {
  const rows: { filter: string | null; key: string; kind: BandKind | "share"; label: string }[] = [
    { filter: null, key: "*", kind: "share", label: "Everything" },
    { filter: "", key: "", kind: "share", label: "The whole share" },
    ...bands.map((b) => ({ filter: bandFilterKey(b), key: b.key, kind: b.kind, label: bandTitle(b) })),
  ]
  const shared = formatDate(share.created_at)
  const expires = formatDate(share.expires_at)

  return (
    <div className="space-y-4 lg:sticky lg:top-20">
      <div className="rounded-2xl border border-border bg-card p-2 text-card-foreground">
        <p className="px-2.5 pt-2 pb-1.5 text-xs font-medium text-muted-foreground">Comments by item</p>
        <ul>
          {rows.map((row) => (
            <li key={row.key}>
              <ItemFilterLink
                filter={row.filter}
                className={cn("flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors", FOCUS_FLAT)}
                activeClassName="bg-primary/10 font-medium text-primary"
                inactiveClassName="text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <span className={cn("size-1.5 shrink-0 rounded-full", DOT[row.kind])} aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate">{row.label}</span>
                <ItemCommentCount filter={row.filter} className="text-xs tabular-nums" />
              </ItemFilterLink>
            </li>
          ))}
        </ul>
      </div>
      <dl className="space-y-2 rounded-2xl border border-border p-4 text-xs">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Visibility</dt>
          <dd className="text-right">{VISIBILITY_LABEL[share.visibility]}</dd>
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
          <ReportShare slug={share.slug} />
        </div>
      </dl>
    </div>
  )
}
