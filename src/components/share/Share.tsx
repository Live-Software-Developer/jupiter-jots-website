import Link from "next/link"

import { BrandLogo } from "@/components/site/BrandLogo"
import { PlusIcon } from "@/components/site/icons"
import { FOCUS, FOCUS_FLAT } from "@/components/site/styles"
import { cn } from "@/lib/utils"

export function ShareTopbar() {
  return (
    <div className="border-b border-border bg-background">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className={cn("-ml-1 flex shrink-0 items-center gap-2.5 rounded-lg p-1", FOCUS)} aria-label="Jupiter Jots home">
          <BrandLogo className="size-8" />
          <span className="text-lg leading-none font-semibold tracking-tight whitespace-nowrap">Jupiter Jots</span>
        </Link>
        <span className="hidden h-4 w-px bg-border sm:block" aria-hidden="true" />
        <span className="hidden text-sm text-muted-foreground sm:block">Shared page</span>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/#get"
            className={cn(
              "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90",
              FOCUS,
            )}
          >
            <PlusIcon />
            Add to Chrome
          </Link>
        </div>
      </div>
    </div>
  )
}

export function ShareFooter() {
  const link = cn("rounded text-sm text-muted-foreground transition-colors hover:text-foreground", FOCUS_FLAT)
  return (
    <footer className="border-t border-border bg-sidebar font-sans text-sidebar-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:px-6">
        <Link href="/" className={cn("flex items-center gap-2 rounded-lg", FOCUS)} aria-label="Jupiter Jots home">
          <BrandLogo className="size-6" />
          <span className="text-sm font-medium">Shared with Jupiter Jots</span>
        </Link>
        <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-2 sm:ml-auto">
          <Link href="/" className={link}>
            Features
          </Link>
          <Link href="/privacy" className={link}>
            Privacy
          </Link>
          <Link href="/support" className={link}>
            Support
          </Link>
          <Link href="/#get" className={cn("rounded text-sm font-medium text-foreground underline-offset-4 hover:underline", FOCUS)}>
            Get the extension
          </Link>
        </nav>
      </div>
    </footer>
  )
}
