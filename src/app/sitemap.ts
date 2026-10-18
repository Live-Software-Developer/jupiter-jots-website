import type { MetadataRoute } from "next"

import { SITE_URL } from "@/lib/site"

/** Last content change; bump it with each release or policy update. */
const UPDATED = "2026-10-18"

export default function sitemap(): MetadataRoute.Sitemap {
  // [path, priority, how often it changes]
  const pages: [string, number, "weekly" | "monthly" | "yearly"][] = [
    ["", 1, "monthly"],
    ["/guide", 0.8, "monthly"],
    ["/faq", 0.7, "monthly"],
    ["/changelog", 0.6, "monthly"],
    ["/about", 0.5, "yearly"],
    ["/support", 0.5, "yearly"],
    ["/privacy", 0.3, "yearly"],
    ["/terms", 0.3, "yearly"],
  ]
  return pages.map(([p, priority, changeFrequency]) => ({
    url: `${SITE_URL}${p}`,
    lastModified: UPDATED,
    changeFrequency,
    priority,
    images: [`${SITE_URL}/og/${p === "" ? "home" : p.slice(1)}.png`],
  }))
}
