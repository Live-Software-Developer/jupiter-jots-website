import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { sheetEntries } from '@/lib/share/collections'
import type { PBookmark, PGraph, PNote, PayloadItem } from '@/lib/share/types'
import { pressEscape } from '@/test/dialog'
import { CollectionSheetProvider, OpenCollectionButton } from './CollectionSheet'
import { ShareBand } from './ShareBand'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

const bm = (key: string, title: string): PBookmark => ({ key, url: `https://example.com/${key}`, title, domain: 'example.com', note: '', tags: [], read: false })

const nested: PayloadItem = {
  key: 'c:3',
  kind: 'collection',
  collection: {
    name: 'Web3',
    note: '',
    hue: 2,
    bookmarks: [bm('c:3/b:1', 'Top level')],
    collections: [
      {
        key: 'c:3/c:7',
        name: 'Near',
        note: '',
        hue: 3,
        bookmarks: [bm('c:3/b:2', 'Rust cross contract calls')],
        collections: [{ key: 'c:3/c:8', name: 'Deeper', note: '', hue: 4, bookmarks: [bm('c:3/b:3', 'Storage staking')] }],
      },
    ],
  },
}

const graph: PGraph = {
  name: 'Path',
  description: 'How to start',
  mode: 'board',
  steps: [],
  links: [],
  nodes: [
    { id: 'x', stepId: null, x: 0, y: 0, ref: { kind: 'bookmark', bookmark: bm('n:5/g:4/n:x', 'First step') } },
    {
      id: 'y',
      stepId: null,
      x: 0,
      y: 0,
      ref: { kind: 'note', note: { key: 'n:5/g:4/n:y', title: 'Inner', body: '', tags: [], links: [{ kind: 'graph', key: 'n:5/g:4/n:y/g:9', name: 'Other graph' }] } },
    },
  ],
}
const note: PNote = {
  key: 'n:5',
  title: 'Why',
  body: 'Read these.',
  tags: [],
  links: [
    { kind: 'collection', key: 'n:5/c:3', name: 'Web3', hue: 2, collection: { ...nested.collection, bookmarks: [bm('n:5/c:3/b:1', 'Linked top')] } } as never,
    { kind: 'graph', key: 'n:5/g:4', name: 'Path', graph },
    { kind: 'collection', key: 'n:5/c:6', name: 'Old style', hue: 1 },
  ],
}
const noteItem: PayloadItem = { key: 'n:5', kind: 'note', note }

let root: Root | null = null
let host: HTMLElement | null = null
function mount(items: PayloadItem[], body: React.ReactNode) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() =>
    root!.render(
      <CollectionSheetProvider collections={sheetEntries(items)} curator="Ada">
        {body}
      </CollectionSheetProvider>,
    ),
  )
  return host
}
afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  document.documentElement.style.overflow = ''
})

const click = (el: Element | null | undefined) => act(() => (el as HTMLElement).click())
const sheets = () => [...document.querySelectorAll<HTMLDialogElement>('dialog[open][aria-labelledby]')]
const top = () => sheets().at(-1)!
const titleOf = (d: HTMLDialogElement) => document.getElementById(d.getAttribute('aria-labelledby')!)?.textContent
const rows = (d: ParentNode) => [...d.querySelectorAll('[data-bookmark-row]')].map((r) => r.querySelector('.font-medium')?.textContent)

describe('nested collections in the sheet', () => {
  const open = () => {
    const el = mount(
      [nested],
      <OpenCollectionButton itemKey="c:3" className="">
        Open collection
      </OpenCollectionButton>,
    )
    click(el.querySelector('button'))
    return top()
  }

  it('shows sub-collections as sections (first level open), then direct rows, with totals in the meta', () => {
    const d = open()
    expect(d.textContent).toContain('3 bookmarks · from Ada')
    const sections = [...d.querySelectorAll('[data-sub-collection]')]
    expect(sections.map((s) => s.getAttribute('aria-label'))).toEqual(['Near', 'Deeper'])
    const [near, deeper] = sections.map((s) => s.querySelector<HTMLButtonElement>('button[aria-expanded]')!)
    expect(near.getAttribute('aria-expanded')).toBe('true')
    expect(deeper.getAttribute('aria-expanded')).toBe('false')
    expect(rows(d)).toEqual(['Rust cross contract calls', 'Top level'])
    click(deeper)
    // A section lists its sub-collections first, then its own rows.
    expect(rows(d)).toEqual(['Storage staking', 'Rust cross contract calls', 'Top level'])
    click(near)
    expect(rows(d)).toEqual(['Top level'])
  })

  it('filters across every level and opens the sections that hold a match', () => {
    const d = open()
    const input = d.querySelector('input[type="search"]') as HTMLInputElement
    act(() => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'staking')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(rows(d)).toEqual(['Storage staking'])
    expect([...d.querySelectorAll('[data-sub-collection]')].map((s) => s.getAttribute('aria-label'))).toEqual(['Near', 'Deeper'])
    expect(d.textContent).toContain('1 of 3 items shown')
  })

  it('keeps the band preview flat with totals', () => {
    const el = mount([nested], <ShareBand item={nested} index={0} total={1} />)
    expect(el.textContent).toContain('3 bookmarks · 1 collection inside')
    expect(rows(el)).toEqual(['Top level', 'Rust cross contract calls', 'Storage staking'])
  })
})

describe('note links that open sheets', () => {
  const page = () => mount([noteItem], <ShareBand item={noteItem} index={0} total={1} />)

  it('opens a linked collection in the collection sheet, nesting included', () => {
    const el = page()
    const chip = [...el.querySelectorAll('button[aria-haspopup="dialog"]')].find((b) => b.textContent?.includes('Web3'))!
    click(chip)
    expect(titleOf(top())).toBe('Web3')
    expect(top().textContent).toContain('linked from Why')
    expect(rows(top())).toContain('Linked top')
    act(() => pressEscape())
    expect(sheets()).toHaveLength(0)
    expect(document.activeElement).toBe(chip)
  })

  it('opens a linked graph full screen with Board/Canvas; Esc closes it and focus returns to the chip', () => {
    const el = page()
    const chip = [...el.querySelectorAll('button[aria-haspopup="dialog"]')].find((b) => b.textContent?.includes('Path'))!
    click(chip)
    const d = top()
    expect(titleOf(d)).toBe('Path')
    expect(d.querySelector('[data-sheet="wide"]')).not.toBeNull()
    expect([...d.querySelectorAll('button[aria-pressed]')].map((b) => b.textContent)).toEqual(['Board', 'Canvas'])
    expect(d.textContent).toContain('First step')
    // The note inside the linked graph opens its own sheet on top; its graph link is a plain chip.
    click([...d.querySelectorAll('button')].find((b) => b.textContent?.includes('Inner')))
    expect(titleOf(top())).toBe('Inner')
    const inner = top().querySelector('section[aria-label="Linked"]')!
    expect(inner.querySelector('button')).toBeNull()
    expect(inner.textContent).toContain('Other graph')
    expect(inner.textContent).toContain('Graph')
    act(() => pressEscape())
    expect(titleOf(top())).toBe('Path')
    act(() => pressEscape())
    expect(sheets()).toHaveLength(0)
    expect(document.activeElement).toBe(chip)
  })

  it('shows a name-only link (an older payload) as a plain chip that says what it is', () => {
    const el = page()
    const chips = [...el.querySelectorAll('section[aria-label="Linked"] li')]
    const old = chips.find((c) => c.textContent?.includes('Old style'))!
    expect(old.querySelector('button')).toBeNull()
    expect(old.textContent).toContain('Collection')
  })
})
