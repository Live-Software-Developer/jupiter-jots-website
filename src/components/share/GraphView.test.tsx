import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { sheetEntries } from '@/lib/share/collections'
import type { PBookmark, PGraph, PayloadItem } from '@/lib/share/types'
import { pressEscape } from '@/test/dialog'
import { BookmarkSheetProvider } from './BookmarkSheet'
import { CollectionCommentsSlot, CollectionSheetContext, CollectionSheetProvider, OpenCollectionButton } from './CollectionSheet'
import { canvasSize, GraphView } from './GraphView'

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

const bm = (id: number, extra: Partial<PBookmark> = {}): PBookmark => ({
  key: `b:${id}`,
  url: `https://example.com/${id}`,
  title: `Bookmark ${id}`,
  domain: 'example.com',
  note: '',
  tags: [],
  read: false,
  ...extra,
})

const graph: PGraph = {
  name: 'Rust, from zero to shipping',
  description: '',
  mode: 'board',
  steps: [
    { id: 's1', label: 'Basics' },
    { id: 's2', label: 'Deeper' },
  ],
  nodes: [
    { id: 'b1', stepId: 's1', x: 40, y: 64, ref: { kind: 'bookmark', bookmark: bm(1) } },
    {
      id: 'c1',
      stepId: 's2',
      x: 340,
      y: 240,
      ref: {
        kind: 'collection',
        key: 'c:7',
        collection: {
          name: 'Ownership, explained five ways',
          note: 'Pick whichever sticks.',
          hue: 5,
          bookmarks: [bm(10, { title: 'What is ownership?' }), bm(11, { title: 'Too many lists', domain: 'rust-unofficial.github.io' })],
        },
      },
    },
    { id: 'b2', stepId: 's2', x: 340, y: 64, ref: { kind: 'bookmark', bookmark: bm(2, { url: 'javascript:alert(1)' }) } },
  ],
  links: [
    { from: 'b1', to: 'c1' },
    { from: 'b1', to: 'b2' },
  ],
}
const graphItem: PayloadItem = { key: 'g:1', kind: 'graph', graph }
const collectionItem: PayloadItem = {
  key: 'c:3',
  kind: 'collection',
  collection: { name: 'Weekend reading', note: 'The shelf I finish.', hue: 2, bookmarks: [bm(20, { title: 'Flexbox guide', tags: ['css'] }), bm(21, { title: 'Grug brain' })] },
}

let root: Root | null = null
let host: HTMLElement | null = null

function mount(node: React.ReactNode) {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(node))
  return host
}

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  document.documentElement.style.overflow = ''
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const click = (el: Element | null) => act(() => (el as HTMLElement).click())
const esc = () => act(() => pressEscape())
const button = (el: ParentNode, name: string | RegExp) =>
  [...el.querySelectorAll('button')].find((b) => (typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent ?? '')))!
const canvasNode = (el: ParentNode, id: string) => el.querySelector<HTMLElement>(`[data-surface] [data-gid="${id}"]`)
const graphDialog = () => document.querySelector<HTMLDialogElement>('dialog[open][aria-label]')
const sheet = () => document.querySelector<HTMLDialogElement>('dialog[open][aria-labelledby]')

