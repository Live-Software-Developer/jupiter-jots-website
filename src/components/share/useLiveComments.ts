"use client"

import { useEffect, useRef } from "react"

/** The slice of umbral's realtime client (`/realtime/client.js`) we use. */
interface UmbralRealtime {
  subscribe(groups: string, handlers: Record<string, (data: unknown) => void>): { unsubscribe(): void }
}
type UmbralWindow = Window & { umbral?: { realtime?: UmbralRealtime } }

export interface LiveHandlers {
  comment(data: unknown): void
  comment_updated(data: unknown): void
  comment_hidden(data: unknown): void
}

const POLL_MS = 30_000
const SCRIPT_TIMEOUT_MS = 10_000

const realtime = () => (window as UmbralWindow).umbral?.realtime

function scriptSrc(): string {
  const base = (process.env.NEXT_PUBLIC_JJ_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "")
  return `${base}/realtime/client.js`
}

let loading: Promise<UmbralRealtime> | null = null

/**
 * Loads umbral's realtime client once per page. A failed or timed-out load is forgotten (and
 * its tag removed) so a later mount can try again.
 */
function loadRealtime(): Promise<UmbralRealtime> {
  const ready = realtime()
  if (ready?.subscribe) return Promise.resolve(ready)
  if (loading) return loading
  loading = new Promise<UmbralRealtime>((resolve, reject) => {
    const script = document.createElement("script")
    script.src = scriptSrc()
    script.async = true
    script.dataset.umbralRealtime = ""
    const fail = () => {
      clearTimeout(timer)
      script.remove()
      loading = null
      reject(new Error("realtime client unavailable"))
    }
    const timer = setTimeout(fail, SCRIPT_TIMEOUT_MS)
    script.onload = () => {
      clearTimeout(timer)
      const rt = realtime()
      if (rt?.subscribe) resolve(rt)
      else fail()
    }
    script.onerror = fail
    document.head.append(script)
  })
  return loading
}

/**
 * Live comment events for one share: subscribes to `public:share:{slug}` through umbral's
 * realtime client. If the client cannot be loaded, calls `poll` every 30 s instead. Handlers
 * and `poll` are read through refs, so passing new functions each render does not resubscribe.
 * The effect's cleanup cancels a pending load, so StrictMode's double mount subscribes once.
 */
export function useLiveComments(slug: string, handlers: LiveHandlers, poll: () => void) {
  const handlersRef = useRef(handlers)
  const pollRef = useRef(poll)
  useEffect(() => {
    handlersRef.current = handlers
    pollRef.current = poll
  })

  useEffect(() => {
    let cancelled = false
    let unsubscribe: (() => void) | null = null
    let timer: ReturnType<typeof setInterval> | null = null

    loadRealtime().then(
      (rt) => {
        if (cancelled) return
        const sub = rt.subscribe(`public:share:${slug}`, {
          comment: (d) => handlersRef.current.comment(d),
          comment_updated: (d) => handlersRef.current.comment_updated(d),
          comment_hidden: (d) => handlersRef.current.comment_hidden(d),
        })
        unsubscribe = () => sub.unsubscribe()
      },
      () => {
        if (cancelled) return
        timer = setInterval(() => pollRef.current(), POLL_MS)
      },
    )

    return () => {
      cancelled = true
      unsubscribe?.()
      if (timer) clearInterval(timer)
    }
  }, [slug])
}
