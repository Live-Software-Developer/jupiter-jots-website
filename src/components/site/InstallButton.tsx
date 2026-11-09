"use client"

import Link from "next/link"

import { CheckIcon, PlusIcon } from "@/components/site/icons"
import { btnPrimary } from "@/components/site/styles"
import { installCta, useBrowser } from "@/lib/browser"
import { useExtensionPresence } from "@/lib/extension"
import { cn } from "@/lib/utils"

type Size = "sm" | "md" | "lg"

/**
 * The install CTA: "Add to Brave" / "Add to Edge" / … (Chrome Web Store) in Chromium browsers, an
 * honest "Available for Chrome, Edge & Brave" elsewhere, and a quiet "Installed" once the
 * extension answers. The server renders a neutral "Get the extension" and this refines after mount.
 */
export function InstallButton({ size = "md", className, compact, icon = true, label }: { size?: Size; className?: string; compact?: boolean; icon?: boolean; label?: string }) {
  const browser = useBrowser()
  const presence = useExtensionPresence()

  if (presence === "installed")
    return (
      <span
        className={cn(btnPrimary(size), "border border-border bg-background text-muted-foreground hover:bg-background", className)}
        title={`Jupiter Jots is installed in ${browser.name}`}
      >
        <CheckIcon />
        Installed
      </span>
    )

  const cta = installCta(browser, compact)
  const content = (
    <>
      {icon ? <PlusIcon /> : null}
      {label ?? cta.label}
    </>
  )
  const cls = cn(btnPrimary(size), className)
  return cta.external ? (
    <a href={cta.href} target="_blank" rel="noopener" className={cls}>
      {content}
      <span className="sr-only"> (opens the Chrome Web Store in a new tab)</span>
    </a>
  ) : (
    <Link href={cta.href} className={cls}>
      {content}
    </Link>
  )
}
