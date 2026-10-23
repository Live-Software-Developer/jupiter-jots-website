import type { Visibility } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { GLYPH, ico } from "./icons"

/** What each visibility is called on the site (the extension's composer uses the same names). */
export const VISIBILITY_LABEL: Record<Visibility, string> = {
  unlisted: "Unlisted",
  public: "Public",
  private: "Password protected",
}

/** One line on who can reach a share; shown as the badge's tooltip. */
export const VISIBILITY_HINT: Record<Visibility, string> = {
  unlisted: "Only people with the link can open it. Not listed or shown in search engines.",
  public: "Listed on Explore and may appear in search engines.",
  private: "Needs the link and the password. Encrypted end to end.",
}

const STYLE: Record<Visibility, { glyph: keyof typeof GLYPH; tone: string }> = {
  unlisted: { glyph: "link", tone: "text-muted-foreground" },
  public: { glyph: "globe", tone: "text-primary" },
  private: { glyph: "lock", tone: "text-chart-3" },
}

/** The small pill in a share's header: "Public", "Unlisted" or "Password protected". */
export function VisibilityBadge({ visibility, className }: { visibility: Visibility; className?: string }) {
  const { glyph, tone } = STYLE[visibility]
  return (
    <span
      title={VISIBILITY_HINT[visibility]}
      data-visibility={visibility}
      className={cn("inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs font-medium", tone, className)}
    >
      {ico(GLYPH[glyph], "size-3.5")}
      {VISIBILITY_LABEL[visibility]}
    </span>
  )
}
