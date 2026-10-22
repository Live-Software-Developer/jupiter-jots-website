import { DocLayout } from "@/components/site/DocLayout"
import Terms, { toc } from "@/content/terms.mdx"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Terms of use | Jupiter Jots",
  description:
    "The rules for using Jupiter Jots, in plain language. It is free for personal and work use, your data is yours, and it is provided as it is.",
  path: "/terms",
  image: "terms",
  imageAlt: "Jupiter Jots terms of use",
  keywords: ["Jupiter Jots terms", "bookmark extension terms of use"],
})

export default function TermsPage() {
  return (
    <DocLayout
      title="Terms of use"
      lede="The rules for using Jupiter Jots, in plain language. It is free, your data is yours, and it comes as it is."
      meta="Effective 18 October 2026. Last updated 23 October 2026."
      toc={toc}
    >
      <Terms />
    </DocLayout>
  )
}
