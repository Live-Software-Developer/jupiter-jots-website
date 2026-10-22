export type ShareHue = "violet" | "cyan" | "amber" | "rose" | "sage"

export type SharedBookmark = {
  title: string
  domain: string
  note: string
  tags: string[]
  meta: string
  hue: ShareHue
  href: string
}

export const SHARE_CURATOR = {
  name: "Ada Okafor",
  role: "Product designer · Nairobi",
  initials: "AO",
  note: "I keep a running shelf of the writing that changes how I build. If it is here, it earned the spot.",
} as const

export const SHARED_COLLECTION = {
  title: "Weekend reading: systems, type & the web",
  description:
    "The shelf I actually finish. Long reads on the web platform, type, and the small systems decisions that keep a product honest.",
  shared: "2 days ago",
  updated: "18 Oct 2026",
  updatedLabel: "2 days ago",
  expires: "Never",
} as const

export const SHARED_BOOKMARKS: SharedBookmark[] = [
  {
    title: "An interactive guide to flexbox",
    domain: "joshwcomeau.com",
    note: "Twenty-eight interactive demos. The one that finally made flex-basis and min-width click.",
    tags: ["css", "layout"],
    meta: "18 min",
    hue: "cyan",
    href: "https://www.joshwcomeau.com/css/interactive-guide-to-flexbox/",
  },
  {
    title: "The Grug Brained Developer",
    domain: "grugbrain.dev",
    note: "A layman's guide to thinking like the self-aware smol brained. Complexity is the enemy.",
    tags: ["engineering", "craft"],
    meta: "12 min",
    hue: "amber",
    href: "https://grugbrain.dev/",
  },
  {
    title: "Core Web Vitals, explained properly",
    domain: "web.dev",
    note: "INP replaced FID and the mental model moved with it. The clearest walkthrough I have found.",
    tags: ["performance"],
    meta: "9 min",
    hue: "violet",
    href: "https://web.dev/articles/vitals",
  },
  {
    title: "On the nature of coupling",
    domain: "martinfowler.com",
    note: "Conway's Law, and why it keeps being right about systems and the teams that build them.",
    tags: ["architecture"],
    meta: "7 min",
    hue: "rose",
    href: "https://martinfowler.com/ieeeSoftware/coupling.pdf",
  },
  {
    title: "SQLite is not a toy database",
    domain: "sqlite.org",
    note: "Why an embedded database is enough for most apps, and the storage layer underneath it.",
    tags: ["systems", "storage"],
    meta: "15 min",
    hue: "sage",
    href: "https://www.sqlite.org/whentouse.html",
  },
  {
    title: "Resilient Web Design",
    domain: "resilientwebdesign.com",
    note: "A short book on designing for the web's grain: progressive enhancement as a way of thinking.",
    tags: ["web", "design"],
    meta: "20 min",
    hue: "cyan",
    href: "https://resilientwebdesign.com/",
  },
]

export const ALSO_SHARED: SharedBookmark[] = [
  {
    title: "How to Do Great Work",
    domain: "paulgraham.com",
    note: "Read it once a year. The section on curiosity as a compass is the part I keep coming back to.",
    tags: ["essays", "work"],
    meta: "28 min",
    hue: "violet",
    href: "https://paulgraham.com/greatwork.html",
  },
  {
    title: "A design system is a product",
    domain: "alistapart.com",
    note: "Treat the system as something people use, not something the design team ships and forgets.",
    tags: ["design", "systems"],
    meta: "11 min",
    hue: "rose",
    href: "https://alistapart.com/article/design-systems/",
  },
]

export const SHARED_BOOKMARK = {
  title: "The Grug Brained Developer",
  domain: "grugbrain.dev",
  meta: "12 min read",
  saved: "Saved 3 days ago",
  tags: ["engineering", "craft", "complexity"],
  note: "Complexity is the enemy, and grug knows it in his bones. This is the essay I send to every engineer who wants to add a framework before we understand the problem.",
  href: "https://grugbrain.dev/",
  preview: "/share/grug-preview.svg",
  shared: "2 days ago",
  savedOn: "21 Oct 2026",
  expires: "Never",
} as const

export const PRIVATE_SHARE = {
  expires: "20 November 2026",
  expiresShort: "20 Nov 2026",
} as const
