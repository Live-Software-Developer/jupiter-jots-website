import { PLATFORM_LABELS, PLATFORM_LOGOS, type PlatformKey } from "@/components/site/platform-logos"
import { cn } from "@/lib/utils"

/**
 * A platform's brand mark. Gradient ids repeat across the logos (a, b, c...), so each one is
 * prefixed with its platform name; one logo per platform per page keeps them unique.
 */
export function PlatformLogo({ name, className, label }: { name: PlatformKey; className?: string; label?: string }) {
  const p = `pl-${name}-`
  const svg = PLATFORM_LOGOS[name]
    .replace(/id="([^"]+)"/g, (_, id) => `id="${p}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${p}${id})`)
    .replace(/href="#([^"]+)"/g, (_, id) => `href="#${p}${id}"`)
    .replace("<svg ", '<svg class="block size-full" aria-hidden="true" focusable="false" ')
  return (
    <span
      role="img"
      aria-label={label ?? PLATFORM_LABELS[name]}
      className={cn("inline-block shrink-0", className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
