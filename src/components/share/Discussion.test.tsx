import { act, StrictMode, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { commentTargets } from '@/lib/share/targets'
import type { CommentList, CommentMode, PBookmark, PayloadItem, PublicComment } from '@/lib/share/types'
import { getComments, postComment, report, vote } from '@/lib/share/api'
import { CollectionCommentsSlot } from './CollectionSheet'
import { BandCommentsLink, Discussion, DiscussionProvider, ItemFilterLink, type CommentCodec } from './Discussion'

vi.mock('@/lib/share/api', () => ({
  apiBase: () => 'http://127.0.0.1:8000',
  getComments: vi.fn(),
  postComment: vi.fn(),
  vote: vi.fn(),
  report: vi.fn(),
}))

const getMock = vi.mocked(getComments)
const postMock = vi.mocked(postComment)
const voteMock = vi.mocked(vote)
const reportMock = vi.mocked(report)

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

const bm = (key: string, title: string): PBookmark => ({ key, url: 'https://x.dev', title, domain: 'x.dev', note: '', tags: [], read: false })
const items: PayloadItem[] = [
  { key: 'c:3', kind: 'collection', collection: { name: 'Reading list', note: '', hue: 1, bookmarks: [bm('c:3/b:12', 'Twelve')] } },
  {
    key: 'g:4',
    kind: 'graph',
    graph: {
      name: 'Learning path',
      description: '',
      mode: 'board',
      steps: [],
      links: [],
      nodes: [
        {
          id: 'k',
          stepId: null,
          x: 0,
          y: 0,
          ref: { kind: 'collection', key: 'g:4/n:k', collection: { name: 'Deep dives', note: '', hue: 2, bookmarks: [bm('g:4/n:k/b:9', 'Nine')] } },
        },
      ],
    },
  },
]
const targets = commentTargets(items)

let seq = 0
const c = (extra: Partial<PublicComment> = {}): PublicComment => ({
  id: ++seq,
  parent_id: null,
  item_key: '',
  author_name: 'Ada',
  body: 'Hello',
  status: 'visible',
  pinned: false,
  votes: 0,
  created_at: `2026-10-2${Math.min(seq, 9)}T10:00:00Z`,
  mine: false,
  ...extra,
})
const list = (comments: CommentList['comments']) => ({ ok: true as const, data: { comments, count: comments.length } })

const GROUP = 'public:share:abcdefghij'

/** Stands in for the browser's EventSource: records instances, lets tests emit umbral `u` envelopes and errors. */
class FakeEventSource {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2
  static instances: FakeEventSource[] = []
  readyState = 0
  closed = false
  onopen: ((e: Event) => void) | null = null
  onerror: ((e: Event) => void) | null = null
  private listeners: Record<string, ((e: MessageEvent) => void)[]> = {}
  constructor(public url: string) {
    FakeEventSource.instances.push(this)
  }
  addEventListener(type: string, fn: (e: MessageEvent) => void) {
    ;(this.listeners[type] ??= []).push(fn)
  }
  close() {
    this.closed = true
    this.readyState = 2
  }
  emit(type: string, data: unknown) {
    for (const fn of this.listeners[type] ?? []) fn(new MessageEvent(type, { data: typeof data === 'string' ? data : JSON.stringify(data) }))
  }
  open() {
    this.readyState = 1
    this.onopen?.(new Event('open'))
  }
  fail(readyState: number) {
    this.readyState = readyState
    this.onerror?.(new Event('error'))
  }
}
const streams = () => FakeEventSource.instances.filter((s) => !s.closed)
const live = (event: string, data: unknown, channel = GROUP) =>
  act(async () => {
    for (const s of streams()) s.emit('u', { c: channel, e: event, d: data })
  })

let root: Root | null = null
let host: HTMLDivElement
async function render(ui: ReactNode) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(ui))
  await flush()
}
const flush = () => act(async () => {})

function ui({ mode = 'open', locked = false, codec, audience, children }: { mode?: CommentMode; locked?: boolean; codec?: CommentCodec; audience?: 'link' | 'password'; children?: ReactNode } = {}) {
  return (
    <DiscussionProvider slug="abcdefghij" mode={mode} locked={locked} count={0} targets={targets} codec={codec} audience={audience}>
      {children ?? <Discussion />}
    </DiscussionProvider>
  )
}

