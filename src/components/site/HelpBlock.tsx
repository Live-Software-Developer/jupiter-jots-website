import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/** The closing "Need more help?" block on content pages: heading, one line, two buttons. */
export function HelpBlock({ title, children, actions, className }: { title: string; children: ReactNode; actions: ReactNode; className?: string }) {
  return (
    <div className={cn("max-w-prose border-t border-border pt-8", className)}>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-muted-foreground">{children}</p>
      <div className="mt-5 flex flex-wrap gap-2">{actions}</div>
    </div>
  )
}
