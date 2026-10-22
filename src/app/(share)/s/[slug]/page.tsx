import type { Metadata } from "next"
import { cookies } from "next/headers"
import { cache, Suspense } from "react"

import { PrivateGate } from "@/components/share/PrivateGate"
import { ShareUnavailable } from "@/components/share/ShareUnavailable"
import { ShareView } from "@/components/share/ShareView"
import { getShare, VISITOR_COOKIE } from "@/lib/share/api"
import { parsePayload } from "@/lib/share/payload"
import type { ShareResult } from "@/lib/share/types"
import { SITE } from "@/lib/site"

type Params = Promise<{ slug: string }>

/** Slugs are 10 chars of [a-z0-9]; anything else is not worth a request. */
const SLUG = /^[a-z0-9]{10}$/

/**
 * One fetch per request, shared by generateMetadata and the page. It forwards the visitor's
 * `jj_visitor` cookie (set by visitorKey() in the browser) so a reload does not count another
 * view. Reading cookies makes this request-time work; the page runs it inside its Suspense boundary.
 */
const loadShare = cache(async (slug: string): Promise<ShareResult> => {
  if (!SLUG.test(slug)) return { status: "missing" }
  const visitor = (await cookies()).get(VISITOR_COOKIE)?.value
  return getShare(slug, visitor)
})

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
  // The lock card is server-rendered from the plaintext fields; the payload stays ciphertext
  // until the visitor's browser decrypts it.
  if (share.visibility === "private") return <PrivateGate share={share} />

  const payload = parsePayload(share.payload)
  if (!payload) return <ShareUnavailable reason="error" slug={slug} />
  return <ShareView share={share} payload={payload} />
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
