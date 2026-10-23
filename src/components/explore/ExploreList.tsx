"use client"

import Form from "next/form"
import Link from "next/link"
import { type ReactNode, useState } from "react"

import { GLYPH, ico } from "@/components/share/icons"
import { StoreLink } from "@/components/site/ExternalStoreLink"
import { FOCUS, FOCUS_FLAT, btnPrimary, btnSecondary } from "@/components/site/styles"
import { EXPLORE_MAX_Q, getExplore } from "@/lib/share/api"
import { formatDate, initialsOf } from "@/lib/share/format"
import type { ExploreItem, ExploreResult } from "@/lib/share/types"
import { cn } from "@/lib/utils"

const FIELD =
  "h-11 w-full rounded-full border border-input bg-background pr-4 pl-10 text-base text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none sm:text-sm"

/**
 * The search box. A GET form to /explore, so it works before JavaScript loads and a search is
 * a shareable URL; with JavaScript, `next/form` turns the submit into a client navigation.
 */
export function ExploreSearch({ q }: { q: string }) {
  return (
    <Form action="/explore" role="search" className="flex gap-2">
      <label htmlFor="explore-q" className="sr-only">
        Search public shares
      </label>
      <div className="relative min-w-0 flex-1">
        <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground">
          {ico(GLYPH.search, "size-4")}
        </span>
        <input
          id="explore-q"
          name="q"
          type="search"
          defaultValue={q}
          maxLength={EXPLORE_MAX_Q}
          placeholder="Title or curator"
          autoComplete="off"
          enterKeyHint="search"
          className={FIELD}
        />
      </div>
      <button type="submit" className={btnPrimary("lg")}>
        Search
      </button>
    </Form>
  )
}

function ExploreCard({ item }: { item: ExploreItem }) {
  const updated = formatDate(item.updated_at)
  return (
    <li className="min-w-0">
      <Link
        href={`/s/${encodeURIComponent(item.slug)}`}
        className={cn(
          "group flex h-full flex-col rounded-2xl border border-border bg-card p-5 text-card-foreground transition-colors hover:border-foreground/25",
          FOCUS,
        )}
      >
        {item.summary ? <span className="truncate text-xs font-medium text-muted-foreground">{item.summary}</span> : null}
        <span className="mt-1.5 line-clamp-3 font-serif text-2xl leading-tight tracking-tight break-words text-balance group-hover:text-primary">
          {item.title}
        </span>
        <span className="mt-auto flex items-center gap-2.5 pt-5">
          {item.curator_name ? (
            <>
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary" aria-hidden="true">
                {initialsOf(item.curator_name)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.curator_name}</span>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">Shared on Jupiter Jots</span>
          )}
          {updated ? <span className="shrink-0 text-xs text-muted-foreground">Updated {updated}</span> : null}
        </span>
      </Link>
    </li>
  )
}

