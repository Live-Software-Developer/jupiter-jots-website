"use client"

import { useEffect, useState } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { getShareCard } from "@/lib/share/api"
import type { ApiResult, ShareCard } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { GLYPH, ico } from "./icons"

const BOX = "my-1 flex w-full max-w-md min-w-0 items-start gap-3 rounded-xl border border-border bg-card p-3 text-card-foreground"

const UNAVAILABLE: Record<string, string> = {
  gone: "This share is no longer available",
  removed: "This share was removed",
  missing: "This share doesn’t exist",
}

/**
 * A share link written on its own line in a comment (see `renderMarkdown`'s `shareLinks`): a
 * card with the share's kind, title and curator that opens `/s/<slug>`. Fetched on the client
 * through the cached `getShareCard`; private shares show only what their lock screen shows.
 */
export function ShareEmbedCard({ slug }: { slug: string }) {
  const [loaded, setLoaded] = useState<{ slug: string; res: ApiResult<ShareCard> } | null>(null)
  useEffect(() => {
    let live = true
    getShareCard(slug).then((res) => {
      if (live) setLoaded({ slug, res })
    })
    return () => {
      live = false
    }
  }, [slug])

  const href = `/s/${encodeURIComponent(slug)}`
  const res = loaded?.slug === slug ? loaded.res : null

  if (!res)
    return (
      <div role="status" className={BOX} data-share-embed={slug}>
        <span className="sr-only">Loading shared link</span>
        <span className="size-9 shrink-0 animate-pulse rounded-lg bg-muted" aria-hidden="true" />
        <span className="flex min-w-0 flex-1 flex-col gap-2 pt-0.5" aria-hidden="true">
          <span className="h-3 w-24 animate-pulse rounded bg-muted" />
          <span className="h-4 w-4/5 animate-pulse rounded bg-muted" />
          <span className="h-3 w-1/3 animate-pulse rounded bg-muted" />
        </span>
      </div>
    )

  const card = res.ok ? res.data : null
  if (!card || card.status !== "ok") {
    const reason = card?.status ?? (!res.ok && res.status === 404 ? "missing" : null)
    return (
      <div className={cn(BOX, "items-center text-muted-foreground")} data-share-embed={slug}>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted" aria-hidden="true">
          {ico(GLYPH.eyeOff, "size-4")}
        </span>
        {reason ? (
          <p className="min-w-0 text-sm">{UNAVAILABLE[reason]}</p>
        ) : (
          <p className="min-w-0 text-sm">
            Couldn’t load this share.{" "}
            <a href={href} className={cn("rounded font-medium text-primary underline-offset-4 hover:underline", FOCUS_FLAT)}>
              Open it
            </a>
          </p>
        )}
      </div>
    )
  }

  const priv = card.visibility === "private"
  return (
    <a href={href} className={cn(BOX, "transition-colors hover:bg-muted/60", FOCUS_FLAT)} data-share-embed={slug}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
        {ico(priv ? GLYPH.lock : GLYPH.folder, "size-4")}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs text-muted-foreground">
          {priv ? "Private share · needs a password" : card.summary || "Shared on Jupiter Jots"}
        </span>
        <span className="line-clamp-2 text-sm font-medium break-words text-foreground">{card.title}</span>
        {card.curator_name ? <span className="truncate text-xs text-muted-foreground">Curated by {card.curator_name}</span> : null}
      </span>
      <span className="shrink-0 self-center text-muted-foreground">{ico(GLYPH.chevronRight, "size-4")}</span>
    </a>
  )
}
