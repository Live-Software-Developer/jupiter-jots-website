import type { MetadataRoute } from "next"
import { cacheLife } from "next/cache"

import { getExplore } from "@/lib/share/api"
import type { ExploreItem } from "@/lib/share/types"
import { SITE_URL } from "@/lib/site"

/** Last content change; bump it with each release or policy update. */
const UPDATED = "2026-10-24"

/** At most this many pages of 20 public shares go in the sitemap. */
const MAX_SHARE_PAGES = 25

/**
 * Public shares (listed on /explore) may be indexed, so they are in the sitemap; unlisted and
 * private ones never are. Refreshed hourly; an unreachable backend just leaves them out.
 */
async function publicShares(): Promise<ExploreItem[]> {
  "use cache"
  cacheLife("hours")
  const out: ExploreItem[] = []
  let cursor: string | null = null
  for (let i = 0; i < MAX_SHARE_PAGES; i++) {
    const res = await getExplore({ cursor })
    if (res.status !== "ok") break
    out.push(...res.page.results)
    cursor = res.page.next_cursor
    if (!cursor) break
  }
  return out
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // [path, priority, how often it changes]
  const pages: [string, number, "daily" | "weekly" | "monthly" | "yearly", string][] = [
    ["", 1, "monthly", "home"],
    ["/explore", 0.7, "daily", "home"],
    ["/guide", 0.8, "monthly", "guide"],
    ["/faq", 0.7, "monthly", "faq"],
    ["/changelog", 0.6, "monthly", "changelog"],
    ["/about", 0.5, "yearly", "about"],
    ["/support", 0.5, "yearly", "support"],
    ["/privacy", 0.3, "yearly", "privacy"],
    ["/terms", 0.3, "yearly", "terms"],
  ]
  const site: MetadataRoute.Sitemap = pages.map(([p, priority, changeFrequency, image]) => ({
    url: `${SITE_URL}${p}`,
    lastModified: UPDATED,
    changeFrequency,
    priority,
    images: [`${SITE_URL}/og/${image}.png`],
  }))
  const shares: MetadataRoute.Sitemap = (await publicShares()).map((s) => ({
    url: `${SITE_URL}/s/${encodeURIComponent(s.slug)}`,
    lastModified: s.updated_at,
    changeFrequency: "weekly",
    priority: 0.4,
  }))
  return [...site, ...shares]
}
