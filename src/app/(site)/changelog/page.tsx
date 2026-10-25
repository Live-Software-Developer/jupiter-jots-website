import { PageIntro } from "@/components/site/PageIntro"
import Changelog from "@/content/changelog.mdx"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Changelog | Jupiter Jots",
  description:
    "What changed in each version of Jupiter Jots, newest first, including Ask Jupiter, connected terminal agents, sharing and the 2.0 library.",
  path: "/changelog",
  image: "changelog",
  imageAlt: "Jupiter Jots changelog",
  keywords: ["Jupiter Jots changelog", "Jupiter Jots 2.1", "Jupiter Jots 2.0", "Ask Jupiter", "Jupiter Jots MCP"],
})

export default function ChangelogPage() {
  return (
    <>
      <PageIntro title="Changelog" lede="What changed in each version of Jupiter Jots, newest first." />
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <ol className="space-y-14">
          <Changelog />
        </ol>
      </div>
    </>
  )
}
