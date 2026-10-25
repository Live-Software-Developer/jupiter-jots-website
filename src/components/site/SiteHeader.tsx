import Link from "next/link"

import { Wordmark } from "@/components/site/BrandLogo"
import { StoreLink } from "@/components/site/ExternalStoreLink"
import { PlusIcon } from "@/components/site/icons"
import { MobileMenu } from "@/components/site/MobileMenu"
import { NavLinks } from "@/components/site/NavLinks"
import { FOCUS, btnPrimary } from "@/components/site/styles"

/** The design's <site-header>: sticky, logo, main nav (md+), Add to Chrome, and a menu sheet on phones. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 block">
      <div className="border-b border-border bg-background text-foreground">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Link href="/" className={`-ml-1 flex shrink-0 items-center gap-2.5 rounded-lg p-1 ${FOCUS}`} aria-label="Jupiter Jots home">
            <Wordmark />
          </Link>
          <nav aria-label="Main" className="ml-2 hidden items-center gap-1 md:flex lg:ml-6">
            <NavLinks />
          </nav>
          <div className="ml-auto flex items-center gap-1">
            <span className="hidden sm:block">
              <StoreLink className={btnPrimary("sm")}>
                <PlusIcon />
                Add to Chrome
              </StoreLink>
            </span>
            <MobileMenu />
          </div>
        </div>
      </div>
    </header>
  )
}
