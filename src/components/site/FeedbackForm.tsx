"use client"

import { useState, type FormEvent } from "react"

import { useBrowser } from "@/lib/browser"
import { apiBase } from "@/lib/share/api"
import { btnPrimary, FOCUS_FLAT } from "@/components/site/styles"

type Kind = "bug" | "idea" | "other"

const KINDS: [Kind, string, string][] = [
  ["bug", "Something’s broken", "What did you do, what happened, and what did you expect? Popup, side panel or full-screen library?"],
  ["idea", "An idea", "What would you like Jupiter Jots to do, and what would it help you with?"],
  ["other", "Something else", "A question, praise, or something you’d like removed."],
]

const FIELD = `w-full rounded-lg border border-input bg-background px-3 py-2 text-base ${FOCUS_FLAT}`

/**
 * Feedback straight to the team, stored with the extension's (same endpoint, `source: website`),
 * so problems reach us instead of ending up in a store review. Sends the browser's name and this
 * page's path, nothing else.
 */
export function FeedbackForm() {
  const browser = useBrowser()
  const [kind, setKind] = useState<Kind>("bug")
  const [message, setMessage] = useState("")
  const [contact, setContact] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle")
  const [error, setError] = useState("")

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (message.trim().length < 10) return setError("Tell us a little more (at least 10 characters).")
    const base = apiBase()
    if (!base) return setError("Feedback isn’t available right now. Please email us instead.")
    setState("sending")
    setError("")
    try {
      const res = await fetch(`${base}/api/sharing/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message: message.trim(), contact: contact.trim(), source: "website", browser: browser.name.slice(0, 40), page: window.location.pathname.slice(0, 300) }),
      })
      if (res.status === 429) throw new Error("That’s a lot of feedback in one hour. Try again a little later.")
      if (!res.ok) throw new Error("Couldn’t send it. Try again in a moment, or email us.")
      setState("sent")
    } catch (err) {
      setError(err instanceof TypeError ? "Couldn’t reach Jupiter Jots. Check your connection, or email us." : err instanceof Error ? err.message : "Couldn’t send it.")
      setState("idle")
    }
  }

  if (state === "sent")
    return (
      <div role="status" className="rounded-xl border border-border bg-muted/50 p-5 sm:p-6">
        <p className="text-lg font-semibold">Thank you, it’s with us</p>
        <p className="mt-1 leading-7 text-muted-foreground">We read every message.{contact.trim() ? " If we need more, we’ll get in touch." : ""}</p>
        <button
          type="button"
          className={`mt-4 rounded-sm font-medium text-primary underline-offset-4 hover:underline ${FOCUS_FLAT}`}
          onClick={() => {
            setMessage("")
            setState("idle")
          }}
        >
          Send something else
        </button>
      </div>
    )

  return (
    <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4 rounded-xl border border-border p-5 sm:p-6">
      <fieldset>
        <legend className="text-sm font-medium">What is it about</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map(([k, label]) => (
            <label
              key={k}
              className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring ${kind === k ? "border-primary bg-primary/10 font-medium text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-message" className="text-sm font-medium">
          Your message
        </label>
        <textarea id="fb-message" rows={6} maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder={KINDS.find(([k]) => k === kind)![2]} className={FIELD} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="fb-contact" className="text-sm font-medium">
          Email or handle <span className="font-normal text-muted-foreground">(optional, if you’d like a reply)</span>
        </label>
        <input id="fb-contact" type="text" maxLength={200} autoComplete="email" value={contact} onChange={(e) => setContact(e.target.value)} className={FIELD} />
      </div>
      <p className="text-sm text-muted-foreground">Sent with it: your browser’s name and this page’s address. Nothing from your library.</p>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div>
        <button type="submit" disabled={state === "sending"} className={btnPrimary("md")}>
          {state === "sending" ? "Sending…" : "Send feedback"}
        </button>
      </div>
    </form>
  )
}
