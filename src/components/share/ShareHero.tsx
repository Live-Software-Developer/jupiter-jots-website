import Link from "next/link"
import type { ReactNode } from "react"

import { CopyLinkButton } from "@/components/share/CopyLinkButton"
import { PlusIcon } from "@/components/site/icons"
import { FOCUS } from "@/components/site/styles"
import { formatDate, initialsOf } from "@/lib/share/format"
import { MARKDOWN_CLASS, renderMarkdown } from "@/lib/share/markdown"
import type { PublicShare, SharePayload } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { GLYPH, ico, LockIcon } from "./icons"
import { BAND_KIND, bandIcon, bandId, bandSize, bandTitle, toBands } from "./ShareBand"

/**
 * Header for every share (design: share-hero), with the "In this share" index once there are 2+ bands.
 * `action` sits next to the badge (an unlocked private share's "Lock again").
 */
export function ShareHero({ share, payload, action }: { share: PublicShare; payload: SharePayload; action?: ReactNode }) {
  const priv = share.visibility === "private"
  const bands = toBands(payload.items)
  const curator = payload.curator.name || share.curator_name
  const updated = formatDate(share.updated_at)
  const expires = formatDate(share.expires_at)

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pt-8 pb-10 sm:px-6 sm:pt-12 lg:pt-16">
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium",
                priv ? "text-chart-3" : "text-muted-foreground",
              )}
            >
              {priv ? <LockIcon className="size-3.5" /> : ico(GLYPH.globe, "size-3.5")}
              {priv ? "Private · unlocked" : "Public link"}
            </span>
            {action}
          </div>
          <h1 className="mt-5 font-serif text-4xl leading-[1.05] font-normal tracking-tight break-words text-balance sm:text-5xl lg:text-6xl">
            {payload.title || share.title}
          </h1>
          {payload.intro ? (
            <div className={cn(MARKDOWN_CLASS, "mt-4 max-w-2xl space-y-3 text-lg leading-relaxed text-pretty text-muted-foreground")}>
              {renderMarkdown(payload.intro)}
            </div>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            {curator ? (
              <>
                <span className="flex items-center gap-2.5">
                  <span className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
                    {initialsOf(curator)}
                  </span>
                  <span className="text-sm font-medium">{curator}</span>
                </span>
                <span className="hidden h-8 w-px bg-border sm:block" aria-hidden="true" />
              </>
            ) : null}
            <span className="text-xs leading-relaxed text-muted-foreground">
              {updated ? (
                <>
                  Updated {updated}
                  <br className="hidden sm:block" />
                  <span className="sm:hidden"> · </span>
                </>
              ) : null}
              {expires ? `Expires ${expires}` : "Never expires"}
            </span>
          </div>
        </div>
        <div className="lg:col-span-4 lg:pt-10">
          <div className="rounded-2xl bg-primary/[0.07] p-5 ring-1 ring-primary/15">
            <p className="text-sm font-medium">Like this share?</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Make collections and graphs like this one with Jupiter Jots. Free, and your library stays on your device.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/#get"
                className={cn(
                  "inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90",
                  FOCUS,
                )}
              >
                <PlusIcon />
                Get Jupiter Jots
              </Link>
              <CopyLinkButton
                className={cn(
                  "inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent",
                  FOCUS,
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {bands.length > 1 ? (
        <nav className="mt-10" aria-labelledby="in-this-share">
          <p id="in-this-share" className="text-xs font-medium text-muted-foreground">
            In this share
          </p>
          <ol className="mt-2.5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bands.map((band, i) => {
              const kind = BAND_KIND[band.kind]
              const size = bandSize(band)
              return (
                <li key={band.key}>
                  <a
                    href={`#${bandId(band)}`}
                    className={cn(
                      "group flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 pr-3 transition-colors hover:border-foreground/25",
                      FOCUS,
                    )}
                  >
                    <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg", kind.tile)}>{bandIcon(band.kind)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{bandTitle(band)}</span>
                      <span className="block text-xs text-muted-foreground">
                        <span className="tabular-nums">{String(i + 1).padStart(2, "0")}</span> · {kind.label}
                        {size ? ` · ${size}` : ""}
                      </span>
                    </span>
                    {ico(GLYPH.arrowDown, "size-4 text-muted-foreground/60 transition-transform group-hover:translate-y-0.5")}
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>
      ) : null}
    </div>
  )
}
