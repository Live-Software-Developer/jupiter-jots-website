import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import type { PublicShare, SharePayload } from "@/lib/share/types"

import { ShareHero } from "./ShareHero"

const share = (over: Partial<PublicShare> = {}): PublicShare => ({
  slug: "abcdefghij",
  visibility: "public",
  title: "Crypto: from learning to trading",
  curator_name: "Alpha",
  summary: "1 graph · 2 collections",
  payload: "",
  salt: "",
  kdf_iters: 0,
  comment_mode: "open",
  locked: false,
  created_at: "2026-10-24T10:00:00Z",
  updated_at: "2026-10-24T10:00:00Z",
  expires_at: null,
  comment_count: 0,
  ...over,
})

const payload: SharePayload = {
  v: 1,
  title: "Crypto: from learning to trading",
  intro: "A reading path through my crypto bookmarks.",
  curator: { name: "Alpha" },
  items: [],
}

describe("ShareHero", () => {
  it("shows the public share summary used by Explore", () => {
    const html = renderToStaticMarkup(<ShareHero share={share()} payload={payload} />)
    expect(html).toContain("1 graph · 2 collections")
  })

  it("does not show the summary on an unlisted share", () => {
    const html = renderToStaticMarkup(<ShareHero share={share({ visibility: "unlisted" })} payload={payload} />)
    expect(html).not.toContain("1 graph · 2 collections")
  })

  it("keeps the intro and title", () => {
    const html = renderToStaticMarkup(<ShareHero share={share()} payload={payload} />)
    expect(html).toContain("Crypto: from learning to trading")
    expect(html).toContain("A reading path through my crypto bookmarks.")
  })
})
