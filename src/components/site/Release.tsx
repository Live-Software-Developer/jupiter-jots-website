import type { ReactNode } from "react"

import { Prose } from "@/components/site/Prose"

/** One changelog entry: version and date on the left (lg), notes on the right. */
export function Release({
  id,
  version,
  date,
  label,
  suffix,
  latest = false,
  children,
}: {
  id: string
  version: string
  /** Machine-readable date for <time>. */
  date: string
  /** The date as people read it. */
  label: string
  suffix?: string
  latest?: boolean
  children: ReactNode
}) {
  return (
    <li id={id} className="scroll-mt-24 border-t border-border pt-14 first:border-t-0 first:pt-0 lg:grid lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-3">
        <h2 className="text-2xl font-semibold tracking-tight">{version}</h2>
        <p className="mt-1 text-muted-foreground">
          <time dateTime={date}>{label}</time>
          {suffix}
        </p>
        {latest && <p className="mt-3 inline-flex rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">Latest</p>}
      </div>
      <div className="mt-6 min-w-0 lg:col-span-9 lg:mt-0">
        <Prose>{children}</Prose>
      </div>
    </li>
  )
}