describe('GraphView', () => {
  it('starts in the graph mode and shows the board columns', () => {
    const el = mount(<GraphView graph={graph} itemKey="g:1" />)
    expect(button(el, 'Board').getAttribute('aria-pressed')).toBe('true')
    expect(button(el, 'Canvas').getAttribute('aria-pressed')).toBe('false')
    const cols = [...el.querySelectorAll('[role="group"][aria-label]:not([aria-label="View"])')].map((s) => s.getAttribute('aria-label'))
    expect(cols).toEqual(['Basics', 'Deeper'])
  })

  it('toggling to Canvas renders absolutely positioned nodes at their normalised x/y', () => {
    const el = mount(<GraphView graph={graph} itemKey="g:1" />)
    click(button(el, 'Canvas'))
    expect(button(el, 'Canvas').getAttribute('aria-pressed')).toBe('true')
    const bounds = canvasSize(graph)
    for (const n of graph.nodes) {
      const box = canvasNode(el, n.id)!
      expect(box.classList.contains('absolute')).toBe(true)
      expect(box.style.left).toBe(`${n.x - bounds.x}px`)
      expect(box.style.top).toBe(`${n.y - bounds.y}px`)
      expect(box.style.width).toBe('240px')
    }
  })

  it('fits and centres the whole canvas, capped at 100%', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(598)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(308)
    const el = mount(<GraphView graph={{ ...graph, mode: 'canvas' }} itemKey="g:1" />)
    // canvasSize is 1100 × 520 here, so 598 × 308 fits at 50% and the margins centre it.
    expect(el.querySelector<HTMLElement>('[data-surface]')!.style.transform).toBe('translate(24px, 24px) scale(0.5)')
    expect(el.textContent).toContain('50%')
    act(() => root!.unmount())
    host!.remove()
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(4000)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(1000)
    const wide = mount(<GraphView graph={{ ...graph, mode: 'canvas' }} itemKey="g:1" />)
    expect(wide.querySelector<HTMLElement>('[data-surface]')!.style.transform.endsWith('scale(1)')).toBe(true)
    expect(wide.textContent).toContain('100%')
  })

  it('brings a graph with negative node coordinates back inside the canvas', () => {
    const shifted: PGraph = {
      ...graph,
      nodes: graph.nodes.map((n) => ({ ...n, x: n.x - 300 })),
    }
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(400)
    const el = mount(<GraphView graph={{ ...shifted, mode: 'canvas' }} itemKey="g:1" />)
    const bounds = canvasSize(shifted)
    expect(bounds.x).toBeLessThan(0)
    for (const n of shifted.nodes) {
      expect(canvasNode(el, n.id)!.style.left).toBe(`${n.x - bounds.x}px`)
      expect(Number.parseFloat(canvasNode(el, n.id)!.style.left)).toBeGreaterThan(0)
    }
    expect(el.querySelector('[data-canvas-controls]')).not.toBeNull()
  })

  it('zooms the canvas between 30% and 160%, and Fit view restores the fit', () => {
    const el = mount(<GraphView graph={{ ...graph, mode: 'canvas' }} itemKey="g:1" />)
    expect(el.textContent).toContain('100%')
    click(el.querySelector('[aria-label="Zoom in"]'))
    expect(el.querySelector<HTMLElement>('[data-surface]')!.style.transform).toBe('translate(0px, 0px) scale(1.1)')
    for (let i = 0; i < 12; i++) click(el.querySelector('[aria-label="Zoom in"]'))
    expect(el.textContent).toContain('160%')
    for (let i = 0; i < 20; i++) click(el.querySelector('[aria-label="Zoom out"]'))
    expect(el.textContent).toContain('30%')
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(598)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(308)
    click(el.querySelector('[aria-label="Fit view"]'))
    expect(el.querySelector<HTMLElement>('[data-surface]')!.style.transform).toBe('translate(24px, 24px) scale(0.5)')
  })

  it('clicking a collection node calls open with its nested key and the clicked button', () => {
    const open = vi.fn()
    const el = mount(
      <CollectionSheetContext.Provider value={{ open }}>
        <GraphView graph={graph} itemKey="g:1" />
      </CollectionSheetContext.Provider>,
    )
    const node = el.querySelector('[data-gid="c1"] button')
    click(node)
    expect(open).toHaveBeenCalledWith('g:1/n:c1', node)
    click(button(el, 'Canvas'))
    click(canvasNode(el, 'c1')!.querySelector('button'))
    expect(open).toHaveBeenLastCalledWith('g:1/n:c1', canvasNode(el, 'c1')!.querySelector('button'))
  })

  it('opens a bookmark sheet from a node, with the URL only inside the sheet', () => {
    const el = mount(
      <BookmarkSheetProvider>
        <GraphView graph={graph} itemKey="g:1" />
      </BookmarkSheetProvider>,
    )
    expect(el.querySelector('a')).toBeNull()
    click(el.querySelector('[data-gid="b1"] button[aria-haspopup="dialog"]'))
    const d = sheet()!
    expect(d.textContent).toContain('Bookmark 1')
    const open = [...d.querySelectorAll('a')].find((a) => a.textContent?.includes('Open link'))!
    expect(open.getAttribute('href')).toBe('https://example.com/1')
    expect(open.getAttribute('target')).toBe('_blank')
  })

  it('leaves Open link out of the sheet when the bookmark URL is unsafe', () => {
    const el = mount(
      <BookmarkSheetProvider>
        <GraphView graph={graph} itemKey="g:1" />
      </BookmarkSheetProvider>,
    )
    click(el.querySelector('[data-gid="b2"] button[aria-haspopup="dialog"]'))
    const d = sheet()!
    expect(d.textContent).toContain('Bookmark 2')
    expect([...d.querySelectorAll('a')].some((a) => a.textContent?.includes('Open link'))).toBe(false)
  })

  it('draws one wire per link and lights up a hovered node’s wires', () => {
    const el = mount(<GraphView graph={graph} itemKey="g:1" />)
    const wires = () => [...el.querySelectorAll<SVGPathElement>('path[data-wire]')]
    expect(wires().map((p) => p.dataset.wire)).toEqual(['b1>c1', 'b1>b2'])
    act(() => {
      el.querySelector('[data-gid="c1"]')!.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
    })
    const hot = (k: string) => wires().find((p) => p.dataset.wire === k)!.getAttribute('class')
    expect(hot('b1>c1')).toContain('text-primary')
    expect(hot('b1>b2')).not.toContain('text-primary')
    expect(wires()[0].getAttribute('marker-end')).toMatch(/-hot\)$/)
  })

  it('observes the surface and every card for resizes, and disconnects on unmount', () => {
    const observed: Element[] = []
    const disconnect = vi.fn()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(el: Element) {
          observed.push(el)
        }
        unobserve() {}
        disconnect = disconnect
      },
    )
    const el = mount(<GraphView graph={graph} itemKey="g:1" />)
    const cards = [...el.querySelectorAll('[data-gid]')]
    expect(cards).toHaveLength(3)
    for (const c of cards) expect(observed).toContain(c)
    expect(disconnect).not.toHaveBeenCalled()
    act(() => root!.unmount())
    expect(disconnect).toHaveBeenCalled()
  })

  it('full screen is a native modal dialog; Esc leaves it and focus returns to the toggle', () => {
    const el = mount(<GraphView graph={graph} itemKey="g:1" />)
    click(el.querySelector('[aria-label="Full screen"]'))
    const d = graphDialog()!
    expect(d.getAttribute('aria-label')).toBe(graph.name)
    expect(d.querySelector('[data-graph-shell]')).not.toBeNull()
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Exit full screen')
    expect(document.documentElement.style.overflow).toBe('hidden')
    esc()
    expect(graphDialog()).toBeNull()
    expect(document.activeElement).toBe(el.querySelector('[aria-label="Full screen"]'))
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('the exit button leaves full screen', () => {
    const el = mount(<GraphView graph={graph} itemKey="g:1" />)
    click(el.querySelector('[aria-label="Full screen"]'))
    click(document.querySelector('[aria-label="Exit full screen"]'))
    expect(graphDialog()).toBeNull()
  })

  it('puts graph comments in their own tab in full screen', () => {
    const el = mount(
      <CollectionCommentsSlot.Provider value={(k) => <p data-comments>{`comments on ${k}`}</p>}>
        <GraphView graph={graph} itemKey="g:1" />
      </CollectionCommentsSlot.Provider>,
    )
    click(el.querySelector('[aria-label="Full screen"]'))
    const d = graphDialog()!
    expect(d.querySelector('[role="tablist"][aria-label="Graph sections"]')).not.toBeNull()
    expect(d.querySelector('[data-comments]')).toBeNull()
    click([...d.querySelectorAll('[role="tab"]')].find((b) => b.textContent === 'Comments')!)
    expect(d.querySelector('[data-comments]')?.textContent).toBe('comments on g:1')
    click([...d.querySelectorAll('[role="tab"]')].find((b) => b.textContent === 'Content')!)
    expect([...d.querySelectorAll('button')].some((b) => b.textContent?.trim() === 'Board')).toBe(true)
  })
})

