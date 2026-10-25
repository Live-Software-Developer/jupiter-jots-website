import { BrandLogo } from "@/components/site/BrandLogo"
import { FOCUS_FLAT } from "@/components/site/styles"
import { cn } from "@/lib/utils"

/**
 * The /features hero picture: your library as the planet, with what it reaches on two orbits.
 * The inner ring is where you use it (popup, side panel, full screen); the outer ring is what
 * goes further (notes, graphs, shares, Ask Jupiter, terminal agents). Each moon is a jump link.
 */
const MOONS: { label: string; href: string; ring: "inner" | "outer"; angle: number }[] = [
  { label: "Popup", href: "#save", ring: "inner", angle: -90 },
  { label: "Side panel", href: "#save", ring: "inner", angle: 0 },
  { label: "Full screen", href: "#find", ring: "inner", angle: 180 },
  { label: "Notes", href: "#notes", ring: "outer", angle: -145 },
  { label: "Graphs", href: "#graphs", ring: "outer", angle: -35 },
  { label: "Share links", href: "#share", ring: "outer", angle: 35 },
  { label: "Ask Jupiter", href: "#ask", ring: "outer", angle: 90 },
  { label: "Terminal agents", href: "#agents", ring: "outer", angle: 145 },
]

/** Radii as a fraction of the box's half-width; the orbits are drawn as ellipses (y squashed). */
const R = { inner: 0.62, outer: 0.88 }
const SQUASH = 0.62

export function Orbit({ className }: { className?: string }) {
  return (
    <nav aria-label="Jump to a part of Jupiter Jots" className={cn("relative mx-auto aspect-[1/0.8] w-full max-w-lg", className)}>
      <svg viewBox="-100 -80 200 160" className="absolute inset-0 size-full" aria-hidden="true">
        <defs>
          <radialGradient id="orbit-glow">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle r="46" fill="url(#orbit-glow)" />
        <ellipse rx={R.inner * 100} ry={R.inner * 100 * SQUASH} fill="none" stroke="var(--border)" strokeWidth="0.6" />
        <ellipse rx={R.outer * 100} ry={R.outer * 100 * SQUASH} fill="none" stroke="var(--border)" strokeWidth="0.6" strokeDasharray="1.5 2.5" />
      </svg>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <BrandLogo className="size-12 drop-shadow-xl sm:size-20" />
      </div>
      <ul>
        {MOONS.map((m) => {
          const rad = (m.angle * Math.PI) / 180
          const r = R[m.ring]
          // Percent of the box: x spans the full width, y the squashed orbit within the 0.8 height.
          const left = 50 + 50 * r * Math.cos(rad)
          const top = 50 + (50 / 0.8) * r * SQUASH * Math.sin(rad)
          // Moons near the sides hang inwards from their point, so no label leaves the box.
          const shift = left > 70 ? "-translate-x-[85%]" : left < 30 ? "-translate-x-[15%]" : "-translate-x-1/2"
          return (
            <li key={m.label} className={cn("absolute -translate-y-1/2", shift)} style={{ left: `${left}%`, top: `${top}%` }}>
              <a
                href={m.href}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium whitespace-nowrap shadow-sm transition-colors sm:h-8 sm:px-3 sm:text-sm",
                  m.ring === "inner"
                    ? "border-primary/30 bg-card text-foreground shadow-primary/10 hover:border-primary"
                    : "border-border bg-background text-muted-foreground hover:text-foreground",
                  FOCUS_FLAT,
                )}
              >
                <span className={cn("size-1.5 rounded-full", m.ring === "inner" ? "bg-primary" : "bg-muted-foreground/60")} aria-hidden="true" />
                {m.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
