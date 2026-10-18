import Image from "next/image"

import { cn } from "@/lib/utils"

/**
 * Real screenshots of the extension, taken from the TaskFlow design surface at 2x and kept in
 * public/shots/ as WebP. next/image serves resized copies; width and height are the files' own.
 */
export const SHOTS = {
  search: {
    src: "/shots/search.webp",
    width: 2560,
    height: 1600,
    alt: "Search in the full-screen library: 18 results for replication, matched in titles and in the notes you wrote",
  },
  save: {
    src: "/shots/save.webp",
    width: 760,
    height: 1280,
    alt: "Saving a page with details: title, collection, tags and a note on why you saved it, with a notice that it was saved before",
  },
  library: {
    src: "/shots/library.webp",
    width: 2560,
    height: 1600,
    alt: "The Jupiter Jots library in full screen: collections and tags in the sidebar, and bookmarks as cards with notes and tags",
  },
  popup: {
    src: "/shots/popup.webp",
    width: 760,
    height: 1200,
    alt: "The toolbar popup: save the current page in one click, search, and see recently saved bookmarks",
  },
  sidepanel: {
    src: "/shots/sidepanel.webp",
    width: 800,
    height: 1520,
    alt: "The side panel: search, filters and your bookmark list beside the page you are reading",
  },
  collection: {
    src: "/shots/collection.webp",
    width: 2560,
    height: 1600,
    alt: "The Engineering collection, with its nested collections Web Development, AI and Machine Learning, and System Design",
  },
  import: {
    src: "/shots/import.webp",
    width: 2560,
    height: 1600,
    alt: "Import from Chrome: pick bookmark folders, 21 duplicates are skipped and 327 bookmarks are added as new collections",
  },
  insights: {
    src: "/shots/insights.webp",
    width: 2560,
    height: 1800,
    alt: "Insights in dark mode: 308 links opened this month, opens per day, and opens by collection",
  },
} as const

export type ShotName = keyof typeof SHOTS

export function Shot({
  name,
  sizes,
  className,
  priority = false,
}: {
  name: ShotName
  /** The rendered width at each breakpoint, so the browser picks the right file. */
  sizes: string
  className?: string
  /** The hero pair: preloaded in <head> (Next 16 replaced `priority` with `preload`). */
  priority?: boolean
}) {
  const s = SHOTS[name]
  return (
    <Image
      src={s.src}
      width={s.width}
      height={s.height}
      alt={s.alt}
      sizes={sizes}
      quality={85}
      preload={priority}
      className={cn("block h-auto w-full bg-muted", className)}
    />
  )
}
