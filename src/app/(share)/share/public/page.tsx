import type { Metadata } from "next"
import Link from "next/link"

import { CopyLinkButton } from "@/components/share/CopyLinkButton"
import { ShareCollectionList } from "@/components/share/ShareCollectionList"
import { ShareBadge, ShareBookmarkRow, ShareCurator, ShareCta, ShareDetails } from "@/components/share/Share"
import { FOCUS } from "@/components/site/styles"
import { ALSO_SHARED, SHARED_BOOKMARKS, SHARED_COLLECTION, SHARE_CURATOR } from "@/lib/share"
import { pageMetadata } from "@/lib/seo"

const SHARE_SEO = pageMetadata({
  title: "Weekend reading: systems, type & the web · Jupiter Jots",
  description:
    "A public collection shared with Jupiter Jots: six long reads on systems, type and the web, each with a note on why Ada saved it.",
  path: "/share/public",
  image: "share-public",
  imageAlt: "A public Jupiter Jots collection shared by Ada Okafor",
})

export const metadata: Metadata = { ...SHARE_SEO, robots: { index: false, follow: false, nocache: true } }


export default function SharePublicPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-8">
          <ShareBadge tone="public" />

          <p className="mt-5 text-sm text-muted-foreground">Ada Okafor shared a collection</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight font-normal tracking-tight text-balance sm:text-5xl">{SHARED_COLLECTION.title}</h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-pretty text-muted-foreground">{SHARED_COLLECTION.description}</p>

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="grid size-6 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
                {SHARE_CURATOR.initials}
              </span>
              <span>{SHARE_CURATOR.name}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
              </svg>
              1 collection · 2 bookmarks
            </span>
            <span>Updated {SHARED_COLLECTION.updatedLabel}</span>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link
              href="/#get"
              className={`inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 ${FOCUS}`}
            >
              Save this collection
            </Link>
            <CopyLinkButton
              className={`inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${FOCUS}`}
            />
          </div>

          <ShareCollectionList bookmarks={SHARED_BOOKMARKS} />

          <section className="mt-10" aria-labelledby="also-shared">
            <div className="flex items-center justify-between gap-3">
              <h2 id="also-shared" className="text-sm font-medium">
                Also shared with you
              </h2>
              <span className="text-xs tabular-nums text-muted-foreground">{ALSO_SHARED.length} bookmarks</span>
            </div>
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {ALSO_SHARED.map((bookmark) => (
                <ShareBookmarkRow key={bookmark.href} bookmark={bookmark} />
              ))}
            </div>
          </section>

          <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            This is a public link. Anyone who has it can view this collection. Ada can turn sharing off at any time.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
          <ShareCurator {...SHARE_CURATOR} />
          <ShareCta />
          <ShareDetails
            rows={[
              { label: "Visibility", value: "Public link" },
              { label: "Shared", value: SHARED_COLLECTION.shared },
              { label: "Updated", value: SHARED_COLLECTION.updated },
              { label: "Contains", value: <span className="block">1 collection (6 bookmarks)<br />2 bookmarks</span> },
              { label: "Expires", value: SHARED_COLLECTION.expires },
            ]}
          />
        </div>
      </div>
    </main>
  )
}
