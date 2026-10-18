"use client"

import { useEffect, useState } from "react"

import { ChevronDownIcon } from "@/components/site/icons"
import { cn } from "@/lib/utils"

export interface TocItem {
  id: string
  label: string
}

const LINK =
  "block rounded-sm border-l-2 py-1.5 pr-2 pl-4 -ml-px text-sm leading-snug transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
const IDLE = "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
const ON = "border-primary text-foreground font-medium"

/**
 * The design's <site-toc>. Desktop (lg+): a sticky list that marks the section in view.
 * Phones: a collapsible block above the article that closes after a jump.
 */
export function Toc({ items, title = "On this page", className }: { items: TocItem[]; title?: string; className?: string }) {
  const [active, setActive] = useState(items[0]?.id)

  useEffect(() => {
    const targets = items.map((it) => document.getElementById(it.id)).filter((t): t is HTMLElement => t !== null)
    if (!targets.length || !("IntersectionObserver" in window)) return
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting))
        const first = targets.find((t) => seen.get(t.id))
        if (first) setActive(first.id)
      },
      { rootMargin: "-96px 0px -55% 0px" },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [items])

  const list = () => (
    <ol className="border-l border-border">
      {items.map((it) => {
        const on = it.id === active
        return (
          <li key={it.id}>
            <a href={`#${it.id}`} aria-current={on ? "true" : undefined} className={cn(LINK, on ? ON : IDLE)}>
              {it.label}
            </a>
          </li>
        )
      })}
    </ol>
  )

  return (
    <div className={cn("block lg:sticky lg:top-24 lg:self-start", className)}>
      <details className="group rounded-xl border border-border bg-card lg:hidden">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&::-webkit-details-marker]:hidden">
          {title}
          <ChevronDownIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-180 motion-reduce:transition-none" />
        </summary>
        <nav
          aria-label={title}
          className="px-4 pb-3"
          onClick={(e) => {
            // Collapse the phone list after a jump.
            const d = e.currentTarget.closest("details")
            if (d && (e.target as HTMLElement).closest("a")) d.open = false
          }}
        >
          {list()}
        </nav>
      </details>
      <nav className="hidden lg:block" aria-label={title}>
        <p className="mb-3 text-sm font-medium text-foreground">{title}</p>
        {list()}
      </nav>
    </div>
  )
}
