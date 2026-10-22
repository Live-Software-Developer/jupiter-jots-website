"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
  type ReactNode,
} from "react"

import { FOCUS_FLAT } from "@/components/site/styles"
import { getComments, postComment, report as reportApi, vote as voteApi } from "@/lib/share/api"
import { initialsOf, plural } from "@/lib/share/format"
import { renderMarkdown } from "@/lib/share/markdown"
import { inScope, isTarget, targetLabel, WHOLE_SHARE, type CommentTargets } from "@/lib/share/targets"
import type { ApiResult, CommentMode, HiddenComment, PublicComment } from "@/lib/share/types"
import { cn } from "@/lib/utils"

import { HUE_TINT, hueIndex } from "./BookmarkRow"
import { CollectionCommentsSlot } from "./CollectionSheet"
import { ico } from "./icons"
import { useLiveComments } from "./useLiveComments"

// ---------------------------------------------------------------------------------------------
// Store

/** The encrypted part of a comment. Private shares (Task 6) pass a codec that decrypts/encrypts it. */
export interface CommentText {
  author_name: string
  body: string
}
export interface CommentCodec {
  decode(c: CommentText): Promise<CommentText>
  encode(c: CommentText): Promise<CommentText>
}
const IDENTITY: CommentCodec = { decode: async (c) => c, encode: async (c) => c }

type Shown = PublicComment & { voted?: boolean; reported?: boolean; unreadable?: boolean }
type Stub = HiddenComment & { item_key?: string }
type Entry = Shown | Stub
const isStub = (e: Entry): e is Stub => "hidden" in e && e.hidden === true

type Sort = "top" | "new"
type Closed = "off" | "locked" | null

interface State {
  byId: Map<number, Entry>
  status: "loading" | "ok" | "error"
}
type Action =
  | { type: "load"; comments: Entry[] }
  | { type: "failed" }
  | { type: "upsert"; comment: Shown }
  | { type: "hide"; id: number }
  | { type: "patch"; id: number; patch: Partial<Pick<Shown, "votes" | "voted" | "reported">> }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "load": {
      const byId = new Map<number, Entry>()
      for (const c of action.comments) {
        const prev = state.byId.get(c.id)
        byId.set(c.id, prev && !isStub(prev) && !isStub(c) ? { ...c, reported: prev.reported } : c)
      }
      return { byId, status: "ok" }
    }
    case "failed":
      return state.status === "ok" ? state : { ...state, status: "error" }
    case "upsert": {
      const { comment } = action
      const prev = state.byId.get(comment.id)
      const base = prev && !isStub(prev) ? prev : undefined
      const mine = comment.mine ?? base?.mine ?? false
      // The public projection carries visible comments only; a held one is shown to its author alone.
      if (comment.status !== "visible" && !(comment.status === "held" && mine)) return state
      const byId = new Map(state.byId)
      byId.set(comment.id, { ...base, ...comment, mine, voted: comment.voted ?? base?.voted, reported: base?.reported })
      return { ...state, byId }
    }
    case "hide": {
      const prev = state.byId.get(action.id)
      if (!prev || isStub(prev)) return state
      const byId = new Map(state.byId)
      byId.set(prev.id, { id: prev.id, parent_id: prev.parent_id, hidden: true, item_key: prev.item_key })
      return { ...state, byId }
    }
    case "patch": {
      const prev = state.byId.get(action.id)
      if (!prev || isStub(prev)) return state
      const byId = new Map(state.byId)
      byId.set(prev.id, { ...prev, ...action.patch })
      return { ...state, byId }
    }
  }
}

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x)
const hasId = (x: unknown): x is { id: number } => isRecord(x) && typeof x.id === "number"
const isComment = (x: unknown): x is PublicComment =>
  hasId(x) && typeof (x as Record<string, unknown>).body === "string" && typeof (x as Record<string, unknown>).author_name === "string"

