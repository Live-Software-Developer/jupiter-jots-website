"use client"

import { useEffect, useId, useRef, useState } from "react"

import { CopyLinkButton } from "@/components/share/CopyLinkButton"
import { InstallButton } from "@/components/site/InstallButton"
import { btnPrimary, btnSecondary } from "@/components/site/styles"
import { forkShare, useExtensionPresence } from "@/lib/extension"
import { cn } from "@/lib/utils"

import { GLYPH, ico } from "./icons"

type Phase = "idle" | "opening" | "opened" | "failed"
type Size = "sm" | "md"

/**
 * "Save to Jupiter Jots": hands the share's slug to the installed extension, which opens its
 * fork screen (nothing is imported until the reader presses Save there, and a private share's
 * password is typed in the extension, never passed from this page). If the extension does not
 * take it (e.g. an older version), the full button explains how to import the link by hand;
 * `compact` (the top bar) just says so on the button.
 */
export function ForkButton({ slug, size = "md", compact, className }: { slug: string; size?: Size; compact?: boolean; className?: string }) {
  const [phase, setPhase] = useState<Phase>("idle")
  const panelId = useId()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  const later = (next: Phase) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPhase(next), 4000)
  }

  async function save() {
    if (phase === "failed" && !compact) return setPhase("idle")
    if (phase === "opening") return
    setPhase("opening")
    if (await forkShare(slug)) {
      setPhase("opened")
      later("idle")
    } else {
      setPhase("failed")
      if (compact) later("idle")
    }
  }

  const text =
    phase === "opening" || phase === "opened"
      ? "Opening Jupiter Jots…"
      : phase === "failed" && compact
        ? "Couldn’t open"
        : compact
          ? "Save to Jj"
          : "Save to Jupiter Jots"

  return (
    <>
      <button
        type="button"
        onClick={save}
        aria-busy={phase === "opening" || undefined}
        aria-expanded={compact ? undefined : phase === "failed"}
        aria-controls={compact ? undefined : panelId}
        aria-label={compact && phase === "idle" ? "Save to Jupiter Jots" : undefined}
        className={cn(btnPrimary(size), className)}
      >
        {ico(GLYPH.bookmark)}
        <span aria-live="polite">{text}</span>
      </button>
      {!compact && phase === "failed" ? (
        <div id={panelId} role="region" aria-label="Save this share" className="order-last basis-full rounded-xl border border-border bg-card p-4 text-card-foreground">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Jupiter Jots didn’t open. In the extension, use Import → Import a share and paste this link.
          </p>
          <CopyLinkButton className={cn(btnSecondary("sm"), "mt-3")} />
        </div>
      ) : null}
    </>
  )
}

/**
 * A share page's main action: "Save to Jupiter Jots" when the extension is installed, otherwise
 * the install CTA ("Get Jupiter Jots", or the browser's "Add to …" in the top bar). Until the
 * ping answers, an invisible stand-in holds the space so nothing jumps. Without `slug` (the top
 * bar, sheets) it is read from the /s/<slug> URL; that only happens once the ping has answered,
 * which is after hydration, so the server never needs it.
 */
export function ShareCta({ slug, size = "md", compact, className }: { slug?: string; size?: Size; compact?: boolean; className?: string }) {
  const presence = useExtensionPresence()
  const s = presence === "installed" ? (slug ?? /^\/s\/([^/]+)/.exec(window.location.pathname)?.[1]) : undefined

  if (s) return <ForkButton slug={s} size={size} compact={compact} className={className} />
  return (
    <span className={cn("contents", presence === "unknown" && "[&>*]:invisible")} aria-hidden={presence === "unknown" || undefined}>
      <InstallButton size={size} compact={compact} label={compact ? undefined : "Get Jupiter Jots"} className={className} />
    </span>
  )
}
