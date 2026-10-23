"use client"

import { useId, useState } from "react"

import { btnPrimary, btnSecondary, FOCUS_FLAT } from "@/components/site/styles"
import { reportShare } from "@/lib/share/api"
import { cn } from "@/lib/utils"

const FIELD =
  "mt-1 block w-full resize-y rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none"

/** "Report this share": a short reason, sent to the operators' queue. One report per visitor. */
export function ReportShare({ slug, className }: { slug: string; className?: string }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error" | "throttled">("idle")

  if (state === "sent") {
    return (
      <p role="status" className={cn("text-xs text-muted-foreground", className)}>
        Thanks. We’ll take a look.
      </p>
    )
  }
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn("rounded text-muted-foreground underline-offset-4 hover:text-foreground hover:underline", FOCUS_FLAT, className)}
      >
        Report this share
      </button>
    )
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault()
    setState("sending")
    const res = await reportShare(slug, reason.trim())
    setState(res.ok ? "sent" : res.status === 429 ? "throttled" : "error")
  }

  return (
    <form onSubmit={send} className={cn("text-left text-sm", className)}>
      <label htmlFor={`${id}-reason`} className="text-xs font-medium text-muted-foreground">
        What’s wrong with it? <span className="font-normal">(optional)</span>
      </label>
      <textarea
        id={`${id}-reason`}
        rows={3}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Spam, illegal content, someone else’s work…"
        className={FIELD}
      />
      {(state === "error" || state === "throttled") && (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {state === "throttled" ? "Too many reports from your network. Try again later." : "Couldn’t send the report. Try again."}
        </p>
      )}
      <div className="mt-2 flex gap-2">
        <button type="submit" disabled={state === "sending"} className={btnPrimary("sm")}>
          {state === "sending" ? "Sending…" : "Send report"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className={btnSecondary("sm")}>
          Cancel
        </button>
      </div>
    </form>
  )
}
