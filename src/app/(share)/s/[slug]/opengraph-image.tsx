import { ImageResponse } from "next/og"

export const alt = "A collection shared with Jupiter Jots"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// og/template.html's palette in hex (the image renderer has no oklch).
const BG = "#fdfcfe"
const INK = "#1d1825"
const MUTED = "#6e6878"
const PRIMARY = "#7b3fe4"

const TITLE = "Shared with Jupiter Jots"
const BODY = "Bookmarks, collections and reading paths, with a note on why each one matters."

/**
 * One branded card for every share. It must not fetch the share: each fetch counts as a view,
 * and crawlers would use up a view-limited share. The share's title reaches previews through
 * generateMetadata, which shares the page's fetch.
 */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: BG, color: INK, padding: "72px 80px", position: "relative" }}>
        <div style={{ display: "flex", fontSize: 24, color: MUTED }}>
          <span style={{ color: PRIMARY, fontWeight: 600 }}>Jupiter Jots</span>
          <span style={{ marginLeft: 12 }}>· Shared page</span>
        </div>
        <div style={{ display: "flex", marginTop: "auto", fontSize: 84, lineHeight: 1.08, letterSpacing: -1.5 }}>{TITLE}</div>
        <div style={{ display: "flex", marginTop: 24, marginBottom: 24, fontSize: 28, color: MUTED }}>{BODY}</div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 10, background: PRIMARY }} />
      </div>
    ),
    size,
  )
}
