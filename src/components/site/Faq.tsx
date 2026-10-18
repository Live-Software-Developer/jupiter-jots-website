"use client"

import { useId, useState, type ReactNode } from "react"

import { ChevronDownIcon } from "@/components/site/icons"

/**
 * One FAQ question (the design's <ui-accordion>). A real button with aria-expanded controls the
 * answer; the answer stays in the HTML so search engines and find-in-page still see it.
 */
export function Faq({ q, children }: { q: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return (
    <div className="border-b border-border">
      <h3>
        <button
          type="button"
          id={`${id}-q`}
          aria-expanded={open}
          aria-controls={`${id}-a`}
          onClick={() => setOpen((o) => !o)}
          className="group flex w-full items-center justify-between gap-4 rounded-sm py-4 text-left text-base font-medium text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {q}
          <ChevronDownIcon
            className={`size-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          />
        </button>
      </h3>
      <div id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} hidden={!open} className="pb-5">
        <p className="text-base leading-7 text-muted-foreground">{children}</p>
      </div>
    </div>
  )
}
