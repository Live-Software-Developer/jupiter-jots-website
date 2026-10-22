import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PBookmark, PayloadItem } from '@/lib/share/types'
import { ShareBand, toBands } from './ShareBand'

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

const graph: PayloadItem = {
  key: 'g:1',
  kind: 'graph',
  graph: {
    name: 'How LLMs work, in order',
    description: '',
    mode: 'board',
    steps: [{ id: 's1', label: 'Start' }],
    nodes: [{ id: 'n1', stepId: 's1', x: 40, y: 64, ref: { kind: 'bookmark', bookmark: bm(1) } }],
    links: [],
  },
}
const collection = (n: number): PayloadItem => ({
  key: 'c:2',
  kind: 'collection',
  collection: { name: 'Weekend reading', note: '', hue: 5, bookmarks: Array.from({ length: n }, (_, i) => bm(10 + i)) },
})

function render(items: PayloadItem[]) {
  const bands = toBands(items)
  const el = document.createElement('div')
  el.innerHTML = renderToStaticMarkup(
    <>
      {bands.map((band, i) => (
        <ShareBand key={band.key} item={band} index={i} total={bands.length} />
      ))}
    </>,
  )
  return el
}

describe('ShareBand', () => {
  it('renders graph, collection and grouped bookmarks as three bands in order', () => {
    const el = render([
      graph,
      collection(2),
      { key: 'b:3', kind: 'bookmark', bookmark: bm(3) },
      { key: 'b:4', kind: 'bookmark', bookmark: bm(4) },
    ])
    const sections = el.querySelectorAll('section')
    expect(sections).toHaveLength(3)
    const headings = [...sections].map((s) => s.querySelector('h2')?.textContent)
    expect(headings).toEqual(['How LLMs work, in order', 'Weekend reading', 'Shared bookmarks'])
    expect(sections[0].querySelector('p')?.textContent).toContain('01')
    expect(sections[2].textContent).toContain('Bookmark 3')
    expect(sections[2].textContent).toContain('Bookmark 4')
  })

  it('shows four rows of a six-bookmark collection and a "See all 6" button', () => {
    const el = render([collection(6)])
    const section = el.querySelector('section')!
    expect(section.querySelectorAll('[data-bookmark-row]')).toHaveLength(4)
    const buttons = [...section.querySelectorAll('button')].map((b) => b.textContent)
    expect(buttons).toContain('See all 6 in the collection')
  })

  it('renders a lone bookmark as its own card band without an index', () => {
    const el = render([{ key: 'b:7', kind: 'bookmark', bookmark: bm(7, { domain: 'grugbrain.dev' }) }])
    const section = el.querySelector('section')!
    expect(section.querySelector('h2')?.textContent).toBe('grugbrain.dev')
    expect(section.querySelector('h3')?.textContent).toBe('Bookmark 7')
    expect(section.textContent).not.toContain('01')
  })

  it('never links a bookmark to a non-http URL', () => {
    const el = render([collection(1)])
    const evil = render([
      { key: 'b:8', kind: 'bookmark', bookmark: bm(8, { url: 'javascript:alert(1)' }) },
      { key: 'b:9', kind: 'bookmark', bookmark: bm(9) },
    ])
    expect(el.querySelector('a[href="https://example.com/10"]')).not.toBeNull()
    expect(evil.querySelector('a[href^="javascript"]')).toBeNull()
  })
})
