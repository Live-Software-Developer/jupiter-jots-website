import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** The design's <site-prose>: reading typography for long-form content (styles in globals.css). */
export function Prose({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("jj-prose", className)}>{children}</div>
}

/** "The short version" box at the top of a legal page (the design's <site-summary>). */
export function Summary({ title = "The short version", children }: { title?: string; children: ReactNode }) {
  return (
    <aside aria-label={title} className="jj-summary block rounded-xl border border-border bg-muted/50 p-5 sm:p-6">
      <h2 className="text-lg leading-snug font-semibold tracking-tight text-foreground">{title}</h2>
      {children}
    </aside>
  )
}

/** Bordered definition rows used on the legal, guide and about pages. */
export function Defs({ className, children }: { className?: string; children: ReactNode }) {
  return <dl className={cn("mt-6 border-b border-border text-base", className)}>{children}</dl>
}

/** One definition row. `wide` gives the term 3 of 12 columns (About) instead of 4. */
export function Def({ term, aside, strong = false, wide = false, children }: {
  term: ReactNode
  /** Quiet text after the term, e.g. "(optional)". */
  aside?: string
  /** Semibold term (About) instead of medium. */
  strong?: boolean
  wide?: boolean
  children: ReactNode
}) {
  return (
    <div className="grid gap-1 border-t border-border py-4 sm:grid-cols-12 sm:gap-6">
      <dt className={cn("text-foreground", strong ? "font-semibold" : "font-medium", wide ? "sm:col-span-3" : "sm:col-span-4")}>
        {term}
        {aside && <span className="font-normal text-muted-foreground"> {aside}</span>}
      </dt>
      <dd className={cn("leading-7 text-muted-foreground [&_p+p]:mt-3 [&_p+ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul+p]:mt-2", wide ? "sm:col-span-9" : "sm:col-span-8")}>{children}</dd>
    </div>
  )
}

/** A keyboard key. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="jj-kbd">{children}</kbd>
}

/** A value that must be filled in before launch; dashed so nobody mistakes it for final copy. */
export function Placeholder({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md border border-dashed border-primary/50 bg-primary/5 px-1.5 py-0.5 text-foreground">{children}</span>
  )
}
