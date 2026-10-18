import { pageMetadata } from "@/lib/seo"

/** Home page metadata; also the layout's default for any page that sets none. */
export const HOME_SEO = pageMetadata({
  title: "Jupiter Jots | Bookmark manager for Chrome with notes",
  socialTitle: "Jupiter Jots: save the page, keep the reason",
  description:
    "A free bookmark manager for Chrome. Save any page in one click with a note on why it mattered, sort it into nested collections, and keep it all on your device.",
  path: "/",
  image: "home",
  imageAlt: "Jupiter Jots: save the page, keep the reason",
  keywords: ["bookmark manager for Chrome", "save web pages", "nested bookmark folders", "import Chrome bookmarks"],
})
