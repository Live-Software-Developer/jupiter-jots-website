import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * The design's <site-section>: one anchored section of a long-form page, with a "#" link that
 * shows on hover or focus. Spacing between sections comes from the parent (space-y-14).
 */
export function Section({
  anchor,
  title,
  note,
  className,
  children,
}: {
  anchor: string
  title: string
  note?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section id={anchor} aria-labelledby={`${anchor}-h`} className={cn("block scroll-mt-24", className)}>
      <div className="group mb-4 flex items-baseline gap-2">
        <h2 id={`${anchor}-h`} className="text-2xl leading-tight font-semibold tracking-tight text-balance text-foreground">
          {title}
        </h2>
        <a
          href={`#${anchor}`}
          className="shrink-0 rounded-sm px-1 text-lg text-transparent transition-colors group-hover:text-muted-foreground hover:text-primary focus-visible:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          aria-label={`Link to ${title}`}
        >
          #
        </a>
      </div>
      {note && <p className="-mt-2 mb-4 text-base text-muted-foreground">{note}</p>}
      {children}
    </section>
  )
}
