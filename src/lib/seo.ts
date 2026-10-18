import type { Metadata } from "next"

import { SITE } from "@/lib/site"

/**
 * Search terms every page carries; page-specific terms go first. Engines mostly ignore
 * the keywords tag, so titles, descriptions and headings do the real work.
 */
const BASE_KEYWORDS = [
  "Jupiter Jots",
  "bookmark manager",
  "Chrome bookmark manager",
  "bookmark extension",
  "save pages with notes",
  "local-first bookmarks",
]

interface PageSeo {
  /** Full <title>, used as is. Keep it under about 60 characters. */
  title: string
  /** 140 to 160 characters, leading with what the page answers. */
  description: string
  /** Path starting with "/" ("/" for home). */
  path: string
  keywords?: string[]
  /** File in public/og/ without extension (rendered by og/build.py). */
  image: string
  imageAlt: string
  /** Shorter title for social cards when the <title> carries extra search terms. */
  socialTitle?: string
}

/** Complete metadata for one page: Next merges metadata shallowly, so every page sets all of it. */
export function pageMetadata(seo: PageSeo): Metadata {
  const images = [{ url: `/og/${seo.image}.png`, width: 1200, height: 630, alt: seo.imageAlt, type: "image/png" }]
  const socialTitle = seo.socialTitle ?? seo.title
  return {
    title: { absolute: seo.title },
    description: seo.description,
    keywords: [...(seo.keywords ?? []), ...BASE_KEYWORDS],
    alternates: { canonical: seo.path },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      locale: "en_GB",
      url: seo.path,
      title: socialTitle,
      description: seo.description,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: seo.description,
      images,
    },
  }
}
