"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, type ReactNode } from "react"

import { getComments, postComment, report as reportApi, vote as voteApi } from "@/lib/share/api"
import { inScope, type CommentTargets } from "@/lib/share/targets"
import type { ApiResult, CommentMode, HiddenComment, PublicComment } from "@/lib/share/types"

import { useLiveComments } from "./useLiveComments"

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

export type Shown = PublicComment & { voted?: boolean; reported?: boolean; unreadable?: boolean }
export type Stub = HiddenComment & { item_key?: string }
export type Entry = Shown | Stub
export const isStub = (e: Entry): e is Stub => "hidden" in e && e.hidden === true

export type Sort = "top" | "new"
export type Closed = "off" | "locked" | null

export interface State {
  byId: Map<number, Entry>
  status: "loading" | "ok" | "error"
}
export type Action =
  | { type: "load"; comments: Entry[] }
  | { type: "failed" }
  | { type: "upsert"; comment: Shown }
  | { type: "hide"; id: number }
  | { type: "patch"; id: number; patch: Partial<Pick<Shown, "votes" | "voted" | "reported">> }

export const initialState = (): State => ({ byId: new Map(), status: "loading" })

/**
 * The merge rules. `upsert` serves both `comment` and `comment_updated`: live events carry the
 * public projection (no `mine` / `voted`), so those are kept from what we had; an id we never
 * saw is inserted (a held comment approved live); a non-visible row is kept only when it is the
 * visitor's own held comment. Votes are absolute, so a repeated event changes nothing. `hide`
 * ignores ids we never saw and keeps `parent_id` / `item_key` so threads and filters hold.
 */
export function reducer(state: State, action: Action): State {
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
      // A failed refetch keeps what is on screen; only a failed first load is an error.
      return state.status === "ok" ? state : { ...state, status: "error" }
    case "upsert": {
      const { comment } = action
      const prev = state.byId.get(comment.id)
      const base = prev && !isStub(prev) ? prev : undefined
      const mine = comment.mine ?? base?.mine ?? false
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

export interface Thread {
  top: Entry
  replies: Entry[]
}

const visibleTo = (t: CommentTargets, filter: string | null, e: Entry) =>
  filter === null || (e.item_key !== undefined && inScope(t, filter, e.item_key))

/**
 * Top-level comments with their replies, one level deep; a reply whose parent is unknown shows
 * as top-level. Pinned first; Top is votes then age, Newest is newest first. Ids grow with
 * creation time, so they order by time without parsing dates. Under a filter a thread shows
 * when its top comment or any reply is in scope.
 */
export function buildThreads(entries: Entry[], byId: Map<number, Entry>, t: CommentTargets, filter: string | null, sort: Sort): Thread[] {
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
  tops.sort((a, b) => pinned(b) - pinned(a) || (sort === "top" ? votes(b) - votes(a) || a.id - b.id : b.id - a.id))
  return tops
    .map((top) => ({ top, replies: (replies.get(top.id) ?? []).sort((a, b) => a.id - b.id) }))
    .filter((th) => visibleTo(t, filter, th.top) || th.replies.some((r) => visibleTo(t, filter, r)))
}

const isRecord = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x)
const hasId = (x: unknown): x is { id: number } => isRecord(x) && typeof x.id === "number"
const isComment = (x: unknown): x is PublicComment => isRecord(x) && typeof x.id === "number" && typeof x.body === "string" && typeof x.author_name === "string"

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

export interface DiscussionStore {
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
/** The page's discussion store, or null outside a provider. */
export const useStore = () => useContext(Store)

export function useRequiredStore(): DiscussionStore {
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

export interface StoreProps {
  slug: string
  mode: CommentMode
  locked: boolean
  /** The share's visible comment count, shown until the list arrives. */
  count: number
  targets: CommentTargets
  audience?: "link" | "password"
  codec?: CommentCodec
  children: ReactNode
}

/**
 * Loads a share's comments, keeps them live (useLiveComments) and exposes them with the page's
 * filter, sort and remembered name. Every change to the list — fetches, live events, the
 * visitor's own posts — goes through one promise queue, so a slow `codec.decode` cannot reorder
 * events and a refetch in flight cannot overwrite a newer change.
 */
export function DiscussionStoreProvider({ slug, mode, locked, count: initialCount, targets, audience = "link", codec = IDENTITY, children }: StoreProps) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
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
    // A failing job must not stall the queue; jobs handle their own expected failures.
    queue.current = queue.current.then(job).catch((e: unknown) => console.error("discussion:", e))
  }, [])

  const reload = useCallback(
    () =>
      enqueue(async () => {
        try {
          const res = await getComments(slug)
          if (!res.ok || !Array.isArray(res.data?.comments)) return dispatch({ type: "failed" })
          const comments = await Promise.all(
            res.data.comments.map((c) => ("hidden" in c && c.hidden && hasId(c) ? (c as Stub) : isComment(c) ? decodeWith(codecRef.current, c) : null)),
          )
          dispatch({ type: "load", comments: comments.filter((c): c is Entry => c !== null) })
        } catch {
          dispatch({ type: "failed" })
        }
      }),
    [enqueue, slug],
  )

  useEffect(() => {
    reload()
  }, [reload])

  const upsertLive = useCallback(
    (d: unknown) => {
      if (isComment(d)) enqueue(async () => dispatch({ type: "upsert", comment: await decodeWith(codecRef.current, d) }))
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
        const data = res.data
        // Our own comment, with the plaintext we already have; queued so a refetch in flight cannot drop it.
        if (isComment(data)) enqueue(async () => dispatch({ type: "upsert", comment: { ...data, author_name: input.author_name, body: input.body, mine: true } }))
        // On a private share the name would sit in plaintext on this device: not remembered.
        if (audience !== "password") {
          try {
            localStorage.setItem(NAME_KEY, input.author_name)
          } catch {
            // Not remembered; fine.
          }
        }
      } else if (res.status === 403 && (res.code === "comments_off" || res.code === "thread_locked")) {
        setClosed(res.code === "comments_off" ? "off" : "locked")
      }
      return res
    },
    [enqueue, slug, audience],
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

  return <Store.Provider value={store}>{children}</Store.Provider>
}
