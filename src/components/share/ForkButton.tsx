"use client"

import { useEffect, useId, useRef, useState } from "react"

import { CopyLinkButton } from "@/components/share/CopyLinkButton"
import { FOCUS, FOCUS_FLAT } from "@/components/site/styles"
import { STORE_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

import { GLYPH, ico } from "./icons"

/** The slice of `chrome.runtime` Chrome gives a page that an installed extension lists in externally_connectable. */
type PageRuntime = {
  lastError?: { message?: string }
  sendMessage: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void
}

/** How long to wait for the extension before assuming it is not installed. */
const ANSWER_MS = 1500

/**
 * One message to the installed extension; undefined when there is no extension to answer
 * (another browser, not installed, disabled, or too slow).
 */
function sendToExtension(extensionId: string, message: unknown): Promise<unknown> {
  const runtime = (globalThis as { chrome?: { runtime?: PageRuntime } }).chrome?.runtime
  if (!extensionId || typeof runtime?.sendMessage !== "function") return Promise.resolve(undefined)
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ANSWER_MS)
    try {
      runtime.sendMessage(extensionId, message, (response) => {
        clearTimeout(timer)
        // Reading lastError tells Chrome the failure was handled.
        resolve(runtime.lastError ? undefined : response)
      })
    } catch {
      clearTimeout(timer)
      resolve(undefined)
    }
  })
}

const isOk = (r: unknown) => typeof r === "object" && r !== null && (r as { ok?: unknown }).ok === true

type Phase = "idle" | "checking" | "opening" | "help"

/**
 * "Save to Jupiter Jots": hands the share's slug to the installed extension, which opens its
 * fork screen (nothing is imported until the reader presses Save there, and a private share's
 * password is typed in the extension, never passed from this page). Without the extension it
 * explains how to import the link by hand. NEXT_PUBLIC_JJ_EXTENSION_ID unset: help only.
 */
export function ForkButton({ slug }: { slug: string }) {
  const [phase, setPhase] = useState<Phase>("idle")
  const panelId = useId()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  async function save() {
    if (phase === "help") return setPhase("idle")
    if (phase !== "idle") return
    setPhase("checking")
    const extensionId = process.env.NEXT_PUBLIC_JJ_EXTENSION_ID ?? ""
    const ping = await sendToExtension(extensionId, { type: "jj:ping" })
    if (!isOk(ping)) return setPhase("help")
    const opened = await sendToExtension(extensionId, { type: "jj:fork-share", slug })
    if (!isOk(opened)) return setPhase("help")
    setPhase("opening")
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setPhase("idle"), 4000)
  }

  const busy = phase === "checking" || phase === "opening"

  return (
    <div>
      <button
        type="button"
        onClick={save}
        aria-busy={busy || undefined}
        aria-expanded={phase === "help"}
        aria-controls={panelId}
        className={cn(
          "inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent",
          FOCUS,
        )}
      >
        {ico(GLYPH.bookmark)}
        <span aria-live="polite">{phase === "opening" ? "Opening Jupiter Jots…" : "Save to Jupiter Jots"}</span>
      </button>
      {phase === "help" ? (
        <div id={panelId} role="region" aria-label="Save this share" className="mt-2 rounded-xl border border-border bg-card p-4 text-card-foreground">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Install Jupiter Jots, then use Import → Import a share and paste this link.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyLinkButton
              className={cn(
                "inline-flex h-9 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium transition-colors hover:bg-accent",
                FOCUS_FLAT,
              )}
            />
            <a
              href={STORE_URL}
              target="_blank"
              rel="noopener"
              className={cn(
                "inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium whitespace-nowrap text-primary-foreground transition-colors hover:bg-primary/90",
                FOCUS,
              )}
            >
              Add to Chrome
              {ico(GLYPH.external, "size-3.5")}
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}