describe('note nodes', () => {
  const noted: PGraph = {
    ...graph,
    nodes: [
      ...graph.nodes.map((n) => (n.ref.kind === 'collection' ? { ...n, ref: { ...n.ref, collection: { ...n.ref.collection, notes: [{ key: 'g:1/n:c1/n:3', title: 'A', body: '', tags: [] }] } } } : n)),
      { id: 'n1', stepId: 's1', x: 40, y: 240, ref: { kind: 'note', note: { key: 'g:1/n:n1', title: 'Why this order', body: 'Read **ownership** first.\n\n- then borrowing', tags: ['rust'] } } },
    ],
  }

  it('shows the title and a plain preview, and counts notes on collection nodes', () => {
    const el = mount(<GraphView graph={noted} itemKey="g:1" />)
    const card = el.querySelector('[data-gid="n1"]')!
    expect(card.textContent).toContain('Why this order')
    expect(card.textContent).toContain('Read ownership first.')
    expect(card.querySelector('strong')).toBeNull()
    expect(el.querySelector('[data-gid="c1"]')!.textContent).toContain('1 note · 2 links')
  })

  it('shows only a clamped excerpt of a long multi-paragraph note, not the whole body', () => {
    const long: PGraph = {
      ...noted,
      nodes: noted.nodes.map((n) => (n.id === 'n1' && n.ref.kind === 'note' ? { ...n, ref: { kind: 'note' as const, note: { ...n.ref.note, body: `${'First paragraph words. '.repeat(12)}\n\nSECOND-PARAGRAPH-MARKER` } } } : n)),
    }
    const card = mount(<GraphView graph={long} itemKey="g:1" />).querySelector('[data-gid="n1"]')!
    expect(card.textContent).toContain('Why this order')
    expect(card.textContent).toContain('First paragraph words.')
    expect(card.textContent).not.toContain('SECOND-PARAGRAPH-MARKER')
  })

  it('opens the whole note in a sheet with its comments, and focus returns to the card', () => {
    const el = mount(
      <CollectionCommentsSlot.Provider value={(k) => <p data-comments>{`comments on ${k}`}</p>}>
        <GraphView graph={noted} itemKey="g:1" />
      </CollectionCommentsSlot.Provider>,
    )
    const trigger = el.querySelector<HTMLElement>('[data-gid="n1"] button')!
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog')
    click(trigger)
    const d = sheet()!
    expect(document.getElementById(d.getAttribute('aria-labelledby')!)?.textContent).toBe('Why this order')
    expect(d.querySelector('strong')?.textContent).toBe('ownership')
    expect(d.querySelectorAll('li')).toHaveLength(1)
    expect(d.textContent).toContain('in Rust, from zero to shipping')
    expect(d.textContent).toContain('#rust')
    expect(d.querySelector('[data-comments]')?.textContent).toBe('comments on g:1/n:n1')
    esc()
    expect(sheet()).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })
})

