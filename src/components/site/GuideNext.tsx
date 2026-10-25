import Link from "next/link"
import type { ReactNode } from "react"

import { ChevronRightIcon } from "@/components/site/icons"
import { FOCUS } from "@/components/site/styles"
import { cn } from "@/lib/utils"

/**
 * The link between the guide's pages. It names the next subject and what the reader will be
 * able to do there, so the guide reads as one path rather than three landing pages.
 */
export function GuideNext({
  href,
  label = "Next in the guide",
  title,
  action = "Continue",
  children,
  className,
  as: Heading = "h2",
}: {
  href: string
  label?: string
  title: string
  action?: string
  children: ReactNode
  className?: string
  /** h3 when the card sits inside a guide section. */
  as?: "h2" | "h3"
}) {
  return (
    <aside className={cn("rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm shadow-foreground/5 sm:p-6", className)}>
      <p className="text-sm font-medium text-primary">{label}</p>
      <Heading className="mt-1 font-serif text-2xl leading-tight tracking-tight text-balance">{title}</Heading>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{children}</p>
      <Link
        href={href}
        className={cn(
          "mt-4 inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent",
          FOCUS,
        )}
      >
        {action}
        <ChevronRightIcon className="size-4" />
      </Link>
    </aside>
  )
}