function Notice({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-border px-5 py-12 text-center sm:px-10 sm:py-16">
      <h2 className="font-serif text-3xl leading-tight tracking-tight text-balance">{title}</h2>
      <p className="mx-auto mt-3 max-w-lg leading-relaxed text-pretty text-muted-foreground">{children}</p>
      {action ? <div className="mt-6 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}

/** A full reload, so the server fetches the first page again. */
const retryHref = (q: string) => (q ? `/explore?q=${encodeURIComponent(q)}` : "/explore")

/**
 * The cards, from the server-rendered first page, plus "Load more" in the browser. Re-mounted
 * (by key) for each search, so a new `q` starts from its own first page.
 */
export function ExploreList({ q, initial }: { q: string; initial: ExploreResult }) {
  const [items, setItems] = useState<ExploreItem[]>(initial.status === "ok" ? initial.page.results : [])
  const [cursor, setCursor] = useState<string | null>(initial.status === "ok" ? initial.page.next_cursor : null)
  const [loading, setLoading] = useState(false)
  const [moreFailed, setMoreFailed] = useState<"down" | "error" | null>(null)

  if (initial.status === "down")
    return (
      <Notice
        title="Explore can’t reach our server"
        action={
          <a href={retryHref(q)} className={btnPrimary("md")}>
            Try again
          </a>
        }
      >
        The share server isn’t answering right now, so public shares can’t be listed. Links to shares still work once it is back. Try
        again in a moment.
      </Notice>
    )
  if (initial.status === "error")
    return (
      <Notice
        title="Explore can’t be loaded right now"
        action={
          <a href={retryHref(q)} className={btnPrimary("md")}>
            Try again
          </a>
        }
      >
        Something went wrong on our side, not on yours. Try again in a moment.
      </Notice>
    )
  if (!items.length && q)
    return (
      <Notice
        title="No public shares match"
        action={
          <Link href="/explore" className={btnSecondary("md")}>
            Clear search
          </Link>
        }
      >
        Nothing public has “{q}” in its title or curator name. Unlisted and password-protected shares are never listed, so they don’t
        appear in search.
      </Notice>
    )
  if (!items.length)
    return (
      <Notice
        title="No public shares yet"
        action={
          <StoreLink className={btnPrimary("md")}>
            Get Jupiter Jots
          </StoreLink>
        }
      >
        Shares appear here when their curators choose Public in Jupiter Jots. Unlisted and password-protected shares are never listed.
      </Notice>
    )

  async function loadMore() {
    if (!cursor || loading) return
    setLoading(true)
    setMoreFailed(null)
    const res = await getExplore({ q, cursor })
    setLoading(false)
    if (res.status !== "ok") {
      setMoreFailed(res.status)
      return
    }
    // A share edited while paging can come round twice; keep the first.
    setItems((prev) => {
      const seen = new Set(prev.map((i) => i.slug))
      return [...prev, ...res.page.results.filter((i) => !seen.has(i.slug))]
    })
    setCursor(res.page.next_cursor)
  }

  return (
    <div>
      {q ? (
        <p className="mb-4 text-sm text-muted-foreground" role="status">
          Showing public shares matching “<span className="text-foreground">{q}</span>”.{" "}
          <Link href="/explore" className={cn("rounded font-medium text-primary underline-offset-4 hover:underline", FOCUS_FLAT)}>
            Clear
          </Link>
        </p>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="Public shares">
        {items.map((item) => (
          <ExploreCard key={item.slug} item={item} />
        ))}
      </ul>
      <div className="mt-8 flex flex-col items-center gap-3" aria-live="polite">
        {moreFailed ? (
          <p className="text-sm text-destructive">
            {moreFailed === "down" ? "Couldn’t reach our server." : "Couldn’t load more shares."} Try again.
          </p>
        ) : null}
        {cursor ? (
          <button type="button" onClick={loadMore} disabled={loading} aria-busy={loading} className={cn(btnSecondary("md"), "disabled:opacity-60")}>
            {loading ? "Loading…" : moreFailed ? "Try again" : "Load more"}
          </button>
        ) : (
          <p className="text-sm text-muted-foreground">That’s every public share{q ? " that matches" : ""}.</p>
        )}
      </div>
    </div>
  )
}

/** Placeholder cards while the first page loads. */
export function ExploreSkeleton() {
  const bar = "rounded bg-muted motion-safe:animate-pulse"
  return (
    <ul aria-busy="true" aria-label="Loading public shares" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="flex h-44 flex-col rounded-2xl border border-border p-5">
          <span className={cn(bar, "h-3 w-24")} />
          <span className={cn(bar, "mt-3 h-6 w-4/5")} />
          <span className={cn(bar, "mt-2 h-6 w-1/2")} />
          <span className="mt-auto flex items-center gap-2.5">
            <span className={cn(bar, "size-8 rounded-full")} />
            <span className={cn(bar, "h-3 w-20")} />
          </span>
        </li>
      ))}
    </ul>
  )
}
