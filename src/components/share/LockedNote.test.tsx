import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getComments } from '@/lib/share/api'
import { b64encode, deriveKey, encryptJson } from '@/lib/share/crypto'
import vec from '@/lib/share/noteLock.vectors.json'
import { toPayload } from '@/lib/share/payload'
import type { PublicShare, SharePayload } from '@/lib/share/types'
import { PrivateGate } from './PrivateGate'
import { ShareView } from './ShareView'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('@/lib/share/api', () => ({
  apiBase: () => 'http://127.0.0.1:8000',
  visitorKey: () => 'f'.repeat(32),
  getComments: vi.fn(),
  postComment: vi.fn(),
  vote: vi.fn(),
  report: vi.fn(),
}))

// The extension's own output (its sharePayload.test builds the same notes from these vectors).
const RAW = {
  v: 1,
  title: 'Plans',
  intro: '',
  curator: { name: 'Ada' },
  items: [
    { key: 'n:8', kind: 'note', note: vec.hidden },
    { key: 'c:1', kind: 'collection', collection: { name: 'Trip folder', note: '', hue: 2, bookmarks: [], notes: [{ ...vec.visible, key: 'c:1/n:7' }] } },
    {
      key: 'g:1',
      kind: 'graph',
      graph: { name: 'Route', description: '', mode: 'board', steps: [], links: [], nodes: [{ id: 'a', stepId: null, x: 0, y: 0, ref: { kind: 'note', note: { ...vec.visible, key: 'g:1/n:a' } } }] },
    },
  ],
}
const payload = (raw: unknown = RAW) => toPayload(raw)!

const SHARE: PublicShare = {
  slug: 'abcdefghij', visibility: 'unlisted', title: 'Plans', curator_name: 'Ada', summary: '', payload: '', salt: '', kdf_iters: 0,
  comment_mode: 'off', locked: false, created_at: '2026-10-19T10:00:00Z', updated_at: '2026-10-19T10:00:00Z', expires_at: null, comment_count: 0,
}

let root: Root | null = null
let host: HTMLDivElement
beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})
beforeEach(() => {
  localStorage.clear()
  vi.mocked(getComments).mockResolvedValue({ ok: true, data: { comments: [], count: 0 } })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  host?.remove()
  vi.restoreAllMocks()
})

async function mount(node: React.ReactNode) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(node))
}
async function until(check: () => boolean, what: string) {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (check()) return
    await act(() => new Promise<void>((r) => setImmediate(r)))
  }
  throw new Error(`timed out waiting for ${what}`)
}
function type(el: HTMLInputElement, value: string) {
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value)
  el.dispatchEvent(new Event('input', { bubbles: true }))
}
/** Types into a locked note's form and submits it, waiting for the derivation. */
async function unlock(scope: ParentNode, pw: string) {
  const input = scope.querySelector<HTMLInputElement>('[data-locked-note] input[type="password"], dialog[open] input[type="password"]')!
  await act(async () => type(input, pw))
  await act(async () => input.form!.requestSubmit())
  await until(() => !document.querySelector('form[aria-busy="true"]'), 'the unlock to finish')
}
const band = (id: string) => document.getElementById(id)!

