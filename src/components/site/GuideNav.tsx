import Link from "next/link"

import { GuideNext } from "@/components/site/GuideNext"
import { ChevronRightIcon } from "@/components/site/icons"
import { GUIDE_STEPS } from "@/components/site/nav"
import { FOCUS, FOCUS_FLAT, textLink } from "@/components/site/styles"
import { cn } from "@/lib/utils"

type GuideHref = (typeof GUIDE_STEPS)[number]["href"]

/**
 * The guide's three pages as numbered tabs above each page's title (they are read in order),
 * the current one marked with aria-current, plus the way to the full feature list.
 */
export function GuideTabs({ current }: { current: GuideHref }) {
  return (
    <nav aria-label="Guide pages" className="flex flex-wrap items-center gap-x-6 gap-y-3">
      <ol className="flex flex-wrap gap-1.5 rounded-2xl bg-muted p-1.5 sm:rounded-full">
        {GUIDE_STEPS.map((step, i) => {
          const on = step.href === current
          return (
            <li key={step.href}>
              <Link
                href={step.href}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-full pr-4 pl-1.5 text-sm whitespace-nowrap transition-colors",
                  on ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  FOCUS,
                )}
              >
                <span
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-xs font-semibold tabular-nums",
                    on ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground",
                  )}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                {step.label}
              </Link>
            </li>
          )
        })}
      </ol>
      <Link href="/features" className={cn("inline-flex items-center gap-1 text-sm", textLink)}>
        Every feature
        <ChevronRightIcon className="size-4" />
      </Link>
    </nav>
  )
}

const CARD = cn("group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground transition-colors hover:border-primary/40 sm:p-6", FOCUS_FLAT)

/** Previous and next at the bottom of a guide page; the free slot at either end points to /features. */
export function GuidePager({ current }: { current: GuideHref }) {
  const i = GUIDE_STEPS.findIndex((s) => s.href === current)
  const prev = GUIDE_STEPS[i - 1]
  const next = GUIDE_STEPS[i + 1]
  const features = (
    <Link href="/features" className={CARD}>
      <span className="text-sm font-medium text-muted-foreground">Overview</span>
      <span className="mt-1 font-serif text-2xl leading-tight tracking-tight">Every feature</span>
      <span className="mt-2 text-sm leading-relaxed text-muted-foreground">The whole extension on one page, with links back into this guide.</span>
    </Link>
  )
  return (
    <nav aria-label="Guide pages, previous and next" className="grid gap-3 sm:grid-cols-2">
      {prev ? (
        <Link href={prev.href} rel="prev" className={CARD}>
          <span className="text-sm font-medium text-muted-foreground">Previous</span>
          <span className="mt-1 font-serif text-2xl leading-tight tracking-tight">{prev.title}</span>
          <span className="mt-2 text-sm leading-relaxed text-muted-foreground">{prev.blurb}</span>
        </Link>
      ) : (
        features
      )}
      {next ? (
        <Link href={next.href} rel="next" className={cn(CARD, "sm:items-end sm:text-right")}>
          <span className="text-sm font-medium text-primary">Next in the guide</span>
          <span className="mt-1 inline-flex items-center gap-1 font-serif text-2xl leading-tight tracking-tight">
            {next.title}
            <ChevronRightIcon className="size-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </span>
          <span className="mt-2 text-sm leading-relaxed text-muted-foreground">{next.blurb}</span>
        </Link>
      ) : (
        features
      )}
    </nav>
  )
}

/** The guide's "Beyond the basics" cards: the other two guide pages, introduced in the main guide. */
export function GuideMore() {
  return (
    <div className="mt-6 grid gap-4 md:grid-cols-2">
      <GuideNext as="h3" href="/guide/ask-jupiter" label="In the extension" title="Ask Jupiter" action="Read the Ask Jupiter guide">
        A chat that answers questions about your library, using an AI key you add. For anyone who wants help finding, summarising or tidying what
        they saved. Every change waits for Apply.
      </GuideNext>
      <GuideNext as="h3" href="/guide/agents" label="In your terminal" title="Agents in your terminal" action="Read the agents guide">
        For people who already use Claude Code or another MCP client: give it your library through a bridge on this computer. Every write waits
        for your approval.
      </GuideNext>
    </div>
  )
}
