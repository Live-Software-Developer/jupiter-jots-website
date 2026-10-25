"use client"

import { useEffect, useRef, useState } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { cn } from "@/lib/utils"

/**
 * The /features section bar: sticky under the site header at every width, one jump link per
 * section, the one in view marked with aria-current. It scrolls sideways on its own when the
 * links don't fit, so the page itself never does.
 */
export function FeatureNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    const targets = items.map((it) => document.getElementById(it.id)).filter((t): t is HTMLElement => t !== null)
    if (!targets.length || !("IntersectionObserver" in window)) return
    const seen = new Map<string, boolean>()
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => seen.set(e.target.id, e.isIntersecting))
        const first = targets.find((t) => seen.get(t.id))
        setActive(first ? first.id : null)
      },
      // A section counts as current while it crosses the band just below the two sticky bars.
      { rootMargin: "-140px 0px -60% 0px" },
    )
    targets.forEach((t) => io.observe(t))
    return () => io.disconnect()
  }, [items])

  // Keep the current link visible inside the bar, without moving the page.
  useEffect(() => {
    const list = listRef.current
    const link = active ? list?.querySelector<HTMLElement>(`a[href="#${active}"]`) : null
    if (!list || !link) return
    const left = link.offsetLeft - list.clientWidth / 2 + link.offsetWidth / 2
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    list.scrollTo?.({ left, behavior: reduce ? "auto" : "smooth" })
  }, [active])

  return (
    <nav aria-label="Features on this page" className="sticky top-16 z-30 border-y border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto w-full max-w-6xl">
        <ul ref={listRef} className="flex gap-1 overflow-x-auto px-2 py-2 [scrollbar-width:none] sm:px-4 [&::-webkit-scrollbar]:hidden">
          {items.map((it) => {
            const on = it.id === active
            return (
              <li key={it.id} className="shrink-0">
                <a
                  href={`#${it.id}`}
                  aria-current={on ? "true" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full px-3.5 text-sm whitespace-nowrap transition-colors",
                    on ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    FOCUS_FLAT,
                  )}
                >
                  {it.label}
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
