import Link from "next/link"
import type { ReactNode } from "react"

import { BrandLogo } from "@/components/site/BrandLogo"
import { FOCUS, FOCUS_FLAT } from "@/components/site/styles"
import { cn } from "@/lib/utils"
import type { ShareHue, SharedBookmark } from "@/lib/share"

type Tone = "public" | "private" | "unlocked"

const BADGE_ICON: Record<Tone, ReactNode> = {
  public: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 text-muted-foreground"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
    </svg>
  ),
  private: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 text-chart-3"
      aria-hidden="true"
    >
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </svg>
  ),
  unlocked: (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 text-chart-5"
      aria-hidden="true"
    >
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.7-1.4" />
    </svg>
  ),
}

const BADGE_TONE: Record<Tone, { cls: string; label: string }> = {
  public: { cls: "border-border bg-muted text-foreground", label: "Public link" },
  private: { cls: "border-border bg-muted text-foreground", label: "Private link" },
  unlocked: { cls: "border-chart-5/30 bg-chart-5/10 text-foreground", label: "Private · unlocked" },
}

export function ShareBadge({ tone = "public", label }: { tone?: Tone; label?: string }) {
  const style = BADGE_TONE[tone]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium", style.cls)}>
      {BADGE_ICON[tone]}
      {label ?? style.label}
    </span>
  )
}

export function ShareTopbar() {
  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className={cn("-ml-1 flex shrink-0 items-center gap-2.5 rounded-lg p-1", FOCUS)} aria-label="Jupiter Jots home">
          <BrandLogo className="size-8" />
          <span className="text-lg leading-none font-semibold tracking-tight whitespace-nowrap">Jupiter Jots</span>
        </Link>
        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
        <span className="hidden text-sm text-muted-foreground sm:block">Shared page</span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/#get"
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90",
              FOCUS,
            )}
          >
            <PlusIcon />
            Add to Chrome
          </Link>
        </div>
      </div>
    </div>
  )
}

export function ShareFooter() {
  const link = cn("rounded text-sm text-muted-foreground transition-colors hover:text-foreground", FOCUS_FLAT)
  return (
    <footer className="border-t border-border bg-sidebar font-sans text-sidebar-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:px-6">
        <Link href="/" className={cn("flex items-center gap-2 rounded-lg", FOCUS)} aria-label="Jupiter Jots home">
          <BrandLogo className="size-6" />
          <span className="text-sm font-medium">Shared with Jupiter Jots</span>
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:ml-auto">
          <Link href="/" className={link}>
            Features
          </Link>
          <Link href="/privacy" className={link}>
            Privacy
          </Link>
          <Link href="/support" className={link}>
            Support
          </Link>
          <Link href="/#get" className={cn("rounded text-sm font-medium text-foreground underline-offset-4 hover:underline", FOCUS)}>
            Get the extension
          </Link>
        </nav>
      </div>
    </footer>
  )
}

const HUES: Record<ShareHue, string> = {
  violet: "bg-chart-1/15 text-chart-1",
  cyan: "bg-chart-2/15 text-chart-2",
  amber: "bg-chart-3/15 text-chart-3",
  rose: "bg-chart-4/15 text-chart-4",
  sage: "bg-chart-5/15 text-chart-5",
}

export function ShareBookmarkRow({ bookmark }: { bookmark: SharedBookmark }) {
  const initial = (bookmark.domain.replace(/^www\./, "")[0] || "?").toUpperCase()
  const external = /^https?:/i.test(bookmark.href)
  return (
    <a
      href={bookmark.href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener" : undefined}
      className="group flex items-start gap-3.5 px-4 py-4 transition-colors hover:bg-accent/40 focus-visible:bg-accent/40 focus-visible:outline-none sm:gap-4 sm:px-5"
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-semibold", HUES[bookmark.hue])} aria-hidden="true">
        {initial}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">{bookmark.title}</span>
          <span className="text-xs text-muted-foreground">{bookmark.domain}</span>
          <span className="ml-auto shrink-0 text-xs tabular-nums text-muted-foreground">{bookmark.meta}</span>
        </span>
        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">{bookmark.note}</span>
        {bookmark.tags.length > 0 ? (
          <span className="mt-2 flex flex-wrap gap-1">
            {bookmark.tags.map((tag) => (
              <span key={tag} className="rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                #{tag}
              </span>
            ))}
          </span>
        ) : null}
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mt-1.5 size-4 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground"
        aria-hidden="true"
      >
        <path d="M7 17 17 7M9 7h8v8" />
      </svg>
    </a>
  )
}

export function ShareCurator({
  name,
  role,
  initials,
  note,
}: {
  name: string
  role?: string
  initials: string
  note?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary" aria-hidden="true">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          {role ? <p className="truncate text-xs text-muted-foreground">{role}</p> : null}
        </div>
      </div>
      {note ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{note}</p> : null}
    </div>
  )
}

export function ShareCta({
  title = "Keep this collection",
  body = "Save shared collections and bookmarks to your own library. Free in Chrome, and everything stays on your device.",
}: {
  title?: string
  body?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <div className="flex items-center gap-2.5">
        <BrandLogo className="size-8" />
        <span className="text-sm font-medium">Jupiter Jots</span>
      </div>
      <h2 className="mt-4 text-base font-medium">{title}</h2>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Link
        href="/#get"
        className={cn(
          "mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
          FOCUS,
        )}
      >
        <PlusIcon />
        Add to Chrome
      </Link>
      <p className="mt-2 text-center text-xs text-muted-foreground">Free. No account needed.</p>
    </div>
  )
}

export function ShareDetails({
  rows,
  reportHref = "/support",
  reportLabel = "Report this share",
}: {
  rows: Array<{ label: string; value: ReactNode }>
  reportHref?: string
  reportLabel?: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground">
      <h2 className="text-sm font-medium">Share details</h2>
      <dl className="mt-3 space-y-2.5 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{row.label}</dt>
            <dd className="text-right">{row.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-4 border-t border-border pt-3">
        <Link href={reportHref} className={cn("rounded text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline", FOCUS_FLAT)}>
          {reportLabel}
        </Link>
      </div>
    </div>
  )
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4" aria-hidden="true">
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  )
}
