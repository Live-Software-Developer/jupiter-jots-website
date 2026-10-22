import { DocLayout } from "@/components/site/DocLayout"
import Privacy, { toc } from "@/content/privacy.mdx"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Privacy policy | Jupiter Jots",
  description:
    "Jupiter Jots keeps your bookmarks in your browser on your device. No account, no server, no analytics: what is stored, what is read and why.",
  path: "/privacy",
  image: "privacy",
  imageAlt: "Jupiter Jots privacy policy",
  keywords: ["Jupiter Jots privacy", "bookmark extension privacy policy"],
})

export default function PrivacyPage() {
  return (
    <DocLayout
      title="Privacy policy"
      lede="Jupiter Jots keeps your library on your own computer. There is no account, no server and no tracking."
      meta="Effective 18 October 2026. Last updated 18 October 2026."
      toc={toc}
    >
      <Privacy />
    </DocLayout>
  )
}
