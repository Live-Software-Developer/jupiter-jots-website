"use client"

import { useCallback, useId, useMemo, useState, type FormEvent, type ReactNode } from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { initialsOf, plural } from "@/lib/share/format"
import { renderMarkdown } from "@/lib/share/markdown"
import { isTarget, targetLabel, WHOLE_SHARE } from "@/lib/share/targets"
import type { ApiResult } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { HUE_TINT, hueIndex } from "./BookmarkRow"
import { CollectionCommentsSlot } from "./CollectionSheet"
import {
  buildThreads,
  DiscussionStoreProvider,
  isStub,
  useRequiredStore,
  useStore,
  type Closed,
  type Entry,
  type Shown,
  type StoreProps,
  type Thread,
} from "./discussionStore"
import { GLYPH, ico } from "./icons"

export type { CommentCodec, CommentText } from "./discussionStore"

/**
 * Holds a share's comments for the whole page (see DiscussionStoreProvider): the Discussion
 * section, the sidebar and band links that set the item filter, and the comments inside
 * collection sheets. It fills `CollectionCommentsSlot`, so it must sit above `CollectionSheetProvider`.
 */
export function DiscussionProvider({ children, ...props }: StoreProps) {
  const slot = useCallback((itemKey: string) => <ItemDiscussion itemKey={itemKey} />, [])
  return (
    <DiscussionStoreProvider {...props}>
      <CollectionCommentsSlot.Provider value={slot}>{children}</CollectionCommentsSlot.Provider>
    </DiscussionStoreProvider>
  )
}

// ---------------------------------------------------------------------------------------------
// Threads

const REPLIES_SHOWN = 3

function ThreadList({ filter, label }: { filter: string | null; label: string }) {
  const s = useRequiredStore()
  const threads = useMemo(() => buildThreads(s.entries, s.byId, s.targets, filter, s.sort), [s.entries, s.byId, s.targets, filter, s.sort])

  if (s.status === "loading") return <p className="py-6 text-sm text-muted-foreground">Loading comments…</p>
  if (s.status === "error")
    return (
      <p className="flex flex-wrap items-center gap-2 py-6 text-sm text-muted-foreground">
        Comments couldn't be loaded.
        <button type="button" onClick={s.reload} className={cn("rounded font-medium text-primary underline-offset-4 hover:underline", FOCUS_FLAT)}>
          Try again
        </button>
      </p>
    )
  if (!threads.length)
    return (
      <p className="py-6 text-sm text-muted-foreground">
        {filter === null ? "No comments yet." : `No comments on ${targetLabel(s.targets, filter)} yet.`}
        {s.closed ? "" : " Start the discussion."}
      </p>
    )
  return (
    <ul aria-label={label} className="divide-y divide-border">
      {threads.map((th) => (
        <ThreadItem key={th.top.id} thread={th} filter={filter} />
      ))}
    </ul>
  )
}

const RAIL = "ml-4 border-l border-border pl-5 sm:ml-[1.125rem] sm:pl-7"

