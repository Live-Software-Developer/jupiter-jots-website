import type { Metadata } from "next"
import Link from "next/link"

import { CopyLinkButton } from "@/components/share/CopyLinkButton"
import { ShareCollectionList } from "@/components/share/ShareCollectionList"
import { ShareBadge, ShareBookmarkRow, ShareCurator, ShareCta, ShareDetails } from "@/components/share/Share"
import { FOCUS } from "@/components/site/styles"
import { ALSO_SHARED, PRIVATE_SHARE, SHARED_BOOKMARKS, SHARED_COLLECTION, SHARE_CURATOR } from "@/lib/share"
import { pageMetadata } from "@/lib/seo"

const SHARE_SEO = pageMetadata({
  title: "Private share · Jupiter Jots",
  description:
    "A private collection shared with Jupiter Jots, open for this visit. The share locks again when the tab closes.",
  path: "/share/private/unlocked",
  image: "share-private-unlocked",
  imageAlt: "An unlocked private Jupiter Jots collection shared by Ada Okafor",
})

export const metadata: Metadata = { ...SHARE_SEO, robots: { index: false, follow: false, nocache: true } }


export default function SharePrivateUnlockedPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <div className="flex flex-col gap-3 rounded-2xl border border-chart-5/30 bg-chart-5/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-chart-5/15 text-chart-5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-4"
              aria-hidden="true"
            >
              <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
              <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 6.7-1.4" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium">Private share unlocked</p>
            <p className="text-xs text-muted-foreground">Only people with the password can open this. It re-locks when you close the tab.</p>
          </div>
        </div>
        <Link
          href="/share/private"
          className={`inline-flex h-8 shrink-0 items-center justify-center self-start rounded-full border border-border bg-background px-3 text-xs font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${FOCUS} sm:self-auto`}
        >
          Lock again
        </Link>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-8">
          <ShareBadge tone="unlocked" />

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
            This is a private share. Only people with the link and the password can view it. Access expires on {PRIVATE_SHARE.expires}.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-4">
          <ShareCurator {...SHARE_CURATOR} />
          <ShareCta />
          <ShareDetails
            rows={[
              { label: "Visibility", value: "Private link" },
              { label: "Access", value: "Password" },
              { label: "Shared", value: SHARED_COLLECTION.shared },
              { label: "Contains", value: <span className="block">1 collection (6 bookmarks)<br />2 bookmarks</span> },
              { label: "Expires", value: PRIVATE_SHARE.expiresShort },
            ]}
            reportHref="/share/private"
            reportLabel="Lock this share again"
          />
        </div>
      </div>
    </main>
  )
}
