import type { Metadata } from "next"
import { cache, Suspense } from "react"

import { ShareBadge } from "@/components/share/Share"
import { ShareBand, toBands } from "@/components/share/ShareBand"
import { ShareHero } from "@/components/share/ShareHero"
import { ShareSidebar } from "@/components/share/ShareSidebar"
import { ShareUnavailable } from "@/components/share/ShareUnavailable"
import { getShare } from "@/lib/share/api"
import { plural } from "@/lib/share/format"
import type { PublicShare, SharePayload, ShareResult } from "@/lib/share/types"
import { SITE } from "@/lib/site"

type Params = Promise<{ slug: string }>

/** Slugs are 10 chars of [a-z0-9]; anything else is not worth a request. */
const SLUG = /^[a-z0-9]{10}$/

/** One fetch per request, shared by generateMetadata and the page. */
const loadShare = cache(
  (slug: string): Promise<ShareResult> => (SLUG.test(slug) ? getShare(slug) : Promise.resolve({ status: "missing" })),
)

/** A public share's payload, or null when it is not valid v1 JSON. Items of unknown kinds are dropped. */
function parsePayload(share: PublicShare): SharePayload | null {
  try {
    const p = JSON.parse(share.payload) as SharePayload
    if (!p || p.v !== 1 || !Array.isArray(p.items)) return null
    const items = p.items.filter(
      (i) =>
        (i?.kind === "bookmark" && i.bookmark) ||
        (i?.kind === "collection" && Array.isArray(i.collection?.bookmarks)) ||
        (i?.kind === "graph" && [i.graph?.nodes, i.graph?.steps, i.graph?.links].every(Array.isArray)),
    )
    return { ...p, curator: p.curator ?? { name: "" }, items }
  } catch {
    return null
  }
}

const ROBOTS = { index: false, follow: false }

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params
  const res = await loadShare(slug)
  const path = `/s/${slug}`
  if (res.status !== "ok") {
    const title = "Share unavailable · Jupiter Jots"
    return {
      title: { absolute: title },
      description: null,
      keywords: null,
      robots: ROBOTS,
      alternates: null,
      openGraph: { type: "website", siteName: SITE.name, title },
      twitter: { card: "summary", title },
    }
  }
  const { share } = res
  const title = `${share.title} · Jupiter Jots`
  // Private shares put nothing in metadata beyond the title and the curator's name.
  const description =
    share.visibility === "private"
      ? share.curator_name
        ? `Shared by ${share.curator_name}`
        : null
      : share.summary || (share.curator_name ? `Shared by ${share.curator_name}` : null)
  return {
    title: { absolute: title },
    description,
    keywords: null,
    robots: ROBOTS,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE.name, url: path, title: share.title, description: description ?? undefined },
    twitter: { card: "summary_large_image", title: share.title, description: description ?? undefined },
  }
}

export default function SharePage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<ShareSkeleton />}>
      <ShareContent params={params} />
    </Suspense>
  )
}

async function ShareContent({ params }: { params: Params }) {
  const { slug } = await params
  const res = await loadShare(slug)
  if (res.status !== "ok") return <ShareUnavailable reason={res.status} slug={slug} />

  const { share } = res
  if (share.visibility === "private") return <PrivateLock share={share} />

  const payload = parsePayload(share)
  if (!payload) return <ShareUnavailable reason="error" slug={slug} />
  const bands = toBands(payload.items)
  const curator = payload.curator.name || share.curator_name

  return (
    <main>
      <ShareHero share={share} payload={payload} />
      {bands.map((band, i) => (
        <ShareBand key={band.key} item={band} index={i} total={bands.length} curator={curator} />
      ))}
      <div className="border-t border-border py-10 sm:py-14">
        <div className="mx-auto grid w-full max-w-6xl gap-10 px-3 sm:px-6 lg:grid-cols-12 lg:gap-12">
          <div className="min-w-0 lg:col-span-8">
            <DiscussionSummary share={share} />
          </div>
          <div className="lg:col-span-4">
            <ShareSidebar share={share} bands={bands} />
          </div>
        </div>
      </div>
    </main>
  )
}

/** Discussion heading and count; the threaded Discussion (Task 5) takes this slot. */
function DiscussionSummary({ share }: { share: PublicShare }) {
  return (
    <section id="discussion" className="scroll-mt-20" aria-labelledby="discussion-title">
      <h2 id="discussion-title" className="font-serif text-3xl leading-tight tracking-tight">
        Discussion
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {share.comment_mode === "off" ? "Comments are turned off for this share." : plural(share.comment_count, "comment")}
      </p>
    </section>
  )
}

/** Server-rendered lock card from the plaintext fields; the PrivateGate (Task 6) adds the password form and decryption. */
function PrivateLock({ share }: { share: PublicShare }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <ShareBadge tone="private" />
      <h1 className="mt-5 font-serif text-4xl leading-tight font-normal tracking-tight break-words text-balance sm:text-5xl">{share.title}</h1>
      {share.curator_name ? <p className="mt-3 text-sm text-muted-foreground">Shared by {share.curator_name}</p> : null}
      {share.summary ? <p className="mt-1 text-sm text-muted-foreground">{share.summary}</p> : null}
      <p className="mt-6 text-base leading-relaxed text-pretty text-muted-foreground">
        This share is protected with a password. Ask the person who sent the link for it.
      </p>
    </main>
  )
}

function ShareSkeleton() {
  const bar = "rounded-lg bg-muted motion-safe:animate-pulse"
  return (
    <main aria-busy="true" aria-label="Loading share" className="mx-auto w-full max-w-6xl px-3 pt-8 pb-10 sm:px-6 sm:pt-12 lg:pt-16">
      <div className={`${bar} h-6 w-24 rounded-full`} />
      <div className={`${bar} mt-5 h-12 w-full max-w-xl`} />
      <div className={`${bar} mt-4 h-5 w-full max-w-2xl`} />
      <div className={`${bar} mt-2 h-5 w-2/3 max-w-lg`} />
      <div className="mt-14 grid gap-3 md:grid-cols-2">
        <div className={`${bar} h-24 rounded-2xl`} />
        <div className={`${bar} h-24 rounded-2xl`} />
      </div>
    </main>
  )
}