async function decodeWith(codec: CommentCodec, c: PublicComment): Promise<Shown> {
  try {
    const t = await codec.decode({ author_name: c.author_name, body: c.body })
    return { ...c, author_name: t.author_name, body: t.body }
  } catch {
    return { ...c, author_name: "Unknown", body: "", unreadable: true }
  }
}

export interface PostInput {
  author_name: string
  body: string
  item_key: string
  parent_id?: number
}

interface DiscussionStore {
  targets: CommentTargets
  audience: "link" | "password"
  mode: CommentMode
  closed: Closed
  status: State["status"]
  entries: Entry[]
  byId: Map<number, Entry>
  filter: string | null
  setFilter(f: string | null): void
  sort: Sort
  setSort(s: Sort): void
  name: string
  setName(n: string): void
  count(filter: string | null): number
  reload(): void
  post(input: PostInput): Promise<ApiResult<unknown>>
  toggleVote(id: number): Promise<ApiResult<unknown>>
  report(id: number): Promise<ApiResult<unknown>>
}

const Store = createContext<DiscussionStore | null>(null)
const useStore = () => useContext(Store)

function useRequiredStore(): DiscussionStore {
  const s = useStore()
  if (!s) throw new Error("Discussion components must sit inside <DiscussionProvider>")
  return s
}

const NAME_KEY = "jj.name"
const noSubscribe = () => () => {}
function readSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ""
  } catch {
    return "" // Storage blocked: the name is simply not remembered.
  }
}

/**
 * Holds a share's comments for the whole page: the Discussion section, the sidebar and band
 * links that set the item filter, and the comments inside collection sheets (it fills
 * `CollectionCommentsSlot`, so it must sit above `CollectionSheetProvider`).
 *
 * Every incoming comment (list, live event) goes through one promise queue, so a slow
 * `codec.decode` cannot reorder events and live events that arrive during a fetch apply after it.
 */
