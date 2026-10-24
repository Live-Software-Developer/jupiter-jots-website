import Link from "next/link"

import { PlainLayout } from "@/components/site/DocLayout"
import { StoreLink } from "@/components/site/ExternalStoreLink"
import { HelpBlock } from "@/components/site/HelpBlock"
import { btnPrimary, btnSecondary } from "@/components/site/styles"
import About from "@/content/about.mdx"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "About | Jupiter Jots",
  description:
    "Why Jupiter Jots exists and how it is built: local first, fast and calm. A bookmark manager for people who save pages for a reason, with Ask Jupiter and connected agents.",
  path: "/about",
  image: "about",
  imageAlt: "About Jupiter Jots",
})

export default function AboutPage() {
  return (
    <PlainLayout title="About Jupiter Jots" lede="A bookmark manager for people who save pages for a reason and want to find them again.">
      <About />
      <HelpBlock
        title="Try it"
        actions={
          <>
            <StoreLink className={btnPrimary("md")}>Add to Chrome</StoreLink>
            <Link href="/guide" className={btnSecondary("md")}>
              Read the guide
            </Link>
          </>
        }
      >
        Free, no account. Import your Chrome bookmarks in one step.
      </HelpBlock>
    </PlainLayout>
  )
}
