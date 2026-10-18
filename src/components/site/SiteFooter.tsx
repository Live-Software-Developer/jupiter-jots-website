import Link from "next/link"

import { Wordmark } from "@/components/site/BrandLogo"
import { FOOTER_COLUMNS } from "@/components/site/nav"
import { FOCUS_FLAT } from "@/components/site/styles"
import { ThemeToggle } from "@/components/site/ThemeToggle"
import { COPYRIGHT_YEAR } from "@/lib/site"

/** The design's <site-footer>, plus the theme choice next to the copyright line. */
export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-sidebar text-sidebar-foreground">
      <div className="mx-auto w-full max-w-6xl px-4 pt-14 pb-8 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5">
            <Link href="/" className={`inline-flex items-center gap-2.5 rounded-lg ${FOCUS_FLAT}`} aria-label="Jupiter Jots home">
              <Wordmark />
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              A bookmark manager for Chrome that remembers why you saved each page.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-7">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h2 className="text-sm font-semibold text-foreground">{col.title}</h2>
                <ul className="mt-3 flex flex-col gap-2">
                  {col.links.map(([label, href]) => (
                    <li key={href}>
                      <Link href={href} className={`inline-block rounded py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground ${FOCUS_FLAT}`}>
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>Your library stays on your device.</p>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <p>&copy; {COPYRIGHT_YEAR} Jupiter Jots</p>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </footer>
  )
}
