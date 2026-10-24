import Link from "next/link"

import { DocLayout } from "@/components/site/DocLayout"
import { GuideNext } from "@/components/site/GuideNext"
import { HelpBlock } from "@/components/site/HelpBlock"
import { btnPrimary, btnSecondary } from "@/components/site/styles"
import Guide, { toc } from "@/content/guide.mdx"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Guide | How to use Jupiter Jots",
  socialTitle: "How to use Jupiter Jots",
  description:
    "How to use Jupiter Jots, from installing to backing up: saving pages, notes, nested collections, tags, importing from Chrome, shortcuts and Insights, plus Ask Jupiter and connected agents.",
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
      toc={toc}
      tocTitle="In this guide"
    >
      <div className="space-y-14">
        <Guide />
        <GuideNext href="/guide/ask-jupiter" title="Ask Jupiter" action="Ask your library">
          Ask questions about what you saved, get answers with the items behind them, and approve
          every change before it touches your library.
        </GuideNext>
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
