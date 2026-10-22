"use client"

import { useState } from "react"

import { ShareBookmarkRow } from "@/components/share/Share"
import { FOCUS_FLAT } from "@/components/site/styles"
import { cn } from "@/lib/utils"
import type { SharedBookmark } from "@/lib/share"

export function ShareCollectionList({ bookmarks }: { bookmarks: SharedBookmark[] }) {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? bookmarks : bookmarks.slice(0, 5)
  const hidden = bookmarks.length - visible.length

  return (
    <section className="mt-10 overflow-hidden rounded-2xl border border-border bg-card" aria-labelledby="collection-list">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <h2 id="collection-list" className="text-sm font-medium">
          In this collection
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">{bookmarks.length} bookmarks</span>
      </div>
      <div className="divide-y divide-border">
        {visible.map((bookmark) => (
          <ShareBookmarkRow key={bookmark.href} bookmark={bookmark} />
        ))}
      </div>
      {hidden > 0 || expanded ? (
        <div className="border-t border-border px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={cn(
              "rounded text-sm font-medium text-primary underline-offset-4 hover:underline",
              FOCUS_FLAT,
            )}
          >
            {expanded ? "Show fewer bookmarks" : `Show all ${bookmarks.length} bookmarks`}
          </button>
        </div>
      ) : null}
    </section>
  )
}
