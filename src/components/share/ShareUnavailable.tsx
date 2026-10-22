import Link from "next/link"

import { btnPrimary, btnSecondary } from "@/components/site/styles"

export type UnavailableReason = "missing" | "gone" | "error"

const COPY: Record<UnavailableReason, { title: string; body: string }> = {
  missing: {
    title: "This share doesn’t exist",
    body: "The link may be mistyped or cut short. Check it against the message it came in, or ask the person who sent it for a fresh one.",
  },
  gone: {
    title: "This share is no longer available",
    body: "The person who shared it turned the link off, or it expired or reached its view limit. Ask them to share it again.",
  },
  error: {
    title: "This share can’t be loaded right now",
    body: "Something went wrong on our side, not with your link. Try again in a moment.",
  },
}

/**
 * What a visitor sees instead of a share: unknown link (404), revoked or expired (410), or the
 * backend failing. The "error" state retries with `onRetry` (error boundary) or by reloading `slug`.
 */
export function ShareUnavailable({ reason, slug, onRetry }: { reason: UnavailableReason; slug?: string; onRetry?: () => void }) {
  const copy = COPY[reason]
  const retry = reason === "error" && (onRetry || slug)
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="font-serif text-4xl leading-tight font-normal tracking-tight text-balance sm:text-5xl">{copy.title}</h1>
      <p className="mt-4 text-lg leading-relaxed text-pretty text-muted-foreground">{copy.body}</p>
      <div className="mt-8 flex flex-wrap gap-2">
        {reason === "error" && onRetry ? (
          <button type="button" onClick={onRetry} className={btnPrimary("md")}>
            Try again
          </button>
        ) : reason === "error" && slug ? (
          // A plain anchor so the retry is a full reload and refetches the share.
          <a href={`/s/${encodeURIComponent(slug)}`} className={btnPrimary("md")}>
            Try again
          </a>
        ) : null}
        <Link href="/" className={retry ? btnSecondary("md") : btnPrimary("md")}>
          About Jupiter Jots
        </Link>
      </div>
    </main>
  )
}