describe('locked notes on a share page', () => {
  it('shows a locked card with its title (or "Locked note"), the password field and Unlock', async () => {
    await mount(<ShareView share={SHARE} payload={payload()} />)
    const card = band('item-n-8').querySelector('[data-locked-note]')!
    expect(card.textContent).toContain('Locked note')
    const label = card.querySelector('label')!
    expect(label.textContent).toBe('Enter the note’s password')
    const input = card.querySelector<HTMLInputElement>('input')!
    expect(input.type).toBe('password')
    expect(input.placeholder).toBe('Note password')
    expect(input.name).toBe('')
    expect(card.querySelector('button[type="submit"]')!.textContent).toContain('Unlock')
    expect(card.querySelector('svg')).toBeTruthy()
    // Nothing of the body before it's unlocked.
    expect(document.body.textContent).not.toContain('north gate')
    expect(band('item-c-1').textContent).toContain('Visible plan')
  })

  it('a wrong password says so and keeps it locked', async () => {
    await mount(<ShareView share={SHARE} payload={payload()} />)
    await unlock(band('item-n-8'), vec.wrong_password)
    expect(band('item-n-8').textContent).toContain('That password doesn’t open this note.')
    expect(band('item-n-8').querySelector('[data-locked-note]')).toBeTruthy()
  })

  it('the right password renders its markdown and hidden title like a shared note', async () => {
    await mount(<ShareView share={SHARE} payload={payload()} />)
    await unlock(band('item-n-8'), vec.password)
    const b = band('item-n-8')
    expect(b.querySelector('[data-locked-note]')).toBeNull()
    const card = b.querySelector('article')!
    expect(card.querySelector('h3')!.textContent).toBe(vec.title)
    expect(card.textContent).toContain('Plan B')
    expect(card.querySelector('strong')?.textContent).toBe('north gate')
    expect(card.querySelectorAll('li')).toHaveLength(2)
  })

  it('opens inside a collection, and unlocking one place opens it everywhere it appears', async () => {
    await mount(<ShareView share={SHARE} payload={payload()} />)
    await unlock(band('item-c-1'), vec.password)
    expect(band('item-c-1').querySelector('[data-locked-note]')).toBeNull()
    expect(band('item-c-1').querySelector('strong')?.textContent).toBe('north gate')
    // The graph's node is a different key: still locked.
    expect(band('item-g-1').textContent).toContain('Needs its password')
  })

  it('opens inside a graph node, from its sheet', async () => {
    await mount(<ShareView share={SHARE} payload={payload()} />)
    const card = band('item-g-1').querySelector<HTMLElement>('[data-gid="a"] button')!
    expect(card.textContent).toContain('Visible plan')
    await act(async () => card.click())
    const sheet = () => document.querySelector<HTMLDialogElement>('dialog[open]')!
    expect(sheet().textContent).toContain('Enter the note’s password')
    await unlock(sheet(), vec.password)
    expect(sheet().querySelector('strong')?.textContent).toBe('north gate')
    expect(card.textContent).toContain('Meet at the north gate')
  })

  it('a live refresh keeps it open when its ciphertext is unchanged, and locks it again when it changed', async () => {
    await mount(<ShareView share={SHARE} payload={payload()} />)
    await unlock(band('item-n-8'), vec.password)
    expect(band('item-n-8').querySelector('[data-locked-note]')).toBeNull()

    // Same note, something else changed (a new item).
    const more = { ...RAW, items: [...RAW.items, { key: 'n:9', kind: 'note', note: { key: 'n:9', title: 'New', body: 'hi', tags: [] } }] }
    await act(async () => root!.render(<ShareView share={SHARE} payload={payload(more)} />))
    expect(band('item-n-8').querySelector('strong')?.textContent).toBe('north gate')

    // The curator edited it: a new ciphertext (here the visible note's body cipher) locks it again.
    const edited = { ...RAW, items: [{ key: 'n:8', kind: 'note', note: { ...vec.hidden, lock: { ...vec.hidden.lock, body: vec.visible.lock.body } } }, ...RAW.items.slice(1)] }
    await act(async () => root!.render(<ShareView share={SHARE} payload={payload(edited)} />))
    expect(band('item-n-8').querySelector('[data-locked-note]')).toBeTruthy()
    expect(band('item-n-8').textContent).not.toContain('north gate')
  })
})

describe('locked notes in a private share', () => {
  it('asks for the share password first, then the note password', async () => {
    const PASSWORD = 'maple-otter-cedar-lark-93'
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const key = await deriveKey(PASSWORD, salt, 100_000)
    const share: PublicShare = { ...SHARE, visibility: 'private', salt: b64encode(salt), kdf_iters: 100_000, payload: await encryptJson(key, RAW as unknown as SharePayload) }
    await mount(<PrivateGate share={share} />)
    const pw = document.querySelector<HTMLInputElement>('input#private-share-password')!
    await act(async () => type(pw, PASSWORD))
    await act(async () => pw.form!.requestSubmit())
    await until(() => !!document.getElementById('item-n-8'), 'the share to open')
    expect(band('item-n-8').querySelector('[data-locked-note]')).toBeTruthy()
    await unlock(band('item-n-8'), vec.password)
    expect(band('item-n-8').querySelector('strong')?.textContent).toBe('north gate')
  })
})
