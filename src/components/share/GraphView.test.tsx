import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { PBookmark, PGraph, PayloadItem } from '@/lib/share/types'
import { CollectionCommentsSlot, CollectionSheetContext, CollectionSheetProvider, OpenCollectionButton } from './CollectionSheet'
import { GraphView } from './GraphView'

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
})

const click = (el: Element | null) => act(() => (el as HTMLElement).click())
const key = (k: string, target: EventTarget = document.activeElement ?? document.body) =>
  act(() => {
    target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }))
  })
const button = (el: ParentNode, name: string | RegExp) =>
  [...el.querySelectorAll('button')].find((b) => (typeof name === 'string' ? b.textContent?.trim() === name : name.test(b.textContent ?? '')))!

describe('GraphView', () => {
  it('starts in the graph mode and shows the board columns', () => {
    const el = mount(<GraphView graph={graph} itemKey="g:1" />)
    expect(button(el, 'Board').getAttribute('aria-pressed')).toBe('true')
    expect(button(el, 'Canvas').getAttribute('aria-pressed')).toBe('false')
    const cols = [...el.querySelectorAll('[role="group"][aria-label]:not([aria-label="View"])')].map((s) => s.getAttribute('aria-label'))
    expect(cols).toEqual(['Basics', 'Deeper'])
  })

  it('toggling to Canvas renders absolutely positioned nodes at x/y', () => {
    const el = mount(<GraphView graph={graph} itemKey="g:1" />)
    click(button(el, 'Canvas'))
    expect(button(el, 'Canvas').getAttribute('aria-pressed')).toBe('true')
    for (const n of graph.nodes) {
      const box = el.querySelector<HTMLElement>(`[data-node="${n.id}"]`)!
      expect(box.classList.contains('absolute')).toBe(true)
      expect(box.style.left).toBe(`${n.x}px`)
      expect(box.style.top).toBe(`${n.y}px`)
      expect(box.style.width).toBe('240px')
    }
  })

  it('starts on Canvas when the graph says so, and zooms there', () => {
    const el = mount(<GraphView graph={{ ...graph, mode: 'canvas' }} itemKey="g:1" />)
    expect(el.querySelector('[data-node="b1"]')).not.toBeNull()
    expect(el.textContent).toContain('100%')
    click(el.querySelector('[aria-label="Zoom in"]'))
    expect(el.textContent).toContain('110%')
    expect(el.querySelector<HTMLElement>('[data-surface]')!.style.transform).toBe('scale(1.1)')
  })

  it('clicking a collection node calls open with its nested key', () => {
    const open = vi.fn()
    const el = mount(
      <CollectionSheetContext.Provider value={{ open }}>
        <GraphView graph={graph} itemKey="g:1" />
      </CollectionSheetContext.Provider>,
    )
    click(el.querySelector('[data-gid="c1"] button'))
    expect(open).toHaveBeenCalledWith('g:1/n:c1')
    click(button(el, 'Canvas'))
    click(el.querySelector('[data-gid="c1"] button'))
    expect(open).toHaveBeenLastCalledWith('g:1/n:c1')
  })

  it('opens bookmark nodes in a new tab, and only for http(s) URLs', () => {
    const el = mount(<GraphView graph={graph} itemKey="g:1" />)
    const links = [...el.querySelectorAll('a')]
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['https://example.com/1'])
    expect(links[0].getAttribute('target')).toBe('_blank')
    expect(links[0].getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('enters full screen and leaves it on Esc', () => {
    const el = mount(<GraphView graph={graph} itemKey="g:1" />)
    click(el.querySelector('[aria-label="Full screen"]'))
    expect(el.querySelector('[data-graph-shell]')!.className).toContain('fixed')
    key('Escape', document.body)
    expect(el.querySelector('[data-graph-shell]')!.className).not.toContain('fixed')
    expect(el.querySelector('[aria-label="Full screen"]')).not.toBeNull()
  })
})

describe('CollectionSheet', () => {
  function page() {
    return mount(
      <CollectionSheetProvider items={[collectionItem, graphItem]} curator="Ada Okafor">
        <OpenCollectionButton itemKey="c:3" className="">
          Open collection
        </OpenCollectionButton>
        <GraphView graph={graph} itemKey="g:1" />
      </CollectionSheetProvider>,
    )
  }
  const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]')

  it('opens a collection item as a labelled modal dialog with its rows', () => {
    const el = page()
    expect(dialog()).toBeNull()
    click(button(el, 'Open collection'))
    const d = dialog()!
    expect(d.getAttribute('aria-modal')).toBe('true')
    expect(document.getElementById(d.getAttribute('aria-labelledby')!)?.textContent).toBe('Weekend reading')
    expect(d.textContent).toContain('2 bookmarks · from Ada Okafor')
    expect(d.querySelectorAll('[data-bookmark-row]')).toHaveLength(2)
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close')
  })

  it('opens a graph collection node with the graph as context', () => {
    const el = page()
    click(el.querySelector('[data-gid="c1"] button'))
    const d = dialog()!
    expect(d.querySelector('h2')?.textContent).toBe('Ownership, explained five ways')
    expect(d.textContent).toContain('in Rust, from zero to shipping')
  })

  it('Esc closes the sheet and returns focus to the trigger; the graph stays in full screen', () => {
    const el = page()
    click(el.querySelector('[aria-label="Full screen"]'))
    const trigger = el.querySelector<HTMLElement>('[data-gid="c1"] button')!
    act(() => trigger.focus())
    click(trigger)
    expect(dialog()).not.toBeNull()
    key('Escape')
    expect(dialog()).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(el.querySelector('[data-graph-shell]')!.className).toContain('fixed')
  })

  it('keeps Tab focus inside the sheet', () => {
    const el = page()
    click(button(el, 'Open collection'))
    const d = dialog()!
    const focusables = [...d.querySelectorAll<HTMLElement>('a[href], button, input')]
    act(() => focusables[focusables.length - 1].focus())
    key('Tab')
    expect(document.activeElement).toBe(focusables[0])
    act(() => {
      document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))
    })
    expect(document.activeElement).toBe(focusables[focusables.length - 1])
  })

  it('filters rows by title, domain, note or tag', () => {
    const el = page()
    click(button(el, 'Open collection'))
    const input = dialog()!.querySelector<HTMLInputElement>('input[type="search"]')!
    const set = (v: string) =>
      act(() => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, v)
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })
    set('CSS')
    expect(dialog()!.querySelectorAll('[data-bookmark-row]')).toHaveLength(1)
    set('nothing like this')
    expect(dialog()!.querySelectorAll('[data-bookmark-row]')).toHaveLength(0)
    expect(dialog()!.textContent).toContain('No bookmarks match')
  })

  it('renders the comments slot with the sheet key, and nothing without one', () => {
    let el = page()
    click(el.querySelector('[data-gid="c1"] button'))
    expect(dialog()!.querySelector('[data-comments]')).toBeNull()
    act(() => root!.unmount())
    host!.remove()
    el = mount(
      <CollectionCommentsSlot.Provider value={(k) => <p data-comments>{`comments on ${k}`}</p>}>
        <CollectionSheetProvider items={[graphItem]}>
          <GraphView graph={graph} itemKey="g:1" />
        </CollectionSheetProvider>
      </CollectionCommentsSlot.Provider>,
    )
    click(el.querySelector('[data-gid="c1"] button'))
    expect(dialog()!.querySelector('[data-comments]')?.textContent).toBe('comments on g:1/n:c1')
  })

  it('closes from the backdrop', () => {
    const el = page()
    click(button(el, 'Open collection'))
    click(document.querySelector('[data-sheet-backdrop]'))
    expect(dialog()).toBeNull()
  })
})