const $ = (sel: string) => host.querySelector(sel)
const $$ = (sel: string) => [...host.querySelectorAll(sel)]
const button = (text: string) => $$('button').find((b) => b.textContent?.trim() === text) as HTMLButtonElement | undefined
const commentEl = (id: number) => $(`[data-comment-id="${id}"]`)

function type(el: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : el instanceof HTMLSelectElement ? HTMLSelectElement : HTMLInputElement
  Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }))
}
async function fill(name: string, body: string, scope = host as Element) {
  await act(async () => {
    type(scope.querySelector('input[name="author_name"]') as HTMLInputElement, name)
    type(scope.querySelector('textarea[name="body"]') as HTMLTextAreaElement, body)
  })
}
async function submit(scope = host as Element) {
  await act(async () => {
    ;(scope instanceof HTMLFormElement ? scope : (scope.querySelector('form') as HTMLFormElement)).requestSubmit()
  })
  await flush()
}

beforeEach(() => {
  seq = 0
  localStorage.clear()
  vi.clearAllMocks()
  getMock.mockResolvedValue(list([]))
  FakeEventSource.instances = []
  vi.stubGlobal('EventSource', FakeEventSource)
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  host?.remove()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('threads', () => {
  it('nests replies under their parent, one level deep, in a list', async () => {
    const parent = c({ body: 'Parent' })
    const other = c({ body: 'Other' })
    const reply = c({ parent_id: parent.id, body: 'A reply' })
    getMock.mockResolvedValue(list([parent, other, reply]))
    await render(ui())
    const thread = $('ul[aria-label="Comments"]')!
    expect(thread.children).toHaveLength(2)
    const replyEl = commentEl(reply.id)!
    expect(replyEl.closest('ul')!.closest('li')).toBe(commentEl(parent.id)!.closest('li'))
    expect(commentEl(other.id)!.closest('li')!.contains(replyEl)).toBe(false)
  })

  it('folds replies after three behind "Show N more replies"', async () => {
    const parent = c()
    const replies = [1, 2, 3, 4, 5].map((n) => c({ parent_id: parent.id, body: `Reply ${n}` }))
    getMock.mockResolvedValue(list([parent, ...replies]))
    await render(ui())
    expect(commentEl(replies[2].id)).not.toBeNull()
    expect(commentEl(replies[3].id)).toBeNull()
    await act(async () => button('Show 2 more replies')!.click())
    expect(commentEl(replies[4].id)).not.toBeNull()
  })

  it('renders bodies through the restricted markdown and names as text', async () => {
    getMock.mockResolvedValue(list([c({ author_name: '<b>Eve</b>', body: '**bold** <script>x</script> [a](javascript:alert(1))' })]))
    await render(ui())
    expect($('strong')?.textContent).toBe('bold')
    expect($('script')).toBeNull()
    expect($$('a').some((a) => a.getAttribute('href')?.startsWith('javascript'))).toBe(false)
    expect(host.textContent).toContain('<b>Eve</b>')
    expect(host.textContent).toContain('[a](javascript:alert(1))')
  })

  it('shows hidden stubs and the visitor’s own held comments', async () => {
    const stub = { id: 50, parent_id: null, hidden: true as const }
    const held = c({ status: 'held', mine: true, body: 'Mine' })
    getMock.mockResolvedValue(list([stub, c({ parent_id: 50, body: 'Reply to hidden' }), held]))
    await render(ui())
    expect(commentEl(50)!.textContent).toContain('Hidden by the curator')
    expect(host.textContent).toContain('Reply to hidden')
    expect(commentEl(held.id)!.textContent).toContain('Waiting for approval')
  })

  it('sorts Top by votes and Newest by time, pinned first', async () => {
    const old = c({ votes: 9, body: 'Old', created_at: '2026-10-01T00:00:00Z' })
    const recent = c({ votes: 1, body: 'Recent', created_at: '2026-10-20T00:00:00Z' })
    const pinned = c({ pinned: true, body: 'Pinned', created_at: '2026-09-01T00:00:00Z' })
    getMock.mockResolvedValue(list([old, recent, pinned]))
    await render(ui())
    const order = () => $$('ul[aria-label="Comments"] > li > [data-comment-id]').map((e) => Number(e.getAttribute('data-comment-id')))
    expect(order()).toEqual([pinned.id, old.id, recent.id])
    await act(async () => button('Newest')!.click())
    expect(button('Newest')!.getAttribute('aria-pressed')).toBe('true')
    expect(order()).toEqual([pinned.id, recent.id, old.id])
  })
})

describe('live events', () => {
  it('opens one EventSource on the API for the share group', async () => {
    await render(ui())
    expect(streams().map((s) => s.url)).toEqual(['http://127.0.0.1:8000/realtime/sse?groups=public%3Ashare%3Aabcdefghij'])
  })

  it('ignores events for other groups, unknown events and bad envelopes', async () => {
    await render(ui())
    await live('comment', c({ body: 'Elsewhere' }), 'public:share:other00000')
    await live('surprise', c({ body: 'Unknown event' }))
    await act(async () => streams()[0].emit('u', 'not json'))
    expect($('[data-comment-id]')).toBeNull()
  })

  it('a comment_hidden event replaces the comment with a stub; unknown ids are ignored', async () => {
    const a = c({ body: 'Soon hidden' })
    getMock.mockResolvedValue(list([a]))
    await render(ui())
    await live('comment_hidden', { id: 999 })
    await live('comment_hidden', { id: a.id })
    expect(host.textContent).not.toContain('Soon hidden')
    expect(commentEl(a.id)!.textContent).toContain('Hidden by the curator')
    expect(commentEl(999)).toBeNull()
  })

  it('upserts comment and comment_updated by id, idempotently', async () => {
    const a = c({ body: 'First' })
    getMock.mockResolvedValue(list([{ ...a, voted: true } as PublicComment]))
    await render(ui())
    const fresh = c({ body: 'New one' })
    await live('comment', fresh)
    await live('comment', fresh)
    expect($$(`[data-comment-id="${fresh.id}"]`)).toHaveLength(1)
    // An approved comment never seen before arrives as comment_updated.
    const approved = c({ body: 'Approved later' })
    await live('comment_updated', approved)
    expect(commentEl(approved.id)).not.toBeNull()
    // Votes may arrive twice; the vote count is absolute and the visitor's own vote survives.
    await live('comment_updated', { ...a, votes: 3 })
    await live('comment_updated', { ...a, votes: 3 })
    const helpful = commentEl(a.id)!.querySelector('button[aria-pressed]')!
    expect(helpful.textContent).toContain('3')
    expect(helpful.getAttribute('aria-pressed')).toBe('true')
  })

  it('turns the visitor’s held comment visible when its approval arrives', async () => {
    const held = c({ status: 'held', mine: true, body: 'Mine' })
    getMock.mockResolvedValue(list([held]))
    await render(ui())
    await live('comment_updated', { ...held, status: 'visible', mine: undefined })
    expect(commentEl(held.id)!.textContent).not.toContain('Waiting for approval')
  })

  it('un-hides a hidden comment when comment_updated brings it back', async () => {
    const a = c({ body: 'Restored' })
    getMock.mockResolvedValue(list([{ id: a.id, parent_id: null, hidden: true }]))
    await render(ui())
    expect(commentEl(a.id)!.textContent).toContain('Hidden by the curator')
    await live('comment_updated', a)
    expect(commentEl(a.id)!.textContent).toContain('Restored')
  })

  it('nests an approved held reply under its parent, in id order', async () => {
    const parent = c({ body: 'Parent' })
    const first = c({ parent_id: parent.id, body: 'First reply' })
    const held = c({ parent_id: parent.id, body: 'Held reply' })
    const last = c({ parent_id: parent.id, body: 'Last reply' })
    getMock.mockResolvedValue(list([parent, first, last]))
    await render(ui())
    await live('comment_updated', held)
    const replies = [...commentEl(parent.id)!.closest('li')!.querySelectorAll(':scope ul [data-comment-id]')].map((e) => Number(e.getAttribute('data-comment-id')))
    expect(replies).toEqual([first.id, held.id, last.id])
  })

  it('opens one stream under StrictMode and closes it on unmount', async () => {
    await render(<StrictMode>{ui()}</StrictMode>)
    expect(streams()).toHaveLength(1)
    act(() => root!.unmount())
    root = null
    expect(streams()).toHaveLength(0)
  })

  it('a transient error leaves reconnecting to the browser, then resyncs once on reopen', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    await render(ui())
    const es = streams()[0]
    es.open()
    await act(async () => es.fail(FakeEventSource.CONNECTING))
    await act(async () => vi.advanceTimersByTime(90_000))
    expect(getMock).toHaveBeenCalledTimes(1)
    await act(async () => es.open())
    await flush()
    expect(getMock).toHaveBeenCalledTimes(2)
    await act(async () => vi.advanceTimersByTime(90_000))
    expect(getMock).toHaveBeenCalledTimes(2)
  })

  it('polls every 30 s once the stream is closed for good, and stops on unmount', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    await render(ui())
    await act(async () => streams()[0].fail(FakeEventSource.CLOSED))
    expect(streams()).toHaveLength(0)
    expect(getMock).toHaveBeenCalledTimes(1)
    getMock.mockResolvedValue(list([c({ body: 'Polled in' })]))
    await act(async () => vi.advanceTimersByTime(30_000))
    await flush()
    expect(getMock).toHaveBeenCalledTimes(2)
    expect(host.textContent).toContain('Polled in')
    act(() => root!.unmount())
    root = null
    await act(async () => vi.advanceTimersByTime(60_000))
    expect(getMock).toHaveBeenCalledTimes(2)
  })

  it('polls when there is no EventSource', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
    vi.stubGlobal('EventSource', undefined)
    await render(ui())
    await act(async () => vi.advanceTimersByTime(30_000))
    await flush()
    expect(getMock).toHaveBeenCalledTimes(2)
  })
})

