import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import type { PBookmark, PayloadItem } from '@/lib/share/types'
import { bandTitle, ShareBand, toBands } from './ShareBand'

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

  describe('bookmark cards open a sheet instead of navigating', () => {
    const BAD = ['javascript:alert(1)', 'JavaScript:alert(1)', 'data:text/html,<b>x</b>', '  javascript:alert(1)']
    const anchors = (el: HTMLElement) => [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    const graphOf = (url: string): PayloadItem => ({
      key: 'g:1',
      kind: 'graph',
      graph: {
        ...(graph as Extract<PayloadItem, { kind: 'graph' }>).graph,
        nodes: [
          { id: 'n1', stepId: 's1', x: 40, y: 64, ref: { kind: 'bookmark', bookmark: bm(1, { url }) } },
          { id: 'n2', stepId: 's1', x: 40, y: 240, ref: { kind: 'bookmark', bookmark: bm(2) } },
        ],
      },
    })

    it.each(BAD)('%j in a bookmarks band: no direct link, the row opens a sheet', (url) => {
      const el = render([
        { key: 'b:8', kind: 'bookmark', bookmark: bm(8, { url }) },
        { key: 'b:9', kind: 'bookmark', bookmark: bm(9) },
      ])
      expect(anchors(el)).toEqual([])
      expect(el.querySelector('[data-bookmark-row] button[aria-haspopup="dialog"]')).not.toBeNull()
      expect(el.textContent).toContain('Bookmark 8')
    })

    it.each(BAD)('%j as a lone bookmark card: no direct link', (url) => {
      const el = render([{ key: 'b:8', kind: 'bookmark', bookmark: bm(8, { url }) }])
      expect(anchors(el)).toEqual([])
      expect(el.querySelector('[aria-haspopup="dialog"]')).not.toBeNull()
      expect(el.querySelector('h3')?.textContent).toBe('Bookmark 8')
    })

    it.each(BAD)('%j as a graph node: no direct link', (url) => {
      expect(anchors(render([graphOf(url)]))).toEqual([])
    })

    it('safe URLs open only from the sheet, never from the card itself', () => {
      for (const el of [
        render([collection(1)]),
        render([{ key: 'b:7', kind: 'bookmark', bookmark: bm(7) }]),
        render([graphOf('http://example.com/1')]),
      ]) {
        expect(anchors(el)).toEqual([])
        expect(el.querySelector('button[aria-haspopup="dialog"]')).not.toBeNull()
      }
    })
  })
})

describe('ShareBand notes', () => {
  const note = { key: 'n:5', title: 'Reading plan', body: 'Start with **these**:\n\n- one\n- two\n\n<script>x</script> [link](https://evil.test)', tags: ['plan'] }

  it('renders a note band with its title, tags and markdown body', () => {
    const el = render([{ key: 'n:5', kind: 'note', note }])
    const section = el.querySelector('section')!
    expect(section.id).toBe('item-n-5')
    expect(section.querySelector('h2')?.textContent).toBe('Reading plan')
    expect(section.textContent).toContain('Note')
    expect(section.querySelector('strong')?.textContent).toBe('these')
    expect([...section.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['one', 'two'])
    expect(section.textContent).toContain('#plan')
    expect(section.querySelector('script, a[href*="evil"]')).toBeNull()
  })

  it('lists what a note links to: bookmark rows and collection name chips', () => {
    const links = [{ kind: 'bookmark' as const, bookmark: bm(9) }, { kind: 'collection' as const, key: 'n:5/c:2', name: 'Reading', hue: 2 as const }]
    const section = render([{ key: 'n:5', kind: 'note', note: { ...note, links } }]).querySelector('section[aria-label="Linked"]')!
    expect(section.querySelectorAll('[data-bookmark-row]')).toHaveLength(1)
    expect(section.textContent).toContain('Reading')
  })

  it("lists a collection's notes before its bookmarks and counts both", () => {
    const el = render([
      {
        key: 'c:2',
        kind: 'collection',
        collection: { name: 'Mixed', note: 'Read *slowly*', hue: 1, bookmarks: [bm(1)], notes: [{ ...note, key: 'c:2/n:5' }] },
      },
    ])
    const section = el.querySelector('section')!
    const rows = section.querySelectorAll('[data-note-row], [data-bookmark-row]')
    expect([...rows].map((r) => r.hasAttribute('data-note-row'))).toEqual([true, false])
    expect(section.textContent).toContain('1 note · 1 bookmark')
    expect(section.querySelector('em')?.textContent).toBe('slowly')
  })

  it('renders bookmark notes as markdown', () => {
    const el = render([{ key: 'b:7', kind: 'bookmark', bookmark: bm(7, { note: 'A **good** one' }) }])
    expect(el.querySelector('blockquote strong')?.textContent).toBe('good')
  })
})

describe('bandTitle', () => {
  it('labels unnamed items like the composer does', () => {
    const items: PayloadItem[] = [
      { ...graph, graph: { ...(graph as Extract<PayloadItem, { kind: 'graph' }>).graph, name: '' } },
      { key: 'c:9', kind: 'collection', collection: { name: '', note: '', hue: 1, bookmarks: [] } },
      { key: 'b:7', kind: 'bookmark', bookmark: bm(7, { title: '', domain: '' }) },
      { key: 'n:8', kind: 'note', note: { key: 'n:8', title: '', body: '', tags: [] } },
    ]
    expect(toBands(items).map(bandTitle)).toEqual(['Untitled graph', 'Untitled collection', 'Untitled bookmark', 'Untitled note'])
  })
})