function ThreadItem({ thread, filter }: { thread: Thread; filter: string | null }) {
  const s = useRequiredStore()
  const [expanded, setExpanded] = useState(false)
  const [replying, setReplying] = useState(false)
  const { top, replies } = thread
  const shown = expanded ? replies : replies.slice(0, REPLIES_SHOWN)
  const more = replies.length - shown.length
  const canReply = !isStub(top) && top.status === "visible"

  return (
    <li>
      <CommentView entry={top} filter={filter} onReply={canReply && !s.closed ? () => setReplying(true) : undefined} />
      {shown.length || more || replying ? (
        <div className="pb-2">
          {shown.length ? (
            <ul aria-label={`Replies to ${isStub(top) ? "a hidden comment" : top.author_name}`}>
              {shown.map((r) => (
                <li key={r.id} className={RAIL}>
                  <CommentView entry={r} filter={filter} reply />
                </li>
              ))}
            </ul>
          ) : null}
          {more > 0 ? (
            <div className={cn(RAIL, "py-2 text-xs")}>
              <button type="button" onClick={() => setExpanded(true)} className={cn("rounded font-medium text-primary underline-offset-4 hover:underline", FOCUS_FLAT)}>
                {`Show ${plural(more, "more reply", "more replies")}`}
              </button>
            </div>
          ) : null}
          {replying && canReply ? (
            <div className={cn(RAIL, "py-3")}>
              <Composer parent={top as Shown} onDone={() => setReplying(false)} />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  )
}

function timeAgo(iso: string): string {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return ""
  const s = Math.max(0, (Date.now() - t) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  if (s < 86400 * 30) return `${Math.floor(s / 86400)} d ago`
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(t)
}

const THROTTLED = "You're commenting too fast, try again in a minute"

/** Copy for a failed post ("post") or vote/report ("action"). */
function errorText(res: Extract<ApiResult<unknown>, { ok: false }>, what: "post" | "action"): string {
  if (res.status === 429) return what === "post" ? THROTTLED : "Too many tries. Try again in a minute."
  if (res.code === "encode_failed") return "Couldn't prepare your comment. Try again."
  if (res.status === 0) return "Couldn't reach the server. Check your connection and try again."
  if (res.code === "comments_off") return "Comments were just turned off for this share."
  if (res.code === "thread_locked") return "The curator just locked this thread."
  if (res.status === 404 || res.status === 410) return "This share is no longer available."
  return what === "post" ? "Couldn't post your comment. Try again." : "That didn't work. Try again."
}

const ACT = cn("inline-flex items-center gap-1 rounded transition-colors hover:text-foreground disabled:opacity-60", FOCUS_FLAT)

function CommentView({ entry, filter, reply = false, onReply }: { entry: Entry; filter: string | null; reply?: boolean; onReply?: () => void }) {
  const s = useRequiredStore()
  const [busy, setBusy] = useState<"vote" | "report" | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (isStub(entry))
    return (
      <div data-comment-id={entry.id} className="py-3">
        <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {ico(GLYPH.eyeOff, "size-3.5")}
          Hidden by the curator
        </p>
      </div>
    )

  const held = entry.status === "held"
  const run = async (kind: "vote" | "report", fn: () => Promise<ApiResult<unknown>>) => {
    setBusy(kind)
    setError(null)
    const res = await fn()
    setBusy(null)
    setError(res.ok ? null : errorText(res, "action"))
  }
  const context = !reply && entry.item_key !== "" && entry.item_key !== filter ? targetLabel(s.targets, entry.item_key) : null

  return (
    <article
      data-comment-id={entry.id}
      className={reply ? "py-3" : entry.pinned ? "my-3 rounded-2xl bg-primary/5 px-4 py-4 ring-1 ring-primary/15 sm:px-5" : "py-4"}
    >
      {entry.pinned && !reply ? (
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          {ico(GLYPH.pin, "size-3.5")}
          Pinned by the curator
        </p>
      ) : null}
      <div className="flex items-start gap-3">
        <span
          className={cn("grid shrink-0 place-items-center rounded-full text-xs font-semibold", reply ? "size-7" : "size-9", HUE_TINT[hueIndex(entry.author_name)])}
          aria-hidden="true"
        >
          {initialsOf(entry.author_name)}
        </span>
        <div className={cn("min-w-0 flex-1", held && "opacity-80")}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium break-words">{entry.author_name}</span>
            {held ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-chart-3/10 px-2 py-0.5 text-xs font-medium text-foreground">
                {ico(GLYPH.clock, "size-3.5")}
                Waiting for approval
              </span>
            ) : null}
            <time dateTime={entry.created_at} className="text-xs text-muted-foreground">
              {timeAgo(entry.created_at)}
            </time>
          </div>
          {context ? (
            <button
              type="button"
              onClick={() => s.setFilter(entry.item_key)}
              className={cn("mt-1 inline-flex max-w-full items-center gap-1 truncate rounded-md bg-muted px-1.5 py-0.5 text-xs text-muted-foreground hover:text-foreground", FOCUS_FLAT)}
            >
              on <span className="truncate font-medium text-foreground/80">{context}</span>
            </button>
          ) : null}
          <div className="mt-1.5 space-y-2 text-sm leading-relaxed break-words text-pretty text-foreground/90">
            {entry.unreadable ? <p className="text-muted-foreground italic">This comment couldn't be read.</p> : renderMarkdown(entry.body)}
          </div>
          {held ? null : (
            <div className="mt-2.5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <button
                type="button"
                aria-pressed={!!entry.voted}
                disabled={busy === "vote"}
                onClick={() => run("vote", () => s.toggleVote(entry.id))}
                className={cn(ACT, "tabular-nums hover:text-primary", entry.voted && "text-primary")}
              >
                {ico(GLYPH.up, "size-3.5")}
                Helpful
                {entry.votes > 0 ? <span>· {entry.votes}</span> : null}
              </button>
              {onReply ? (
                <button type="button" data-reply onClick={onReply} className={cn(ACT, "font-medium")}>
                  Reply
                </button>
              ) : null}
              {entry.mine ? null : (
                <span className="ml-auto">
                  <button
                    type="button"
                    disabled={entry.reported || busy === "report"}
                    onClick={() => run("report", () => s.report(entry.id))}
                    className={ACT}
                  >
                    {ico(GLYPH.flag, "size-3.5")}
                    {entry.reported ? "Reported" : "Report"}
                  </button>
                </span>
              )}
            </div>
          )}
          {error ? (
            <p role="status" className="mt-1.5 text-xs text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </div>
    </article>
  )
}

// ---------------------------------------------------------------------------------------------
// Composer

const FIELD = cn(
  "w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:outline-none aria-[invalid=true]:border-destructive",
)

/**
 * The comment form. Top level it has the "On …" select (defaulting to the active filter);
 * `itemKey` fixes the target (collection sheet); `parent` makes it a reply on the parent's item.
 * The typed text survives every failed post; if the share closes while text is in it, the form
 * stays (disabled) so the text can be copied.
 */
function Composer({ itemKey, parent, onDone }: { itemKey?: string; parent?: Shown; onDone?: () => void }) {
  const s = useRequiredStore()
  const id = useId()
  const [body, setBody] = useState("")
  const [pending, setPending] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [fields, setFields] = useState<Record<string, string>>({})
  // The chosen target belongs to the filter it was chosen under; a new filter resets it.
  const [choice, setChoice] = useState<{ filter: string | null; key: string } | null>(null)

  if (s.closed && !body) return null

  const filterDefault = s.filter !== null && isTarget(s.targets, s.filter) ? s.filter : ""
  const target = parent ? parent.item_key : itemKey ?? (choice && choice.filter === s.filter ? choice.key : filterDefault)

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (pending || s.closed) return
    const author_name = s.name.trim()
    const text = body.trim()
    const missing: Record<string, string> = {}
    if (!author_name) missing.author_name = "Add your name."
    if (!text) missing.body = parent ? "Write a reply." : "Write a comment."
    setFields(missing)
    setNotice(null)
    if (Object.keys(missing).length) return
    setPending(true)
    const res = await s.post({ author_name, body: text, item_key: target, ...(parent ? { parent_id: parent.id } : {}) })
    setPending(false)
    if (res.ok) {
      setBody("")
      onDone?.()
      return
    }
    if (res.status === 400 && res.fields) {
      const f: Record<string, string> = {}
      let other: string | null = null
      for (const [k, msgs] of Object.entries(res.fields)) {
        if (k === "author_name" || k === "body") f[k] = msgs[0] ?? "Check this field."
        else other ??= msgs[0] ?? null
      }
      setFields(f)
      if (other || !Object.keys(f).length) setNotice(other ?? errorText(res, "post"))
      return
    }
    setNotice(errorText(res, "post"))
  }

  const err = (k: "author_name" | "body") => (fields[k] ? `${id}-${k}-error` : undefined)
  const showSelect = !parent && itemKey === undefined && s.targets.groups.length > 0

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={parent ? `Reply to ${parent.author_name}` : "Add a comment"}
      className={cn("rounded-2xl border border-border bg-card p-4 text-card-foreground sm:p-5", parent ? "" : "mt-5")}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${id}-name`} className="text-xs font-medium text-muted-foreground">
            Display name
          </label>
          <input
            id={`${id}-name`}
            name="author_name"
            type="text"
            autoComplete="nickname"
            maxLength={60}
            value={s.name}
            onChange={(e) => s.setName(e.target.value)}
            aria-invalid={fields.author_name ? true : undefined}
            aria-describedby={err("author_name")}
            className={cn(FIELD, "mt-1 h-9")}
          />
          {fields.author_name ? (
            <p id={err("author_name")} className="mt-1 text-xs text-destructive">
              {fields.author_name}
            </p>
          ) : null}
        </div>
        <div className="sm:col-span-2">
          <label htmlFor={`${id}-body`} className="text-xs font-medium text-muted-foreground">
            {parent ? "Reply" : "Comment"}
          </label>
          <textarea
            id={`${id}-body`}
            name="body"
            rows={parent ? 2 : 3}
            maxLength={4000}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={parent ? "Write a reply…" : "Ask a question, add context or push back…"}
            aria-invalid={fields.body ? true : undefined}
            aria-describedby={cn(err("body"), `${id}-hint`) || undefined}
            className={cn(FIELD, "mt-1 block resize-y py-2")}
          />
          {fields.body ? (
            <p id={err("body")} className="mt-1 text-xs text-destructive">
              {fields.body}
            </p>
          ) : null}
        </div>
      </div>
      <p id={`${id}-hint`} className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {s.mode === "held" ? "The curator reviews comments before they appear. " : ""}
        {s.audience === "password" ? "Visible to anyone with the password." : "Visible to anyone with the link."} Markdown works:{" "}
        <strong className="font-medium text-foreground">bold</strong>, <em>italic</em>, <code className="rounded bg-muted px-1 py-0.5 font-mono">code</code>, lists
        and quotes. Links and images are off.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {showSelect ? (
          <label className="inline-flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            On
            <select
              name="item_key"
              value={target}
              onChange={(e) => setChoice({ filter: s.filter, key: e.target.value })}
              className={cn("h-9 max-w-56 min-w-0 truncate rounded-lg border border-input bg-background px-2 text-sm text-foreground", FOCUS_FLAT)}
            >
              <option value="">{WHOLE_SHARE}</option>
              {s.targets.groups.map((g) =>
                g.nested.length ? (
                  <optgroup key={g.item.key} label={g.item.label}>
                    <option value={g.item.key}>{g.item.label}</option>
                    {g.nested.map((n) => (
                      <option key={n.key} value={n.key}>
                        {n.label}
                      </option>
                    ))}
                  </optgroup>
                ) : (
                  <option key={g.item.key} value={g.item.key}>
                    {g.item.label}
                  </option>
                ),
              )}
            </select>
          </label>
        ) : null}
        <span className="ml-auto flex items-center gap-2">
          {parent && onDone ? (
            <button type="button" onClick={onDone} className={cn("h-9 rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground", FOCUS_FLAT)}>
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={pending || !!s.closed}
            className={cn("inline-flex h-9 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60", FOCUS_FLAT)}
          >
            {pending ? "Posting…" : parent ? "Post reply" : "Post comment"}
          </button>
        </span>
      </div>
      {notice ? (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {notice}
        </p>
      ) : null}
    </form>
  )
}

function ClosedNotice({ closed }: { closed: Closed }) {
  if (!closed) return null
  return (
    <p className="mt-5 flex items-center gap-2 rounded-xl border border-border px-4 py-3 text-sm text-muted-foreground">
      {ico(GLYPH.lock)}
      {closed === "off" ? "Comments are turned off for this share." : "The curator locked this thread. Existing comments stay; new ones are closed."}
    </p>
  )
}

// ---------------------------------------------------------------------------------------------
// Sections and links

const SEG = (on: boolean) =>
  cn("h-7 rounded-md px-2.5 text-xs font-medium transition-colors", on ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground", FOCUS_FLAT)

/** The share's discussion (design: share-discussion): sort, item filter chip, composer, threads. */
export function Discussion() {
  const s = useRequiredStore()
  const total = s.count(null)
  return (
    <section id="discussion" className="scroll-mt-20" aria-labelledby="discussion-title">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2">
        <div>
          <p className="text-xs font-medium text-muted-foreground">Discussion</p>
          <h2 id="discussion-title" className="mt-0.5 font-serif text-3xl leading-tight tracking-tight">
            {plural(total, "comment")}
          </h2>
        </div>
        <span className="ml-auto inline-flex rounded-lg bg-muted p-0.5" role="group" aria-label="Sort">
          <button type="button" aria-pressed={s.sort === "top"} onClick={() => s.setSort("top")} className={SEG(s.sort === "top")}>
            Top
          </button>
          <button type="button" aria-pressed={s.sort === "new"} onClick={() => s.setSort("new")} className={SEG(s.sort === "new")}>
            Newest
          </button>
        </span>
      </div>
      {s.filter !== null ? (
        <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          Showing comments on
          <span className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-0.5 pr-1 pl-2.5 font-medium text-primary">
            <span className="truncate">{targetLabel(s.targets, s.filter)}</span>
            <button
              type="button"
              aria-label="Clear filter"
              onClick={() => s.setFilter(null)}
              className={cn("grid size-4 shrink-0 place-items-center rounded-full hover:bg-primary/20", FOCUS_FLAT)}
            >
              {ico(GLYPH.close, "size-3")}
            </button>
          </span>
        </p>
      ) : null}
      <ClosedNotice closed={s.closed} />
      <Composer />
      <div className="mt-2">
        <ThreadList filter={s.filter} label="Comments" />
      </div>
    </section>
  )
}

/** The comments on one collection, inside its sheet (fills `CollectionCommentsSlot`). */
function ItemDiscussion({ itemKey }: { itemKey: string }) {
  const s = useRequiredStore()
  const label = targetLabel(s.targets, itemKey)
  return (
    <section aria-label={`Comments on ${label}`} className="mt-4 border-t border-border px-4 pt-4 pb-6 sm:px-5">
      <h3 className="text-sm font-medium">{plural(s.count(itemKey), "comment")}</h3>
      <ClosedNotice closed={s.closed} />
      <Composer itemKey={itemKey} />
      <ThreadList filter={itemKey} label={`Comments on ${label}`} />
    </section>
  )
}

/**
 * A link that shows the discussion filtered to one item (`null` = everything), for sidebar rows
 * and band headers. Outside a DiscussionProvider it is a plain link to the discussion.
 */
export function ItemFilterLink({
  filter,
  className,
  activeClassName,
  inactiveClassName,
  children,
}: {
  filter: string | null
  className?: string
  activeClassName?: string
  inactiveClassName?: string
  children: ReactNode
}) {
  const s = useStore()
  const on = !!s && s.filter === filter
  return (
    <a href="#discussion" aria-current={on ? "true" : undefined} onClick={() => s?.setFilter(filter)} className={cn(className, on ? activeClassName : inactiveClassName)}>
      {children}
    </a>
  )
}

/** The number of visible comments under a filter (`null` = all); nothing outside a provider. */
export function ItemCommentCount({ filter, className }: { filter: string | null; className?: string }) {
  const s = useStore()
  if (!s) return null
  return <span className={className}>{s.count(filter)}</span>
}

/** "3 comments" / "Comment" link in a band's header; hidden when comments are off and there are none. */
export function BandCommentsLink({ filter, className }: { filter: string; className?: string }) {
  const s = useStore()
  if (!s) return null
  const n = s.count(filter)
  if (s.closed && !n) return null
  return (
    <ItemFilterLink filter={filter} className={className}>
      {ico(GLYPH.chat)}
      {n ? plural(n, "comment") : "Comment"}
    </ItemFilterLink>
  )
}