describe('loading', () => {
  it('shows an error with retry when the list fails, then loads on retry', async () => {
    getMock.mockRejectedValueOnce(new Error('boom'))
    await render(ui())
    expect(host.textContent).toContain("Comments couldn't be loaded.")
    getMock.mockResolvedValue(list([c({ body: 'Back' })]))
    await act(async () => button('Try again')!.click())
    await flush()
    expect(host.textContent).toContain('Back')
  })

  it('keeps the visitor’s own post when a refetch was already in flight', async () => {
    let release!: (v: Awaited<ReturnType<typeof getComments>>) => void
    getMock.mockResolvedValueOnce(list([]))
    postMock.mockImplementation(async (_slug, body) => ({ ok: true, data: c({ ...body, status: 'held', mine: true }) }))
    await render(ui({ mode: 'held' }))
    // A reconnect resync starts a refetch whose snapshot predates the post (no held comment of ours).
    getMock.mockReturnValueOnce(new Promise((r) => (release = r)))
    await act(async () => {
      streams()[0].fail(FakeEventSource.CONNECTING)
      streams()[0].open()
    })
    expect(getMock).toHaveBeenCalledTimes(2)
    await fill('Kim', 'Mine, held')
    await submit()
    await act(async () => release(list([])))
    await flush()
    expect(host.textContent).toContain('Mine, held')
  })
})

