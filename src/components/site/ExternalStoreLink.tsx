import type { ReactNode } from "react"

import { STORE_URL } from "@/lib/site"

/** A link to the Chrome Web Store listing; opens a new tab and says so to screen readers. */
export function StoreLink({ className, children, label }: { className: string; children: ReactNode; label?: string }) {
  return (
    <a href={STORE_URL} target="_blank" rel="noopener" className={className} aria-label={label}>
      {children}
      <span className="sr-only"> (opens the Chrome Web Store in a new tab)</span>
    </a>
  )
}
