import { Fragment, type ReactNode } from 'react'

const MAX_LEN = 4000

/** Finds the closing single `*` for an italic span, skipping over `**` pairs. */
function closeItalic(s: string, from: number): number {
  for (let j = from; j < s.length; j++) {
    if (s[j] !== '*') continue
    if (s[j + 1] === '*') {
      j++
      continue
    }
    return j
  }
  return -1
}

function inline(s: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  let buf = ''
  let n = 0
  const flush = () => {
    if (buf) out.push(buf)
    buf = ''
  }
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (ch === '`') {
      const j = s.indexOf('`', i + 1)
      if (j > i + 1) {
        flush()
        out.push(<code key={`${keyBase}c${n++}`}>{s.slice(i + 1, j)}</code>)
        i = j + 1
        continue
      }
    } else if (ch === '*' && s[i + 1] === '*') {
      const j = s.indexOf('**', i + 2)
      if (j > i + 2) {
        flush()
        out.push(<strong key={`${keyBase}b${n}`}>{inline(s.slice(i + 2, j), `${keyBase}b${n}.`)}</strong>)
        n++
        i = j + 2
        continue
      }
    } else if (ch === '*') {
      const j = closeItalic(s, i + 1)
      if (j > i + 1) {
        flush()
        out.push(<em key={`${keyBase}i${n}`}>{inline(s.slice(i + 1, j), `${keyBase}i${n}.`)}</em>)
        n++
        i = j + 1
        continue
      }
    }
    buf += ch
    i++
  }
  flush()
  return out
}

function lines(ls: string[], keyBase: string): ReactNode[] {
  const out: ReactNode[] = []
  ls.forEach((l, i) => {
    if (i) out.push(<br key={`${keyBase}br${i}`} />)
    out.push(<Fragment key={`${keyBase}l${i}`}>{inline(l, `${keyBase}l${i}.`)}</Fragment>)
  })
  return out
}

const UL = /^- (.*)$/
const OL = /^\d+\. (.*)$/
const BQ = /^> ?(.*)$/

/**
 * Classes for a container of rendered markdown; the container sets the type size, colour and block spacing.
 * Written out in full so Tailwind sees every class.
 */
export const MARKDOWN_CLASS =
  '[&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:font-mono [&_code]:text-[0.9em] [&_ol]:list-decimal [&_ol]:pl-6 [&_strong]:font-medium [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-6'

const SLUG = /^[a-z0-9]{10}$/

/**
 * The slug of a line that is exactly a share link to one of `origins` (`<origin>/s/<slug>`,
 * slug `[a-z0-9]{10}`; surrounding whitespace allowed, nothing else), or null.
 */
export function shareLinkSlug(line: string, origins: readonly string[]): string | null {
  const t = line.trim()
  for (const o of origins) {
    const origin = o.replace(/\/+$/, '')
    const prefix = `${origin}/s/`
    if (origin && t.startsWith(prefix) && SLUG.test(t.slice(prefix.length))) return t.slice(prefix.length)
  }
  return null
}

export interface MarkdownOptions {
  /**
   * Comments only: a top-level line that is exactly a share link to one of `origins` renders as
   * `render(slug)`. Every other URL stays plain text.
   */
  shareLinks?: { origins: readonly string[]; render: (slug: string) => ReactNode }
}

/** Renders a restricted markdown subset to React elements. Never emits raw HTML. Text past `max` is cut. */
export function renderMarkdown(src: string, max = MAX_LEN, opts: MarkdownOptions = {}): ReactNode {
  const text = src.length > max ? src.slice(0, max) + '…' : src
  const all = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let k = 0
  const links = opts.shareLinks
  const embed = (l: string) => (links ? shareLinkSlug(l, links.origins) : null)
  let i = 0
  while (i < all.length) {
    const line = all[i]
    if (!line.trim()) {
      i++
      continue
    }
    let m: RegExpMatchArray | null
    const slug = embed(line)
    if (links && slug) {
      blocks.push(<Fragment key={k++}>{links.render(slug)}</Fragment>)
      i++
    } else if ((m = line.match(UL)) || (m = line.match(OL))) {
      const re = UL.test(line) ? UL : OL
      const items: string[] = []
      while (i < all.length && (m = all[i].match(re))) {
        items.push(m[1])
        i++
      }
      const lis = items.map((it, j) => <li key={j}>{inline(it, `${k}.${j}.`)}</li>)
      blocks.push(re === UL ? <ul key={k++}>{lis}</ul> : <ol key={k++}>{lis}</ol>)
    } else if (BQ.test(line)) {
      const qs: string[] = []
      while (i < all.length && (m = all[i].match(BQ))) {
        qs.push(m[1])
        i++
      }
      blocks.push(<blockquote key={k}>{lines(qs, `${k}.`)}</blockquote>)
      k++
    } else {
      const ps: string[] = []
      while (i < all.length && all[i].trim() && !UL.test(all[i]) && !OL.test(all[i]) && !BQ.test(all[i]) && !embed(all[i])) {
        ps.push(all[i])
        i++
      }
      blocks.push(<p key={k}>{lines(ps, `${k}.`)}</p>)
      k++
    }
  }
  return <>{blocks}</>
}

/** Markdown as one line of plain text, for compact previews (list, quote and emphasis marks removed). */
export function markdownPreview(src: string): string {
  return src
    .split(/\r\n?|\n/)
    .map((l) => l.replace(/^(?:- |\d+\. |> ?)/, ''))
    .join(' ')
    .replace(/\*\*|[*`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
