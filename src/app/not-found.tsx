import Link from "next/link"

import { PageIntro } from "@/components/site/PageIntro"
import { SiteShell } from "@/components/site/SiteShell"
import { btnPrimary, btnSecondary } from "@/components/site/styles"

export const metadata = { title: "Page not found", robots: { index: false } }

export default function NotFound() {
  return (
    <SiteShell>
      <PageIntro title="This page doesn’t exist" lede="The link may be old, or the address may have a typo. Everything on the site is one click from here." />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <div className="flex flex-wrap gap-2">
          <Link href="/" className={btnPrimary("md")}>
            Go to the home page
          </Link>
          <Link href="/guide" className={btnSecondary("md")}>
            Read the guide
          </Link>
          <Link href="/support" className={btnSecondary("md")}>
            Contact support
          </Link>
        </div>
      </div>
    </SiteShell>
  )
}