export function DiscussionProvider({
  slug,
  mode,
  locked,
  count: initialCount,
  targets,
  audience = "link",
  codec = IDENTITY,
  children,
}: {
  slug: string
  mode: CommentMode
  locked: boolean
  /** The share's visible comment count, shown until the list arrives. */
  count: number
  targets: CommentTargets
  audience?: "link" | "password"
  codec?: CommentCodec
  children: ReactNode
}) {
  const [state, dispatch] = useReducer(reducer, { byId: new Map(), status: "loading" })
  const [closed, setClosed] = useState<Closed>(mode === "off" ? "off" : locked ? "locked" : null)
  const [filter, setFilter] = useState<string | null>(null)
  const [sort, setSort] = useState<Sort>("top")
  // What the visitor typed this visit; until then the name remembered on this device.
  const [typedName, setName] = useState<string | null>(null)
  const savedName = useSyncExternalStore(noSubscribe, readSavedName, () => "")
  const name = typedName ?? savedName

  const codecRef = useRef(codec)
  useEffect(() => {
    codecRef.current = codec
  })

  const queue = useRef<Promise<void>>(Promise.resolve())
  const enqueue = useCallback((job: () => Promise<void>) => {
    queue.current = queue.current.then(job).catch(() => {})
  }, [])

  const reload = useCallback(
    () =>
      enqueue(async () => {
        const res = await getComments(slug)
        if (!res.ok || !Array.isArray(res.data?.comments)) return dispatch({ type: "failed" })
        const comments = await Promise.all(
          res.data.comments.filter(hasId).map((c) => ("hidden" in c && c.hidden ? (c as Stub) : isComment(c) ? decodeWith(codecRef.current, c) : null)),
        )
        dispatch({ type: "load", comments: comments.filter((c): c is Entry => c !== null) })
      }),
    [enqueue, slug],
  )

  useEffect(() => {
    reload()
  }, [reload])


  const upsertLive = useCallback(
    (d: unknown) => {
      if (!isComment(d)) return
      enqueue(async () => dispatch({ type: "upsert", comment: await decodeWith(codecRef.current, d) }))
    },
    [enqueue],
  )
  useLiveComments(
    slug,
    {
      comment: upsertLive,
      comment_updated: upsertLive,
      comment_hidden: (d) => {
        if (hasId(d)) enqueue(async () => dispatch({ type: "hide", id: d.id }))
      },
    },
    reload,
  )

  const post = useCallback(
    async (input: PostInput): Promise<ApiResult<unknown>> => {
      let text: CommentText
      try {
        text = await codecRef.current.encode({ author_name: input.author_name, body: input.body })
      } catch {
        return { ok: false, status: 0, code: "encode_failed" }
      }
      const res = await postComment(slug, { ...text, item_key: input.item_key, ...(input.parent_id != null ? { parent_id: input.parent_id } : {}) })
      if (res.ok) {
        if (isComment(res.data)) {
          // We know the plaintext; no need to decode our own comment.
          dispatch({ type: "upsert", comment: { ...res.data, author_name: input.author_name, body: input.body, mine: true } })
        }
        try {
          localStorage.setItem(NAME_KEY, input.author_name)
        } catch {
          // Not remembered; fine.
        }
      } else if (res.status === 403 && (res.code === "comments_off" || res.code === "thread_locked")) {
        setClosed(res.code === "comments_off" ? "off" : "locked")
      }
      return res
    },
    [slug],
  )

  const toggleVote = useCallback(async (id: number) => {
    const res = await voteApi(id)
    if (res.ok) dispatch({ type: "patch", id, patch: { votes: res.data.votes, voted: res.data.voted } })
    return res
  }, [])

  const report = useCallback(async (id: number) => {
    const res = await reportApi(id)
    if (res.ok) dispatch({ type: "patch", id, patch: { reported: true } })
    return res
  }, [])

  const entries = useMemo(() => [...state.byId.values()], [state.byId])
  const count = useCallback(
    (f: string | null) => {
      if (state.status !== "ok") return f === null ? initialCount : 0
      return entries.filter((e) => !isStub(e) && e.status === "visible" && (f === null || inScope(targets, f, e.item_key))).length
    },
    [entries, initialCount, state.status, targets],
  )

  const store = useMemo<DiscussionStore>(
    () => ({
      targets,
      audience,
      mode,
      closed,
      status: state.status,
      entries,
      byId: state.byId,
      filter,
      setFilter,
      sort,
      setSort,
      name,
      setName,
      count,
      reload,
      post,
      toggleVote,
      report,
    }),
    [targets, audience, mode, closed, state.status, state.byId, entries, filter, sort, name, count, reload, post, toggleVote, report],
  )

  const slot = useCallback((itemKey: string) => <ItemDiscussion itemKey={itemKey} />, [])

  return (
    <Store.Provider value={store}>
      <CollectionCommentsSlot.Provider value={slot}>{children}</CollectionCommentsSlot.Provider>
    </Store.Provider>
  )
}

// ---------------------------------------------------------------------------------------------
// Threads

interface Thread {
  top: Entry
  replies: Entry[]
}

const visibleTo = (t: CommentTargets, filter: string | null, e: Entry) =>
  filter === null || (e.item_key !== undefined && inScope(t, filter, e.item_key))

/** Top-level comments with their replies, one level deep. A reply whose parent is unknown shows as top-level. */
function buildThreads(entries: Entry[], byId: Map<number, Entry>, t: CommentTargets, filter: string | null, sort: Sort): Thread[] {
  const replies = new Map<number, Entry[]>()
  const tops: Entry[] = []
  for (const e of entries) {
    const parent = e.parent_id != null ? byId.get(e.parent_id) : undefined
    if (parent && parent.parent_id == null) {
      const list = replies.get(parent.id) ?? []
      list.push(e)
      replies.set(parent.id, list)
    } else tops.push(e)
  }
  const pinned = (e: Entry) => (!isStub(e) && e.pinned ? 1 : 0)
  const votes = (e: Entry) => (isStub(e) ? 0 : e.votes)
  // Ids grow with creation time, so they order by time without parsing dates.
  tops.sort((a, b) => pinned(b) - pinned(a) || (sort === "top" ? votes(b) - votes(a) || a.id - b.id : b.id - a.id))
  return tops
    .map((top) => ({ top, replies: (replies.get(top.id) ?? []).sort((a, b) => a.id - b.id) }))
    .filter((th) => visibleTo(t, filter, th.top) || th.replies.some((r) => visibleTo(t, filter, r)))
}

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

