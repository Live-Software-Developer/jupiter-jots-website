import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { getExplore } from '@/lib/share/api'
import type { ExploreItem, ExploreResult } from '@/lib/share/types'
import { ExploreList, ExploreSearch } from './ExploreList'

vi.mock('@/lib/share/api', () => ({ getExplore: vi.fn(), EXPLORE_MAX_Q: 100 }))
// next/form needs the app router; a plain form is enough here.
vi.mock('next/form', () => ({ default: (p: React.ComponentProps<'form'>) => <form {...p} /> }))

const exploreMock = vi.mocked(getExplore)

const item = (n: number, extra: Partial<ExploreItem> = {}): ExploreItem => ({
  slug: `slug${String(n).padStart(6, '0')}`,
  title: `Share ${n}`,
  curator_name: 'Ada Okafor',
  summary: '2 collections',
  updated_at: '2026-10-20T10:00:00Z',
  ...extra,
})
const ok = (results: ExploreItem[], next_cursor: string | null = null): ExploreResult => ({ status: 'ok', page: { results, next_cursor } })

let root: Root | null = null
let host: HTMLElement
beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})
beforeEach(() => {
  host = document.createElement('div')
  document.body.append(host)
  exploreMock.mockReset()
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  host.remove()
})

async function render(node: React.ReactNode) {
  root = createRoot(host)
  await act(async () => root!.render(node))
}
const text = () => host.textContent ?? ''
const button = (label: string) => [...host.querySelectorAll('button')].find((b) => b.textContent === label)

describe('ExploreList', () => {
  it('renders a card per share linking to its page', async () => {
    await render(<ExploreList q="" initial={ok([item(1), item(2, { curator_name: '' })])} />)
    const links = [...host.querySelectorAll('a[href^="/s/"]')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/s/slug000001', '/s/slug000002'])
    expect(text()).toContain('Share 1')
    expect(text()).toContain('Ada Okafor')
    expect(text()).toContain('2 collections')
    expect(text()).toContain('Updated 20 Oct 2026')
    expect(text()).toContain('Shared on Jupiter Jots')
    expect(text()).toContain('That’s every public share')
    expect(button('Load more')).toBeUndefined()
  })

  it('loads more with the cursor and the search, skipping repeats', async () => {
    exploreMock.mockResolvedValue(ok([item(2), item(3)], null))
    await render(<ExploreList q="rust" initial={ok([item(1), item(2)], 'c1')} />)
    expect(text()).toContain('matching “rust”')
    await act(async () => button('Load more')!.click())
    expect(exploreMock).toHaveBeenCalledWith({ q: 'rust', cursor: 'c1' })
    expect(host.querySelectorAll('a[href^="/s/"]')).toHaveLength(3)
    expect(button('Load more')).toBeUndefined()
  })

  it('keeps the cards and offers a retry when loading more fails', async () => {
    exploreMock.mockResolvedValueOnce({ status: 'down' })
    await render(<ExploreList q="" initial={ok([item(1)], 'c1')} />)
    await act(async () => button('Load more')!.click())
    expect(text()).toContain('Couldn’t reach our server.')
    expect(host.querySelectorAll('a[href^="/s/"]')).toHaveLength(1)
    exploreMock.mockResolvedValueOnce(ok([item(5)]))
    await act(async () => button('Try again')!.click())
    expect(host.querySelectorAll('a[href^="/s/"]')).toHaveLength(2)
    expect(text()).not.toContain('Couldn’t reach')
  })

  it('says when there are no public shares yet', async () => {
    await render(<ExploreList q="" initial={ok([])} />)
    expect(text()).toContain('No public shares yet')
    expect(text()).toContain('never listed')
  })

  it('says when nothing matches a search, with a way back', async () => {
    await render(<ExploreList q="zebra" initial={ok([])} />)
    expect(text()).toContain('No public shares match')
    expect(text()).toContain('“zebra”')
    expect(host.querySelector('a[href="/explore"]')?.textContent).toBe('Clear search')
  })

  it('tells a backend outage apart from an error, both with a retry', async () => {
    await render(<ExploreList q="a b" initial={{ status: 'down' }} />)
    expect(text()).toContain('can’t reach our server')
    expect(host.querySelector('a[href="/explore?q=a%20b"]')?.textContent).toBe('Try again')
    act(() => root!.unmount())
    await render(<ExploreList q="" initial={{ status: 'error' }} />)
    expect(text()).toContain('can’t be loaded right now')
    expect(host.querySelector('a[href="/explore"]')?.textContent).toBe('Try again')
  })
})

describe('ExploreSearch', () => {
  it('is a GET search form for /explore that keeps the query', async () => {
    await render(<ExploreSearch q="graphs" />)
    const form = host.querySelector('form')!
    expect(form.getAttribute('action')).toBe('/explore')
    expect(form.getAttribute('role')).toBe('search')
    const input = host.querySelector<HTMLInputElement>('input[name="q"]')!
    expect(input.value).toBe('graphs')
    expect(input.maxLength).toBe(100)
    expect(host.querySelector('label[for="explore-q"]')).not.toBeNull()
  })
})