describe('composer', () => {
  it('labels its fields and remembers the name', async () => {
    localStorage.setItem('jj.name', 'Sam')
    await render(ui())
    const name = $('input[name="author_name"]') as HTMLInputElement
    expect(name.labels?.[0]?.textContent).toContain('Display name')
    expect(($('textarea[name="body"]') as HTMLTextAreaElement).labels?.[0]?.textContent).toContain('Comment')
    expect(name.value).toBe('Sam')
  })

  it('posting in approve-first mode shows "Waiting for approval" and clears the text', async () => {
    postMock.mockImplementation(async (_slug, body) => ({ ok: true, data: c({ ...body, status: 'held', mine: true }) }))
    await render(ui({ mode: 'held' }))
    expect(host.textContent).toContain('The curator reviews comments before they appear.')
    await fill('Kim', 'My thoughts')
    await submit()
    expect(postMock).toHaveBeenCalledWith('abcdefghij', { author_name: 'Kim', body: 'My thoughts', item_key: '' })
    const mine = $$('[data-comment-id]').find((e) => e.textContent?.includes('My thoughts'))!
    expect(mine.textContent).toContain('Waiting for approval')
    expect(($('textarea[name="body"]') as HTMLTextAreaElement).value).toBe('')
    expect(localStorage.getItem('jj.name')).toBe('Kim')
  })

  it('posts on the chosen item', async () => {
    postMock.mockImplementation(async (_slug, body) => ({ ok: true, data: c({ ...body, mine: true }) }))
    await render(ui())
    const select = $('select[name="item_key"]') as HTMLSelectElement
    expect([...select.options].map((o) => o.value)).toEqual(['', 'c:3', 'c:3/b:12', 'g:4', 'g:4/n:k', 'g:4/n:k/b:9'])
    await act(async () => type(select, 'g:4/n:k/b:9'))
    await fill('Kim', 'On nine')
    await submit()
    expect(postMock.mock.calls[0][1].item_key).toBe('g:4/n:k/b:9')
    expect(host.textContent).toContain('on Nine')
  })

  it('comments_off hides the composer', async () => {
    await render(ui({ mode: 'off' }))
    expect($('form')).toBeNull()
    expect(host.textContent).toContain('Comments are turned off for this share.')
  })

  it('a 403 thread_locked shows the locked notice and keeps the draft in a disabled form', async () => {
    postMock.mockResolvedValueOnce({ ok: false, status: 403, code: 'thread_locked' })
    await render(ui())
    await fill('Kim', 'Late')
    await submit()
    expect(host.textContent).toContain('The curator locked this thread.')
    expect(($('textarea[name="body"]') as HTMLTextAreaElement).value).toBe('Late')
    expect(($('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true)
    // Once the draft is cleared the composer goes away.
    await act(async () => type($('textarea[name="body"]') as HTMLTextAreaElement, ''))
    expect($('form')).toBeNull()
  })

  it('a 403 comments_off shows the off notice', async () => {
    postMock.mockResolvedValueOnce({ ok: false, status: 403, code: 'comments_off' })
    await render(ui())
    await fill('Kim', 'Late')
    await submit()
    expect(host.textContent).toContain('Comments are turned off for this share.')
    expect(($('button[type="submit"]') as HTMLButtonElement).disabled).toBe(true)
  })

  it('shows 429 as a notice and keeps the typed text', async () => {
    postMock.mockResolvedValue({ ok: false, status: 429, code: 'throttled' })
    await render(ui())
    await fill('Kim', 'Keep me')
    await submit()
    expect($('[role="alert"]')?.textContent).toBe("You're commenting too fast, try again in a minute")
    expect(($('textarea[name="body"]') as HTMLTextAreaElement).value).toBe('Keep me')
  })

  it('shows 400 field errors next to their fields', async () => {
    postMock.mockResolvedValue({ ok: false, status: 400, code: 'validation_error', fields: { body: ['body must be 1-4000 characters.'] } })
    await render(ui())
    await fill('Kim', 'x')
    await submit()
    const body = $('textarea[name="body"]') as HTMLTextAreaElement
    expect(body.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(body.getAttribute('aria-describedby')!.split(' ')[0])?.textContent).toBe('body must be 1-4000 characters.')
    expect(body.value).toBe('x')
  })

  it('on a private share, a 400 on the ciphertext reads as too long', async () => {
    postMock.mockResolvedValue({ ok: false, status: 400, code: 'validation_error', fields: { body: ['body must be 1-21400 characters.'], author_name: ['author_name must be 1-400 characters.'] } })
    await render(ui({ audience: 'password' }))
    await fill('Kim', 'x')
    await submit()
    const text = (sel: string) => document.getElementById(($(sel) as HTMLElement).getAttribute('aria-describedby')!.split(' ')[0])?.textContent
    expect(text('textarea[name="body"]')).toBe('That comment is too long.')
    expect(text('input[name="author_name"]')).toBe('That name is too long.')
  })

  it('replies to a thread with the parent’s item key', async () => {
    const parent = c({ item_key: 'c:3' })
    getMock.mockResolvedValue(list([parent]))
    postMock.mockImplementation(async (_slug, body) => ({ ok: true, data: c({ ...body, mine: true }) }))
    await render(ui())
    await act(async () => (commentEl(parent.id)!.querySelector('button[data-reply]') as HTMLButtonElement).click())
    const form = commentEl(parent.id)!.closest('li')!.querySelector('form')!
    await fill('Kim', 'Answer', form)
    await submit(form)
    expect(postMock.mock.calls[0][1]).toEqual({ author_name: 'Kim', body: 'Answer', item_key: 'c:3', parent_id: parent.id })
    expect(commentEl(parent.id)!.closest('li')!.textContent).toContain('Answer')
  })

  it('hides the composer and reply buttons on a locked thread', async () => {
    getMock.mockResolvedValue(list([c()]))
    await render(ui({ locked: true }))
    expect($('form')).toBeNull()
    expect($('button[data-reply]')).toBeNull()
  })

  it('encodes new comments and decodes incoming ones with the codec', async () => {
    const codec: CommentCodec = {
      decode: async (x) => ({ author_name: x.author_name.toUpperCase(), body: x.body.replace('enc:', '') }),
      encode: async (x) => ({ author_name: x.author_name, body: `enc:${x.body}` }),
    }
    getMock.mockResolvedValue(list([c({ author_name: 'ada', body: 'enc:secret' })]))
    postMock.mockImplementation(async (_slug, body) => ({ ok: true, data: c({ ...body, mine: true }) }))
    await render(ui({ codec }))
    expect(host.textContent).toContain('ADA')
    expect(host.textContent).toContain('secret')
    await live('comment', c({ author_name: 'bo', body: 'enc:live' }))
    expect(host.textContent).toContain('BO')
    await fill('Kim', 'plain')
    await submit()
    expect(postMock.mock.calls[0][1].body).toBe('enc:plain')
    expect(host.textContent).toContain('plain')
  })
})

describe('votes and reports', () => {
  it('toggles the helpful vote with aria-pressed', async () => {
    const a = c({ votes: 1 })
    getMock.mockResolvedValue(list([a]))
    voteMock.mockResolvedValue({ ok: true, data: { votes: 2, voted: true } })
    await render(ui())
    const btn = commentEl(a.id)!.querySelector('button[aria-pressed]') as HTMLButtonElement
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    await act(async () => btn.click())
    await flush()
    expect(voteMock).toHaveBeenCalledWith(a.id)
    expect(btn.getAttribute('aria-pressed')).toBe('true')
    expect(btn.textContent).toContain('2')
  })

  it('reports once', async () => {
    const a = c()
    getMock.mockResolvedValue(list([a]))
    reportMock.mockResolvedValue({ ok: true, data: { reports: 1 } })
    await render(ui())
    await act(async () => button('Report')!.click())
    await flush()
    expect(reportMock).toHaveBeenCalledWith(a.id)
    expect(button('Reported')?.disabled).toBe(true)
  })
})

describe('item filter', () => {
  it('filters by an item from a sidebar or band link and clears from the chip', async () => {
    const onCollection = c({ item_key: 'c:3/b:12', body: 'About twelve' })
    const onShare = c({ body: 'About everything' })
    getMock.mockResolvedValue(list([onCollection, onShare]))
    await render(
      ui({
        children: (
          <>
            <ItemFilterLink filter="c:3" className="link" activeClassName="on">
              Reading list
            </ItemFilterLink>
            <BandCommentsLink filter="g:4" className="band" />
            <Discussion />
          </>
        ),
      }),
    )
    expect($('a.band')?.textContent).toContain('Comment')
    await act(async () => ($('a.link') as HTMLAnchorElement).click())
    expect($('a.link')!.getAttribute('aria-current')).toBe('true')
    expect(host.textContent).toContain('Showing comments on')
    expect(host.textContent).toContain('About twelve')
    expect(host.textContent).not.toContain('About everything')
    expect(($('select[name="item_key"]') as HTMLSelectElement).value).toBe('c:3')
    await act(async () => ($('button[aria-label="Clear filter"]') as HTMLButtonElement).click())
    expect(host.textContent).toContain('About everything')
  })

  it('labels unknown keys "this share"', async () => {
    getMock.mockResolvedValue(list([c({ item_key: 'c:404', body: 'Orphan' })]))
    await render(ui())
    expect(host.textContent).toContain('on this share')
  })

  it('fills the collection sheet slot with that collection’s comments', async () => {
    getMock.mockResolvedValue(list([c({ item_key: 'g:4/n:k/b:9', body: 'Deep comment' }), c({ item_key: 'c:3', body: 'Elsewhere' })]))
    function Sheet() {
      return <CollectionCommentsSlot.Consumer>{(render) => <div data-sheet>{render?.('g:4/n:k')}</div>}</CollectionCommentsSlot.Consumer>
    }
    await render(ui({ children: <Sheet /> }))
    const sheet = $('[data-sheet]')!
    expect(sheet.textContent).toContain('Deep comment')
    expect(sheet.textContent).not.toContain('Elsewhere')
  })
})
