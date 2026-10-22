import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getComments, postComment } from '@/lib/share/api'
import { b64encode, decryptJson, deriveKey, encryptJson } from '@/lib/share/crypto'
import type { PBookmark, PublicComment, PublicShare, SharePayload } from '@/lib/share/types'
import { commentCodec, PrivateGate } from './PrivateGate'

vi.mock('@/lib/share/api', () => ({
  apiBase: () => 'http://127.0.0.1:8000',
  visitorKey: () => 'f'.repeat(32),
  getComments: vi.fn(),
  postComment: vi.fn(),
  vote: vi.fn(),
  report: vi.fn(),
}))
const getMock = vi.mocked(getComments)
const postMock = vi.mocked(postComment)

const PASSWORD = 'maple-otter-cedar-lark-93'
// The lowest count the gate accepts, to keep the suite quick; real shares use their own kdf_iters.
const ITERS = 100_000

const bm = (key: string, title: string): PBookmark => ({ key, url: 'https://x.dev', title, domain: 'x.dev', note: '', tags: [], read: false })
const PAYLOAD: SharePayload = {
  v: 1,
  title: 'Team onboarding',
  intro: 'For new joiners.',
  curator: { name: 'Ada Okafor' },
  items: [
    { key: 'c:1', kind: 'collection', collection: { name: 'Design system docs', note: '', hue: 2, bookmarks: [bm('c:1/b:2', 'Token reference')] } },
    { key: 'b:3', kind: 'bookmark', bookmark: bm('b:3', 'Rolling back a deploy') },
  ],
}

let salt: Uint8Array
let key: CryptoKey
beforeAll(async () => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  salt = crypto.getRandomValues(new Uint8Array(16))
  key = await deriveKey(PASSWORD, salt, ITERS)
})

async function makeShare(extra: Partial<PublicShare> = {}, payload: unknown = PAYLOAD): Promise<PublicShare> {
  return {
    slug: 'abcdefghij',
    visibility: 'private',
    title: 'Team onboarding',
    curator_name: 'Ada Okafor',
    summary: '1 collection · 1 bookmark',
    payload: await encryptJson(key, payload),
    salt: b64encode(salt),
    kdf_iters: ITERS,
    comment_mode: 'open',
    locked: false,
    created_at: '2026-10-19T10:00:00Z',
    updated_at: '2026-10-19T10:00:00Z',
    expires_at: '2026-11-20T10:00:00Z',
    comment_count: 0,
    ...extra,
  }
}

let seq = 0
async function sealed(author: string, body: string, extra: Partial<PublicComment> = {}): Promise<PublicComment> {
  return {
    id: ++seq,
    parent_id: null,
    item_key: '',
    author_name: await encryptJson(key, author),
    body: await encryptJson(key, body),
    status: 'visible',
    pinned: false,
    votes: 0,
    created_at: '2026-10-21T10:00:00Z',
    mine: false,
    ...extra,
  }
}

/** Enough of EventSource for the live hook: records instances and emits umbral `u` envelopes. */
class FakeEventSource {
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
    for (const fn of this.listeners[type] ?? []) fn(new MessageEvent(type, { data: JSON.stringify(data) }))
  }
}

let root: Root | null = null
let host: HTMLDivElement
async function render(share: PublicShare) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<PrivateGate share={share} />))
}

/** Waits on real crypto (PBKDF2 runs off the main thread) without touching setTimeout, which some tests fake. */
async function until(check: () => boolean, what: string) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (check()) return
    await act(() => new Promise<void>((r) => setImmediate(r)))
  }
  throw new Error(`timed out waiting for ${what}`)
}

const $ = (sel: string) => host.querySelector(sel)
const $$ = (sel: string) => [...host.querySelectorAll(sel)]
const text = () => host.textContent ?? ''
const button = (label: string) => $$('button').find((b) => b.textContent?.trim() === label) as HTMLButtonElement | undefined
const passwordInput = () => $('input#private-share-password') as HTMLInputElement
const unlockButton = () => $('form button[type="submit"]') as HTMLButtonElement

function type(el: HTMLInputElement | HTMLTextAreaElement, value: string) {
  const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement
  Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}

