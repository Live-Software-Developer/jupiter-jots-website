import Link from "next/link"
import type { ReactNode } from "react"

import { BrandLogo } from "@/components/site/BrandLogo"
import { FOCUS, FOCUS_FLAT } from "@/components/site/styles"
import { cn } from "@/lib/utils"

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

export function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4" aria-hidden="true">
      <path d="M12 5.5v13M5.5 12h13" />
    </svg>
  )
}
