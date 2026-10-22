import { PageIntro } from "@/components/site/PageIntro"
import Changelog from "@/content/changelog.mdx"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Changelog | Jupiter Jots",
  description:
    "What changed in each version of Jupiter Jots, newest first. Version 2.0.0 rebuilds it as one app across Chrome’s toolbar, side panel and a full-screen library.",
  path: "/changelog",
  image: "changelog",
  imageAlt: "Jupiter Jots changelog",
  keywords: ["Jupiter Jots changelog", "Jupiter Jots 2.0"],
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
