import type { Metadata } from "next"

import { ShareBadge } from "@/components/share/Share"
import { SharePasswordForm } from "@/components/share/SharePasswordForm"
import { PRIVATE_SHARE } from "@/lib/share"
import { pageMetadata } from "@/lib/seo"

const SHARE_SEO = pageMetadata({
  title: "Protected share · Jupiter Jots",
  description:
    "A private Jupiter Jots collection, locked with a password. Enter the password the curator sent you to open it.",
  path: "/share/private",
  image: "share-private",
  imageAlt: "A password-protected Jupiter Jots share",
})

export const metadata: Metadata = { ...SHARE_SEO, robots: { index: false, follow: false, nocache: true } }


export default function SharePrivatePage() {
  return (
    <main className="relative flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50 blur-md select-none" aria-hidden="true">
        <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
          <div className="h-6 w-28 rounded-full bg-muted" />
          <div className="mt-5 h-10 w-3/4 rounded-xl bg-muted" />
          <div className="mt-4 h-4 w-1/2 rounded-full bg-muted" />
          <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
            <div className="divide-y divide-border">
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="size-9 shrink-0 rounded-lg bg-muted" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-2/3 rounded bg-muted" />
                  <div className="mt-2 h-3 w-11/12 rounded bg-muted" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-muted" />
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="size-9 shrink-0 rounded-lg bg-muted" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-1/2 rounded bg-muted" />
                  <div className="mt-2 h-3 w-4/5 rounded bg-muted" />
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="size-9 shrink-0 rounded-lg bg-muted" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-3/5 rounded bg-muted" />
                  <div className="mt-2 h-3 w-10/12 rounded bg-muted" />
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="size-9 shrink-0 rounded-lg bg-muted" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-2/5 rounded bg-muted" />
                  <div className="mt-2 h-3 w-5/6 rounded bg-muted" />
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 sm:p-5">
                <div className="size-9 shrink-0 rounded-lg bg-muted" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-1/2 rounded bg-muted" />
                  <div className="mt-2 h-3 w-3/4 rounded bg-muted" />
                </div>
              </div>
            </div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="h-24 rounded-2xl bg-muted" />
            <div className="h-24 rounded-2xl bg-muted" />
            <div className="h-24 rounded-2xl bg-muted" />
          </div>
        </div>
      </div>

      <div className="absolute inset-0 bg-background/45" aria-hidden="true" />

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-border bg-card/95 p-7 text-card-foreground shadow-2xl shadow-foreground/10 backdrop-blur-md sm:p-9">
          <ShareBadge tone="private" />

          <div className="mt-5 grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-6"
              aria-hidden="true"
            >
              <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
              <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
            </svg>
          </div>

          <h1 className="mt-4 font-serif text-3xl leading-tight font-normal tracking-tight text-balance">This share is protected.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Ada Okafor shared a collection with six bookmarks. Enter the password she sent you to open it.
          </p>

          <SharePasswordForm />

          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">The password is checked in your browser. Jupiter Jots never sees it.</p>

          <div className="mt-6 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground">No password? Ask Ada to send a new link.</p>
            <p className="mt-1.5 text-xs text-muted-foreground">This link expires on {PRIVATE_SHARE.expires}.</p>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">A private Jupiter Jots share</p>
      </div>
    </main>
  )
}
