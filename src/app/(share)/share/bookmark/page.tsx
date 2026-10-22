import type { Metadata } from "next"
import Link from "next/link"

import { CopyLinkButton } from "@/components/share/CopyLinkButton"
import { ShareBadge, ShareCurator, ShareCta, ShareDetails } from "@/components/share/Share"
import { FOCUS } from "@/components/site/styles"
import { SHARED_BOOKMARK, SHARE_CURATOR } from "@/lib/share"
import { pageMetadata } from "@/lib/seo"

const SHARE_SEO = pageMetadata({
  title: "The Grug Brained Developer · Jupiter Jots",
  description:
    "A public bookmark shared with Jupiter Jots: the Grug Brained Developer, with Ada's note on why she sends it to every engineer.",
  path: "/share/bookmark",
  image: "share-bookmark",
  imageAlt: "A public Jupiter Jots bookmark shared by Ada Okafor",
})

export const metadata: Metadata = { ...SHARE_SEO, robots: { index: false, follow: false, nocache: true } }


export default function ShareBookmarkPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="min-w-0 lg:col-span-7">
          <ShareBadge tone="public" />

          <p className="mt-5 text-sm text-muted-foreground">Ada Okafor shared a bookmark</p>
          <h1 className="mt-2 font-serif text-4xl leading-tight font-normal tracking-tight text-balance sm:text-5xl">{SHARED_BOOKMARK.title}</h1>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="grid size-5 place-items-center rounded bg-chart-3/15 text-xs font-semibold text-chart-3" aria-hidden="true">
                G
              </span>
              {SHARED_BOOKMARK.domain}
            </span>
            <span>{SHARED_BOOKMARK.meta}</span>
            <span>{SHARED_BOOKMARK.saved}</span>
          </div>

          <figure className="mt-7 overflow-hidden rounded-2xl border border-border bg-card">
            <img src={SHARED_BOOKMARK.preview} alt="Preview of the shared page" className="aspect-[16/9] w-full object-cover" />
          </figure>

          <section className="mt-8 rounded-2xl border border-border bg-card p-5 text-card-foreground sm:p-6" aria-labelledby="why">
            <h2 id="why" className="text-sm font-medium text-muted-foreground">
              Why Ada saved it
            </h2>
            <p className="mt-3 font-serif text-xl leading-relaxed text-pretty">“{SHARED_BOOKMARK.note}”</p>
            <p className="mt-3 text-sm text-muted-foreground">— Ada, in her own words</p>
          </section>

          <section className="mt-6" aria-labelledby="tags">
            <h2 id="tags" className="text-sm font-medium text-muted-foreground">
              Tags
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {SHARED_BOOKMARK.tags.map((tag) => (
                <span key={tag} className="rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
                  #{tag}
                </span>
              ))}
            </div>
          </section>

          <p className="mt-8 max-w-2xl text-xs leading-relaxed text-muted-foreground">
            This is a public link. Anyone who has it can view this bookmark. Ada can turn sharing off at any time.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:col-span-5">
          <div className="rounded-2xl border border-border bg-card p-5">
            <a
              href={SHARED_BOOKMARK.href}
              target="_blank"
              rel="noopener"
              className={`inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 ${FOCUS}`}
            >
              Open page
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
                <path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5" />
              </svg>
            </a>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                href="/#get"
                className={`inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${FOCUS}`}
              >
                Save to my library
              </Link>
              <CopyLinkButton className={`inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground ${FOCUS}`} />
            </div>
          </div>

          <ShareCurator {...SHARE_CURATOR} />

          <ShareCta
            title="Keep this bookmark"
            body="Save shared bookmarks to your own library, with Ada's note attached. Free in Chrome, and everything stays on your device."
          />

          <ShareDetails
            rows={[
              { label: "Visibility", value: "Public link" },
              { label: "Shared", value: SHARED_BOOKMARK.shared },
              { label: "Saved", value: SHARED_BOOKMARK.savedOn },
              { label: "Expires", value: SHARED_BOOKMARK.expires },
            ]}
          />
        </div>
      </div>
    </main>
  )
}
