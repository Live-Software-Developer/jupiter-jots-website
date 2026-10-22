"use client"

import { useEffect, useRef, useState } from "react"

/** Copies the page URL; with `hash`, the URL of that anchor on the page instead. */
export function CopyLinkButton({ className, hash }: { className: string; hash?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  async function copy() {
    try {
      const url = new URL(window.location.href)
      if (hash) url.hash = hash
      await navigator.clipboard.writeText(url.href)
      setCopied(true)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button type="button" onClick={copy} className={className} aria-live="polite">
      {copied ? "Copied" : "Copy link"}
    </button>
  )
}
