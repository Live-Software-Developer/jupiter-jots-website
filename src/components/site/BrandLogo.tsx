import { cn } from "@/lib/utils"

/**
 * The Jupiter Jots mark (public/jj-logo.svg, the extension's logo). An <img> keeps the SVG's
 * clip and mask ids out of the page, so it can appear several times. Brand colours are fixed:
 * the logo looks the same in light and dark.
 */
export function BrandLogo({ className, label }: { className?: string; label?: string }) {
  return <img src="/jj-logo.svg" width={128} height={128} alt={label ?? ""} className={cn("block shrink-0", className)} />
}

/** Logo plus wordmark, as in the header, menu and footer. */
export function Wordmark() {
  return (
    <>
      <BrandLogo className="size-8" />
      <span className="text-lg leading-none font-semibold tracking-tight whitespace-nowrap" translate="no">
        Jupiter Jots
      </span>
    </>
  )
}
