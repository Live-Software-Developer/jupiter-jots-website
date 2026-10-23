import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { markdownPreview, renderMarkdown, shareLinkSlug } from './markdown'

const html = (s: string) => renderToStaticMarkup(<>{renderMarkdown(s)}</>)

describe('renderMarkdown', () => {
  it('renders paragraphs and line breaks', () => {
    expect(html('a\nb\n\nc')).toBe('<p>a<br/>b</p><p>c</p>')
  })
  it('renders bold, italic and code', () => {
    expect(html('**b** *i* `c`')).toBe('<p><strong>b</strong> <em>i</em> <code>c</code></p>')
  })
  it('nests italic inside bold', () => {
    expect(html('**a *b* c**')).toBe('<p><strong>a <em>b</em> c</strong></p>')
  })
  it('renders unordered and ordered lists with inline marks', () => {
    expect(html('- one\n- **two**')).toBe('<ul><li>one</li><li><strong>two</strong></li></ul>')
    expect(html('1. a\n2. b')).toBe('<ol><li>a</li><li>b</li></ol>')
  })
  it('renders blockquotes', () => {
    expect(html('> *hi*\n> there')).toBe('<blockquote><em>hi</em><br/>there</blockquote>')
  })
  it('does not nest lists', () => {
    expect(html('- a\n  - b')).toBe('<ul><li>a</li></ul><p>  - b</p>')
  })
  it('renders unclosed markers literally', () => {
    expect(html('**open')).toBe('<p>**open</p>')
    expect(html('a *b')).toBe('<p>a *b</p>')
    expect(html('`x')).toBe('<p>`x</p>')
  })
  it('escapes raw html', () => {
    const out = html('<script>alert(1)</script>')
    expect(out).toBe('<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>')
  })
  it('renders links and images as literal text', () => {
    const out = html('[x](javascript:alert(1))')
    expect(out).toBe('<p>[x](javascript:alert(1))</p>')
    expect(out).not.toContain('<a')
    expect(html('![img](x)')).toBe('<p>![img](x)</p>')
  })
  it('renders headings and fences literally', () => {
    expect(html('# Title')).toBe('<p># Title</p>')
    expect(html('```\ncode\n```')).toBe('<p>```<br/>code<br/>```</p>')
  })
  it('truncates to 4000 chars with an ellipsis', () => {
    const out = renderToStaticMarkup(<>{renderMarkdown('a'.repeat(5000))}</>)
    expect(out).toBe(`<p>${'a'.repeat(4000)}…</p>`)
  })
  it('returns nothing for empty input', () => {
    expect(html('')).toBe('')
  })
})

describe('markdownPreview', () => {
  it('flattens markdown to one plain line', () => {
    expect(markdownPreview('Read **this**\n\n- `one`\n1. *two*\n> quoted')).toBe('Read this one two quoted')
  })
})

describe('share links in comments', () => {
  const ORIGIN = 'https://jj.example'
  const opts = { shareLinks: { origins: [ORIGIN, 'http://localhost:3000/'], render: (slug: string) => <aside data-card={slug} /> } }
  const md = (s: string) => renderToStaticMarkup(<>{renderMarkdown(s, undefined, opts)}</>)

  it('turns an exact share URL on its own line into a card', () => {
    expect(md(`${ORIGIN}/s/abc123xyz0`)).toBe('<aside data-card="abc123xyz0"></aside>')
    expect(md(`  http://localhost:3000/s/abc123xyz0  `)).toBe('<aside data-card="abc123xyz0"></aside>')
  })
  it('splits the surrounding paragraph around the card', () => {
    expect(md(`Look:\n${ORIGIN}/s/abc123xyz0\n**nice**`)).toBe(
      '<p>Look:</p><aside data-card="abc123xyz0"></aside><p><strong>nice</strong></p>',
    )
  })
  it('keeps inline and other URLs as plain text', () => {
    expect(md(`see ${ORIGIN}/s/abc123xyz0`)).toBe(`<p>see ${ORIGIN}/s/abc123xyz0</p>`)
    expect(md(`${ORIGIN}/s/abc123xyz0 nice`)).toBe(`<p>${ORIGIN}/s/abc123xyz0 nice</p>`)
    expect(md('https://evil.example/s/abc123xyz0')).toBe('<p>https://evil.example/s/abc123xyz0</p>')
    expect(md(`${ORIGIN}/s/ABC123xyz0`)).toBe(`<p>${ORIGIN}/s/ABC123xyz0</p>`)
    expect(md(`${ORIGIN}/s/abc123xyz0/`)).toBe(`<p>${ORIGIN}/s/abc123xyz0/</p>`)
    expect(md(`${ORIGIN}/s/abc123xyz0?x=1`)).toBe(`<p>${ORIGIN}/s/abc123xyz0?x=1</p>`)
    expect(md(`${ORIGIN}/s/abc123xyz01`)).toBe(`<p>${ORIGIN}/s/abc123xyz01</p>`)
    expect(md(`- ${ORIGIN}/s/abc123xyz0`)).toBe(`<ul><li>${ORIGIN}/s/abc123xyz0</li></ul>`)
    expect(md('https://jj.example.evil.dev/s/abc123xyz0')).not.toContain('data-card')
  })
  it('renders no cards without the option', () => {
    expect(html(`${ORIGIN}/s/abc123xyz0`)).toBe(`<p>${ORIGIN}/s/abc123xyz0</p>`)
  })
  it('matches only exact lines', () => {
    expect(shareLinkSlug(`${ORIGIN}/s/abc123xyz0`, [ORIGIN])).toBe('abc123xyz0')
    expect(shareLinkSlug(`${ORIGIN}/s/abc123xyz0`, [])).toBeNull()
    expect(shareLinkSlug('/s/abc123xyz0', [''])).toBeNull()
  })
})