async function tryPassword(pw: string) {
  await act(async () => type(passwordInput(), pw))
  await act(async () => (passwordInput().form as HTMLFormElement).requestSubmit())
  // The form is aria-busy while the key is derived; it is gone once the share opens.
  await until(() => $('form[aria-busy="true"]') === null, 'the attempt to finish')
}

beforeEach(() => {
  seq = 0
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
  getMock.mockResolvedValue({ ok: true, data: { comments: [], count: 0 } })
  FakeEventSource.instances = []
  vi.stubGlobal('EventSource', FakeEventSource)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {}) // jsdom has no scrolling
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  host?.remove()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('PrivateGate lock card', () => {
  it('shows the plaintext fields and a password form, and nothing from the payload', async () => {
    await render(await makeShare())
    expect($('h1')?.textContent).toBe('Team onboarding')
    expect(text()).toContain('Ada Okafor')
    expect(text()).toContain('1 collection')
    expect(text()).toContain('Expires 20 Nov 2026')
    expect(text()).not.toContain('Design system docs')
    expect(passwordInput().type).toBe('password')
    // No name: without JS the form must never put the password in a URL.
    expect(passwordInput().name).toBe('')
  })

  it('shows and hides the password', async () => {
    await render(await makeShare())
    await act(async () => button('Show')!.click())
    expect(passwordInput().type).toBe('text')
    await act(async () => button('Hide')!.click())
    expect(passwordInput().type).toBe('password')
  })
})

describe('unlocking', () => {
  it('reveals the bands with the right password', async () => {
    await render(await makeShare())
    await tryPassword(PASSWORD)
    expect(text()).toContain('Design system docs')
    expect(text()).toContain('Rolling back a deploy')
    expect(text()).toContain('Private · unlocked')
    expect(passwordInput()).toBeNull()
  })

  it('says the password did not work and keeps what was typed', async () => {
    await render(await makeShare())
    await tryPassword('maple-otter-cedar-lark-94')
    expect(text()).toContain('That password didn’t work')
    expect(passwordInput().value).toBe('maple-otter-cedar-lark-94')
    expect(text()).not.toContain('Design system docs')
    expect(unlockButton().disabled).toBe(false)
  })

  it('disables the button for 3 s after five wrong tries in a row', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await render(await makeShare())
    for (let i = 0; i < 4; i++) {
      await tryPassword(`wrong-${i}`)
      expect(unlockButton().disabled).toBe(false)
    }
    await tryPassword('wrong-4')
    expect(unlockButton().disabled).toBe(true)
    expect(text()).toContain('That password didn’t work. Too many tries — wait a few seconds.')
    expect(passwordInput().value).toBe('wrong-4')
    await act(async () => vi.advanceTimersByTime(2999))
    expect(unlockButton().disabled).toBe(true)
    await act(async () => vi.advanceTimersByTime(1))
    expect(unlockButton().disabled).toBe(false)
    // The count starts over: one more wrong try does not lock it again.
    await tryPassword('wrong-5')
    expect(unlockButton().disabled).toBe(false)
  })

  it('shows a damaged state, not a wrong password, for a malformed cipher', async () => {
    await render(await makeShare({ payload: 'not base64 at all!' }))
    await tryPassword(PASSWORD)
    expect(text()).toContain('This share looks damaged')
    expect(text()).not.toContain('That password didn’t work')
  })

  it('shows a damaged state when the decrypted payload is not a v1 share', async () => {
    await render(await makeShare({}, { v: 9, items: [] }))
    await tryPassword(PASSWORD)
    expect(text()).toContain('This share looks damaged')
  })

  it.each([
    ['kdf_iters below 100000', { kdf_iters: 99_999 }],
    ['kdf_iters above 2000000', { kdf_iters: 2_000_001 }],
    ['a non-integer kdf_iters', { kdf_iters: 100_000.5 }],
    ['a salt that is not base64', { salt: 'not base64 at all!' }],
    ['a salt shorter than 16 bytes', { salt: b64encode(new Uint8Array(8)) }],
  ])('refuses a share with %s', async (_what, extra: Partial<PublicShare>) => {
    await render(await makeShare(extra))
    expect(passwordInput()).toBeNull()
    expect(text()).toContain('This share can’t be opened safely')
  })

  it('accepts kdf_iters of exactly 2000000', async () => {
    await render(await makeShare({ kdf_iters: 2_000_000 }))
    expect(passwordInput()).not.toBeNull()
  })

  it('asks for a secure connection when WebCrypto is unavailable', async () => {
    const share = await makeShare()
    const real = globalThis.crypto
    vi.stubGlobal('crypto', { getRandomValues: real.getRandomValues.bind(real) })
    await render(share)
    expect(passwordInput()).toBeNull()
    expect(text()).toContain('This page needs a secure (https) connection to unlock')
    expect(text()).not.toContain('This share looks damaged')
  })

  it('locks again: drops the decrypted view and stores nothing', async () => {
    await render(await makeShare())
    await tryPassword(PASSWORD)
    await act(async () => button('Lock again')!.click())
    expect(text()).not.toContain('Design system docs')
    expect(passwordInput().value).toBe('')
    expect(FakeEventSource.instances.every((s) => s.closed)).toBe(true)
    expect(sessionStorage.length).toBe(0)
    expect(Object.keys(localStorage)).toEqual([])
    expect(document.cookie).not.toContain(PASSWORD)
  })
})