const I = {
  pin: <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3zM12 14v6" />,
  eyeOff: (
    <path d="M3 3l18 18M10.6 6.1A9.8 9.8 0 0 1 12 6c6 0 9.5 6 9.5 6a17 17 0 0 1-3 3.7M6.6 7.6C4 9.3 2.5 12 2.5 12S6 18 12 18c1.6 0 3-.4 4.3-1" />
  ),
  up: <path d="M12 19V5M6 11l6-6 6 6" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  chat: <path d="M5 5.5h14v10H9.5L5 19z" />,
  close: <path d="M7 7l10 10M17 7 7 17" />,
}

const ACT = cn("inline-flex items-center gap-1 rounded transition-colors hover:text-foreground disabled:opacity-60", FOCUS_FLAT)

function actionError(res: ApiResult<unknown>): string | null {
  if (res.ok) return null
  if (res.status === 429) return "Too many tries. Try again in a minute."
  if (res.status === 0) return "Couldn't reach the server."
  return "That didn't work. Try again."
}

function CommentView({ entry, filter, reply = false, onReply }: { entry: Entry; filter: string | null; reply?: boolean; onReply?: () => void }) {
  const s = useRequiredStore()
  const [busy, setBusy] = useState<"vote" | "report" | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (isStub(entry))
    return (
      <div data-comment-id={entry.id} className="py-3">
        <p className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          {ico(I.eyeOff, "size-3.5")}
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
    setError(actionError(res))
  }
  const context = !reply && entry.item_key !== "" && entry.item_key !== filter ? targetLabel(s.targets, entry.item_key) : null

  return (
    <article
      data-comment-id={entry.id}
      className={reply ? "py-3" : entry.pinned ? "my-3 rounded-2xl bg-primary/5 px-4 py-4 ring-1 ring-primary/15 sm:px-5" : "py-4"}
    >
      {entry.pinned && !reply ? (
        <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary">
          {ico(I.pin, "size-3.5")}
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
                {ico(I.clock, "size-3.5")}
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
                {ico(I.up, "size-3.5")}
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
                    {ico(I.flag, "size-3.5")}
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

const THROTTLED = "You're commenting too fast, try again in a minute"

function postError(res: Extract<ApiResult<unknown>, { ok: false }>): string {
  if (res.status === 429) return THROTTLED
  if (res.code === "comments_off") return "Comments were just turned off for this share."
  if (res.code === "thread_locked") return "The curator just locked this thread."
  if (res.status === 404 || res.status === 410) return "This share is no longer available."
  if (res.status === 0 && res.code === "encode_failed") return "Couldn't prepare your comment. Try again."
  if (res.status === 0) return "Couldn't reach the server. Check your connection and try again."
  return "Couldn't post your comment. Try again."
}

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
      if (other || !Object.keys(f).length) setNotice(other ?? postError(res))
      return
    }
    setNotice(postError(res))
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
      {ico(I.lock)}
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
              {ico(I.close, "size-3")}
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
      {s.closed ? <ClosedNotice closed={s.closed} /> : null}
      <Composer itemKey={itemKey} />
      <ThreadList filter={itemKey} label={`Comments on ${label}`} />
    </section>
  )
}

/**
 * A link that shows the discussion filtered to one item (`null` = everything), for the
 * sidebar rows. Outside a DiscussionProvider it is a plain link to the discussion.
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
    <a href="#discussion" aria-current={on} onClick={() => s?.setFilter(filter)} className={cn(className, on ? activeClassName : inactiveClassName)}>
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
    <a href="#discussion" onClick={() => s.setFilter(filter)} className={className}>
      {ico(I.chat)}
      {n ? plural(n, "comment") : "Comment"}
    </a>
  )
}
