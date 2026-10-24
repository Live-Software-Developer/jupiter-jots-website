import { pageMetadata } from "@/lib/seo"

/** Home page metadata; also the layout's default for any page that sets none. */
export const HOME_SEO = pageMetadata({
  title: "Jupiter Jots | Bookmark manager for Chrome with notes",
  socialTitle: "Jupiter Jots: save the page, keep the reason",
  description:
    "A free Chrome bookmark manager that remembers why you saved each page. Nested collections, notes, and Ask Jupiter with your own AI key. Your library stays on your device.",
  path: "/",
  image: "home",
  imageAlt: "Jupiter Jots: save the page, keep the reason",
  keywords: ["bookmark manager for Chrome", "save web pages", "nested bookmark folders", "Ask Jupiter", "Jupiter Jots MCP", "import Chrome bookmarks"],
})
