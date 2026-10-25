import Link from "next/link"

import { DocLayout } from "@/components/site/DocLayout"
import { GuidePager, GuideTabs } from "@/components/site/GuideNav"
import { HelpBlock } from "@/components/site/HelpBlock"
import { btnPrimary, btnSecondary } from "@/components/site/styles"
import AskJupiter, { toc } from "@/content/ask-jupiter.mdx"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Ask Jupiter | Ask your saved library",
  socialTitle: "Ask Jupiter: your saved library, in plain words",
  description:
    "Use Ask Jupiter to search your saved pages, summarise collections and prepare changes. Bring your own AI key, see what it can read, and approve every change.",
  path: "/guide/ask-jupiter",
  image: "ask-jupiter",
  imageAlt: "Ask Jupiter, the AI assistant in Jupiter Jots",
  keywords: ["Ask Jupiter", "AI bookmark manager", "ask your bookmarks", "AI library assistant"],
})

export default function AskJupiterPage() {
  return (
    <DocLayout
      title="Ask Jupiter"
      lede="Ask questions about what you saved, in plain words. Jupiter finds the items, explains them, and prepares any change for you to approve."
      nav={<GuideTabs current="/guide/ask-jupiter" />}
      toc={toc}
      tocTitle="In this guide"
    >
      <div className="space-y-14">
        <AskJupiter />
        <GuidePager current="/guide/ask-jupiter" />
        <HelpBlock
          title="Still deciding?"
          actions={
            <>
              <Link href="/guide" className={btnSecondary("md")}>
                Read the full guide
              </Link>
              <Link href="/faq" className={btnPrimary("md")}>
                Ask the FAQ
              </Link>
            </>
          }
        >
          The FAQ covers keys, vaults, privacy and what happens when you turn a tool off.
        </HelpBlock>
      </div>
    </DocLayout>
  )
}
