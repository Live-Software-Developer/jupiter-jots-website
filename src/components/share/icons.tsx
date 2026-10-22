import type { ReactNode } from "react"

/** A 24-unit stroked glyph from the share designs. Decorative: always aria-hidden. */
export const ico = (d: ReactNode, className = "size-4", strokeWidth = 1.7) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    {d}
  </svg>
)

/** Glyph paths shared by the share components; pass one to `ico`. */
export const GLYPH = {
  folder: <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H9l2 2.5h8.5A1.5 1.5 0 0 1 21 10v7.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />,
  graph: (
    <>
      <circle cx="6" cy="7" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="13" cy="18" r="2.5" />
      <path d="M8.4 7.6 15.6 6.4M7.6 9 11.6 16M17 8.4 14.2 15.8" />
    </>
  ),
  bookmark: <path d="M7 4h10v16l-5-3.5L7 20z" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  chevronRight: <path d="M9 6l6 6-6 6" />,
  external: <path d="M7 17 17 7M9 7h8v8" />,
  pin: <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v6" />,
  eyeOff: (
    <path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.7M6.6 7.6C4 9.3 2.5 12 2.5 12S6 18 12 18c1.6 0 3-.4 4.3-1" />
  ),
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  chat: <path d="M5 5.5h14v10H9.5L5 19z" />,
}

/** The padlock used for private shares (lock card, hero badge, "Lock again"). */
export const LockIcon = ({ className = "size-4" }: { className?: string }) => ico(GLYPH.lock, className)
