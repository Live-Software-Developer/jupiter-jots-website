import Link from "next/link"

import { DocLayout } from "@/components/site/DocLayout"
import { HelpBlock } from "@/components/site/HelpBlock"
import { btnPrimary, btnSecondary } from "@/components/site/styles"
import Faq, { toc } from "@/content/faq.mdx"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "FAQ | Jupiter Jots bookmark manager",
  socialTitle: "Jupiter Jots: frequently asked questions",
  description:
    "Short answers about saving pages, collections and tags, where your data is stored, importing Chrome bookmarks, shortcuts and what is coming next.",
  path: "/faq",
  image: "faq",
  imageAlt: "Jupiter Jots frequently asked questions",
  keywords: ["Jupiter Jots FAQ", "import Chrome bookmarks", "bookmark manager offline"],
})

export default function FaqPage() {
  return (
    <DocLayout
      title="Frequently asked questions"
      lede="Short answers about saving, organising and keeping your library. For step-by-step help, read the guide."
      toc={toc}
      tocTitle="Topics"
    >
      <div className="space-y-14">
        <Faq />
        <HelpBlock
          title="Didn’t find your answer?"
          actions={
            <>
              <Link href="/guide" className={btnPrimary("md")}>
                Read the guide
              </Link>
              <Link href="/support" className={btnSecondary("md")}>
                Contact support
              </Link>
            </>
          }
        >
          The guide covers every feature step by step. If something isn’t working, tell us.
        </HelpBlock>
      </div>
    </DocLayout>
  )
}