describe('private discussion', () => {
  it('decrypts comments, and an unreadable one says so', async () => {
    getMock.mockResolvedValue({
      ok: true,
      data: { comments: [await sealed('Kofi Mensah', 'Node **20**, not 18.'), { ...(await sealed('x', 'y')), body: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAA' }], count: 2 },
    })
    await render(await makeShare({ comment_count: 2 }))
    await tryPassword(PASSWORD)
    await until(() => text().includes('Kofi Mensah'), 'comments')
    expect(text()).toContain('Node 20, not 18.')
    expect(text()).toContain("Couldn't read this comment")
    expect(text()).toContain('Visible to anyone with the password.')
  })

  it('decrypts live events through the same codec', async () => {
    await render(await makeShare())
    await tryPassword(PASSWORD)
    await until(() => FakeEventSource.instances.some((s) => !s.closed), 'the live stream')
    const live = await sealed('Ama', 'Live hello')
    await act(async () => {
      for (const s of FakeEventSource.instances) s.emit('u', { c: 'public:share:abcdefghij', e: 'comment', d: live })
    })
    await until(() => text().includes('Live hello'), 'the live comment')
    expect(text()).toContain('Ama')
  })

  it('encrypts new comments with a fresh iv each', async () => {
    postMock.mockImplementation(async (_slug, body) => ({
      ok: true,
      data: { ...body, id: 77, parent_id: null, status: 'visible', pinned: false, votes: 0, created_at: '2026-10-22T10:00:00Z', mine: true },
    }))
    await render(await makeShare())
    await tryPassword(PASSWORD)
    await until(() => !!$('textarea[name="body"]'), 'the composer')
    await act(async () => {
      type($('input[name="author_name"]') as HTMLInputElement, 'Kofi')
      type($('textarea[name="body"]') as HTMLTextAreaElement, 'Kofi')
    })
    await act(async () => ($('textarea[name="body"]') as HTMLTextAreaElement).form!.requestSubmit())
    await until(() => postMock.mock.calls.length === 1 && !!$('[data-comment-id="77"]'), 'the post')
    const sent = postMock.mock.calls[0][1]
    expect(sent.author_name).not.toContain('Kofi')
    expect(await decryptJson(key, sent.author_name)).toBe('Kofi')
    expect(await decryptJson(key, sent.body)).toBe('Kofi')
    // Same plaintext, fresh iv: the two ciphers differ.
    expect(sent.author_name).not.toBe(sent.body)
    expect($('[data-comment-id="77"]')?.textContent).toContain('Kofi')
    // A name typed on a private share is not left behind in plaintext on this device.
    expect(localStorage.getItem('jj.name')).toBeNull()
  })
})

describe('commentCodec', () => {
  it('round-trips and rejects ciphertext that is not a string', async () => {
    const codec = commentCodec(key)
    const enc = await codec.encode({ author_name: 'Ada', body: 'Hi' })
    expect(await codec.decode(enc)).toEqual({ author_name: 'Ada', body: 'Hi' })
    await expect(codec.decode({ author_name: await encryptJson(key, { x: 1 }), body: enc.body })).rejects.toThrow()
  })
})
