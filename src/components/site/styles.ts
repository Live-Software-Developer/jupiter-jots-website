/** Class strings shared across the site, copied from the TaskFlow design. */

export const FOCUS =
  "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"

export const FOCUS_FLAT = "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"

/** Pill buttons. Sizes from the design: lg (h-12, hero), md (h-10, page footers), sm (h-9, header). */
export const btnPrimary = (size: "sm" | "md" | "lg" = "md") =>
  `inline-flex ${SIZE[size]} shrink-0 items-center justify-center gap-2 rounded-full bg-primary font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90 ${FOCUS}`

export const btnSecondary = (size: "sm" | "md" | "lg" = "md") =>
  `inline-flex ${SIZE[size]} shrink-0 items-center justify-center rounded-full border border-border bg-background font-medium whitespace-nowrap transition-colors hover:bg-accent ${FOCUS_FLAT}`

const SIZE = {
  sm: "h-9 px-4 text-sm",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-6 text-base",
}

/** Text link in body copy. */
export const textLink = `rounded font-medium text-primary underline-offset-4 hover:underline ${FOCUS_FLAT}`
