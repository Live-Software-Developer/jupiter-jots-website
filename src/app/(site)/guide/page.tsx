import Link from "next/link"

import { DocLayout } from "@/components/site/DocLayout"
import { GuidePager, GuideTabs } from "@/components/site/GuideNav"
import { HelpBlock } from "@/components/site/HelpBlock"
import { btnPrimary, btnSecondary } from "@/components/site/styles"
import Guide, { toc } from "@/content/guide.mdx"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Guide | How to use Jupiter Jots",
  socialTitle: "How to use Jupiter Jots",
  description:
    "How to use Jupiter Jots: install, save pages, notes, nested collections, tags, graphs, share links, trash, import from Chrome, shortcuts and backups, plus Ask Jupiter and agents.",
  path: "/guide",
  image: "guide",
  imageAlt: "The Jupiter Jots guide",
  keywords: ["Jupiter Jots guide", "how to import Chrome bookmarks", "Chrome extension keyboard shortcuts", "Ask Jupiter", "Jupiter Jots MCP"],
})

export default function GuidePage() {
  return (
    <DocLayout
      title="Guide"
      lede="How to use Jupiter Jots, from installing to backing up. Read it in order, or jump to the part you need."
      nav={<GuideTabs current="/guide" />}
      toc={toc}
      tocTitle="In this guide"
    >
      <div className="space-y-14">
        <Guide />
        <GuidePager current="/guide" />
        <HelpBlock
          title="Need more help?"
          actions={
            <>
              <Link href="/faq" className={btnPrimary("md")}>
                Read the FAQ
              </Link>
              <Link href="/support" className={btnSecondary("md")}>
                Report a problem
              </Link>
            </>
          }
        >
          Short answers are in the FAQ. If something doesn’t work the way this guide says, tell us.
        </HelpBlock>
      </div>
    </DocLayout>
  )
}