describe('CollectionSheet', () => {
  function page() {
    return mount(
      <CollectionSheetProvider collections={sheetEntries([collectionItem, graphItem])} curator="Ada Okafor">
        <OpenCollectionButton itemKey="c:3" className="">
          Open collection
        </OpenCollectionButton>
        <GraphView graph={graph} itemKey="g:1" />
      </CollectionSheetProvider>,
    )
  }

  it('opens a collection item as a labelled native modal dialog with its rows', () => {
    const el = page()
    expect(sheet()).toBeNull()
    click(button(el, 'Open collection'))
    const d = sheet()!
    expect(document.getElementById(d.getAttribute('aria-labelledby')!)?.textContent).toBe('Weekend reading')
    expect(d.textContent).toContain('2 bookmarks · from Ada Okafor')
    expect(d.querySelectorAll('[data-bookmark-row]')).toHaveLength(2)
    expect(d.querySelectorAll('[data-bookmark-row] button[aria-haspopup="dialog"]')).toHaveLength(2)
    expect(d.querySelectorAll('[data-bookmark-row] a')).toHaveLength(0)
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close')
  })

  it('opens a graph collection node with the graph as context', () => {
    const el = page()
    click(el.querySelector('[data-gid="c1"] button'))
    expect(sheet()!.querySelector('h2')?.textContent).toBe('Ownership, explained five ways')
    expect(sheet()!.textContent).toContain('in Rust, from zero to shipping')
  })

  it('returns focus to the clicked trigger even when the click did not focus it', () => {
    const el = page()
    const trigger = button(el, 'Open collection')
    click(trigger)
    expect(document.activeElement).not.toBe(trigger)
    click(sheet()!.querySelector('[aria-label="Close"]'))
    expect(sheet()).toBeNull()
    expect(document.activeElement).toBe(trigger)
  })

  it('Esc closes only the sheet over a full-screen graph, and focus returns to the node', () => {
    const el = page()
    click(el.querySelector('[aria-label="Full screen"]'))
    const trigger = graphDialog()!.querySelector<HTMLElement>('[data-gid="c1"] button')!
    click(trigger)
    expect(sheet()).not.toBeNull()
    esc()
    expect(sheet()).toBeNull()
    expect(graphDialog()).not.toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(document.documentElement.style.overflow).toBe('hidden')
    esc()
    expect(graphDialog()).toBeNull()
    expect(document.documentElement.style.overflow).toBe('')
  })

  it('filters rows by title, domain, note or tag', () => {
    const el = page()
    click(button(el, 'Open collection'))
    const input = sheet()!.querySelector<HTMLInputElement>('input[type="search"]')!
    const set = (v: string) =>
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, v)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    set('CSS')
    expect(sheet()!.querySelectorAll('[data-bookmark-row]')).toHaveLength(1)
    set('nothing like this')
    expect(sheet()!.querySelectorAll('[data-bookmark-row]')).toHaveLength(0)
    expect(sheet()!.textContent).toContain('Nothing matches')
  })

  it('puts the sheet comments behind a Comments tab, and nothing without a provider', () => {
    let el = page()
    click(el.querySelector('[data-gid="c1"] button'))
    expect(sheet()!.querySelector('[data-comments]')).toBeNull()
    expect(sheet()!.querySelector('[role="tablist"][aria-label="Sheet sections"]')).toBeNull()
    act(() => root!.unmount())
    host!.remove()
    el = mount(
      <CollectionCommentsSlot.Provider value={(k) => <p data-comments>{`comments on ${k}`}</p>}>
        <CollectionSheetProvider collections={sheetEntries([graphItem])}>
          <GraphView graph={graph} itemKey="g:1" />
        </CollectionSheetProvider>
      </CollectionCommentsSlot.Provider>,
    )
    click(el.querySelector('[data-gid="c1"] button'))
    const d = sheet()!
    expect(d.querySelector('[data-comments]')).toBeNull()
    click([...d.querySelectorAll('[role="tab"]')].find((b) => b.textContent === 'Comments')!)
    expect(d.querySelector('[data-comments]')?.textContent).toBe('comments on g:1/n:c1')
  })

  it('closes from the backdrop', () => {
    const el = page()
    click(button(el, 'Open collection'))
    click(document.querySelector('[data-sheet-backdrop]'))
    expect(sheet()).toBeNull()
  })
})
