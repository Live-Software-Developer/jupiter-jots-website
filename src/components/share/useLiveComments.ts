"use client"

import { useEffect, useRef } from "react"

import { apiBase } from "@/lib/share/api"

export interface LiveHandlers {
  comment(data: unknown): void
  comment_updated(data: unknown): void
  comment_hidden(data: unknown): void
  /** A live share's content changed; the handler re-reads the share's public projection. */
  share_updated?(data: unknown): void
}

const POLL_MS = 30_000
const EVENTS = new Set<string>(["comment", "comment_updated", "comment_hidden", "share_updated"])

/**
 * Live events for one share over a direct, cross-origin EventSource to the API's
 * `/realtime/sse?groups=public:share:{slug}`. umbral sends every event as `event: u` with data
 * `{c: channel, e: event name, d: data}`; envelopes for other channels are ignored.
 *
 * The browser reconnects on its own after a transient error (readyState CONNECTING), and on
 * that reconnect `poll` and `catchUp` run once to catch up on anything the server's replay
 * buffer missed. Only when EventSource is missing or the stream is closed for good
 * (readyState CLOSED, e.g. a refused handshake) do they run every 30 s instead. Handlers,
 * `poll` and `catchUp` are read through refs, so new functions each render do not reopen the
 * stream; StrictMode's extra mount closes its stream in cleanup, leaving one open.
 */
export function useLiveComments(
  slug: string,
  handlers: LiveHandlers,
  poll: () => void,
  catchUp?: () => void,
) {
  const handlersRef = useRef(handlers)
  const pollRef = useRef(poll)
  const catchUpRef = useRef(catchUp)
  useEffect(() => {
    handlersRef.current = handlers
    pollRef.current = poll
    catchUpRef.current = catchUp
  })

  useEffect(() => {
    const base = apiBase()
    // A production build without a backend URL never renders a share, so there is nothing to follow.
    if (!base) return
    let timer: ReturnType<typeof setInterval> | null = null
    const catchUpNow = () => {
      pollRef.current()
      catchUpRef.current?.()
    }
    const startPolling = () => {
      timer ??= setInterval(catchUpNow, POLL_MS)
    }
    if (typeof EventSource === "undefined") {
      startPolling()
      return () => {
        if (timer) clearInterval(timer)
      }
    }

    const group = `public:share:${slug}`
    const es = new EventSource(`${base}/realtime/sse?groups=${encodeURIComponent(group)}`)
    let dropped = false
    es.addEventListener("u", (ev) => {
      let env: unknown
      try {
        env = JSON.parse((ev as MessageEvent<string>).data)
      } catch {
        return
      }
      if (!env || typeof env !== "object") return
      const { c, e, d } = env as { c?: unknown; e?: unknown; d?: unknown }
      if (c !== group || typeof e !== "string" || !EVENTS.has(e)) return
      const handler = handlersRef.current[e as keyof LiveHandlers]
      if (typeof handler === "function") handler(d)
    })
    es.onopen = () => {
      if (!dropped) return
      dropped = false
      catchUpNow()
    }
    es.onerror = () => {
      if (es.readyState === EventSource.CLOSED) {
        es.close()
        startPolling()
      } else dropped = true
    }

    return () => {
      es.close()
      if (timer) clearInterval(timer)
    }
  }, [slug])
}
