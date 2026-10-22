import { ImageResponse } from "next/og"

import { getShare } from "@/lib/share/api"

export const alt = "A collection shared with Jupiter Jots"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// og/template.html's palette in hex (the image renderer has no oklch).
const BG = "#fdfcfe"
const INK = "#1d1825"
const MUTED = "#6e6878"
const PRIMARY = "#7b3fe4"

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

/** Title, summary and curator for public shares; private and unavailable shares get a generic card. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const res = /^[a-z0-9]{10}$/.test(slug) ? await getShare(slug) : null
  const share = res?.status === "ok" && res.share.visibility === "public" ? res.share : null
  const title = share ? clip(share.title, 90) : "Shared with Jupiter Jots"
  const body = share
    ? [share.summary, share.curator_name && `Shared by ${share.curator_name}`].filter(Boolean).join(" · ")
    : "Bookmarks, collections and reading paths, with a note on why each one matters."

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: INK, padding: "72px 80px", position: "relative" }}>
        <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
          <span style={{ color: PRIMARY, fontWeight: 600 }}>Jupiter Jots</span>
          <span style={{ marginLeft: 12 }}>· Shared page</span>
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: title.length > 50 ? 68 : 84, lineHeight: 1.08, letterSpacing: -1.5 }}>{title}</div>
        <div style={{ display: "flex", marginTop: 24, marginBottom: 24, fontSize: 28, color: MUTED }}>{clip(body, 140)}</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: PRIMARY }} />
      </div>
    ),
    size,
  )
}
