import Link from "next/link"
import { Suspense } from "react"

import { ExploreList, ExploreSearch, ExploreSkeleton } from "@/components/explore/ExploreList"
import { PageIntro } from "@/components/site/PageIntro"
import { textLink } from "@/components/site/styles"
import { EXPLORE_MAX_Q, getExplore } from "@/lib/share/api"
import { pageMetadata } from "@/lib/seo"

export const metadata = pageMetadata({
  title: "Explore public shares | Jupiter Jots",
  description:
    "Browse collections, bookmarks and graphs that Jupiter Jots users chose to make public. Search by title or curator; unlisted and private shares never appear.",
  path: "/explore",
  image: "home",
  imageAlt: "Jupiter Jots",
  keywords: ["Jupiter Jots shares", "shared bookmark collections", "public reading lists"],
  socialTitle: "Explore public shares",
})

type SearchParams = Promise<Record<string, string | string[] | undefined>>

export default function ExplorePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <>
      <PageIntro
        title="Explore"
        lede="Collections, bookmarks and graphs that people chose to make public. Unlisted and password-protected shares are never listed here."
      />
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
        <Suspense
          fallback={
            <>
              <ExploreSearch q="" />
              <div className="mt-8">
                <ExploreSkeleton />
              </div>
            </>
          }
        >
          <ExploreResults searchParams={searchParams} />
        </Suspense>
        <p className="mt-12 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Want yours here? In Jupiter Jots, choose <strong className="font-medium text-foreground">Public</strong> when you share. You can
          make a share unlisted again at any time. The <Link href="/faq#privacy" className={textLink}>FAQ</Link> explains the three options.
        </p>
      </div>
    </>
  )
}

async function ExploreResults({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).q
  const q = (Array.isArray(raw) ? raw[0] : raw)?.trim().slice(0, EXPLORE_MAX_Q) ?? ""
  const initial = await getExplore({ q })
  return (
    <>
      <ExploreSearch q={q} />
      <div className="mt-8">
        <ExploreList key={q} q={q} initial={initial} />
      </div>
    </>
  )
}
