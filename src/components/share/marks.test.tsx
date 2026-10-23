import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { PBookmark, PIcon } from '@/lib/share/types'
import { BookmarkRow } from './BookmarkRow'
import { CollectionMark } from './CollectionSheet'
import { SafeImg } from './SafeImg'
import { ShareBand } from './ShareBand'

const bm = (extra: Partial<PBookmark> = {}): PBookmark => ({
  key: 'b:1',
  url: 'https://example.com/a',
  title: 'A',
  domain: 'example.com',
  note: '',
  tags: [],
  read: false,
  ...extra,
})

function html(node: React.ReactNode) {
  const el = document.createElement('div')
  el.innerHTML = renderToStaticMarkup(node)
  return el
}

const mark = (icon?: PIcon) => html(<CollectionMark icon={icon} hue={2} px={44} className="size-11" glyph="size-5" emoji="text-2xl" />)

describe('SafeImg', () => {
  it('loads https images without a referrer, lazily and at a fixed size', () => {
    const img = html(<SafeImg src="https://example.com/i.png" width={36} height={36} fallback={<b>F</b>} />).querySelector('img')!
    expect(img.getAttribute('src')).toBe('https://example.com/i.png')
    expect(img.getAttribute('referrerpolicy')).toBe('no-referrer')
    expect(img.getAttribute('loading')).toBe('lazy')
    expect(img.getAttribute('decoding')).toBe('async')
    expect(img.getAttribute('width')).toBe('36')
    expect(img.getAttribute('alt')).toBe('')
  })

  it.each(['http://example.com/i.png', 'data:image/png;base64,AA', 'javascript:alert(1)', undefined])('shows the fallback for %s', (src) => {
    const el = html(<SafeImg src={src} width={36} height={36} fallback={<b>F</b>} />)
    expect(el.querySelector('img')).toBeNull()
    expect(el.textContent).toBe('F')
  })

  it('swaps to the fallback when the image fails to load', async () => {
    const host = document.createElement('div')
    const root = createRoot(host)
    await act(async () => root.render(<SafeImg src="https://example.com/broken.png" width={36} height={36} fallback={<b>F</b>} />))
    await act(async () => host.querySelector('img')!.dispatchEvent(new Event('error')))
    expect(host.querySelector('img')).toBeNull()
    expect(host.textContent).toBe('F')
    root.unmount()
  })
})

describe('bookmark favicons', () => {
  it('shows the favicon in a row', () => {
    const el = html(<BookmarkRow bookmark={bm({ favicon: 'https://example.com/favicon.ico' })} />)
    expect(el.querySelector('img')?.getAttribute('src')).toBe('https://example.com/favicon.ico')
  })

  it('keeps the hued initial without a favicon', () => {
    const el = html(<BookmarkRow bookmark={bm()} />)
    expect(el.querySelector('img')).toBeNull()
    expect(el.textContent).toContain('E')
  })

  it('puts the preview image on a lone bookmark card, falling back to the favicon tile', () => {
    const card = (b: PBookmark) => html(<ShareBand item={{ key: 'b:1', kind: 'bookmark', bookmark: b }} index={0} total={1} />)
    const withImage = card(bm({ image: 'https://cdn.example.com/og.png', favicon: 'https://example.com/favicon.ico' }))
    expect([...withImage.querySelectorAll('img')].map((i) => i.getAttribute('src'))).toEqual(['https://cdn.example.com/og.png'])
    const noImage = card(bm({ favicon: 'https://example.com/favicon.ico' }))
    expect(noImage.querySelector('img')?.getAttribute('src')).toBe('https://example.com/favicon.ico')
  })
})

describe('CollectionMark', () => {
  it('draws a known glyph, an emoji or a logo', () => {
    expect(mark({ type: 'glyph', value: 'inbox' }).querySelector('path')?.getAttribute('d')).toBe('M3 5h18v14H3z')
    expect(mark({ type: 'emoji', value: '📚' }).textContent).toBe('📚')
    expect(mark({ type: 'image', url: 'https://example.com/logo.png' }).querySelector('img')?.getAttribute('src')).toBe('https://example.com/logo.png')
  })

  it('falls back to the folder glyph on the hue', () => {
    const folder = mark().innerHTML
    expect(folder).toContain('M3 6.5h6l2 2h10V20H3z')
    expect(folder).toContain('text-chart-2')
    expect(mark({ type: 'image', url: 'http://example.com/logo.png' }).innerHTML).toBe(folder)
  })

  it('shows on a collection band with its note', () => {
    const el = html(
      <ShareBand
        item={{ key: 'c:1', kind: 'collection', collection: { name: 'Reading', note: 'Start here.', hue: 3, icon: { type: 'emoji', value: '🌱' }, bookmarks: [] } }}
        index={0}
        total={1}
      />,
    )
    expect(el.querySelector('h2')?.parentElement?.textContent).toContain('🌱')
    expect(el.textContent).toContain('Start here.')
  })
})
