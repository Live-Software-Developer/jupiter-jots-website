import { Fragment, type ReactNode } from 'react'

import { MarkdownImage } from './markdown-image'

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

/** An address a link may open: http(s) or mailto only, so never `javascript:` or `data:`. */
export function safeLinkUrl(u: string): string | null {
  try {
    const x = new URL(u.trim())
    return x.protocol === 'https:' || x.protocol === 'http:' || x.protocol === 'mailto:' ? x.href : null
  } catch {
    return null
  }
}

/** An address an image or video may load from: https only (no tracking over plain http, no data: or blob:). */
export function safeMediaUrl(u: string): string | null {
  try {
    const x = new URL(u.trim())
    return x.protocol === 'https:' ? x.href : null
  } catch {
    return null
  }
}

const VIDEO_FILE = /\.(mp4|webm|ogv|ogg|mov|m4v)(?:[?#]|$)/i

/** A YouTube or Vimeo watch link: its thumbnail (when known) and the page to open. */
export function videoLink(u: string): { href: string; thumb: string | null; site: string } | null {
  let x: URL
  try {
    x = new URL(u.trim())
  } catch {
    return null
  }
  if (x.protocol !== 'https:') return null
  const host = x.hostname.replace(/^www\.|^m\./, '')
  const yt = host === 'youtu.be' ? x.pathname.slice(1) : host === 'youtube.com' ? (x.searchParams.get('v') ?? x.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]+)/)?.[1]) : null
  if (yt && /^[\w-]{6,20}$/.test(yt))
    return {
      href: x.href,
      thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
      site: 'YouTube',
    }
  if (host === 'vimeo.com' && /^\/\d+/.test(x.pathname)) return { href: x.href, thumb: null, site: 'Vimeo' }
  return null
}

const LINK_CLASS = 'font-medium text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary'

/** An image or a video file from shared markdown, loaded without a referrer. */
function Media({ src, alt }: { src: string; alt: string }) {
  return VIDEO_FILE.test(src) ? (
    <video src={src} controls preload="metadata" playsInline className="my-1 block max-h-96 w-full max-w-full rounded-lg bg-black">
      <a href={src} target="_blank" rel="noopener noreferrer nofollow ugc" className={LINK_CLASS}>
        {alt || src}
      </a>
    </video>
  ) : (
    <MarkdownImage src={src} alt={alt} linkClass={LINK_CLASS} />
  )
}

/** A watch link on its own line: the video's thumbnail with a play mark, opening the video's page. */
function VideoCard({ href, thumb, site }: { href: string; thumb: string | null; site: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow ugc"
      className="group relative block w-full max-w-md overflow-hidden rounded-xl border border-border bg-muted"
      aria-label={`Watch on ${site}`}
    >
      {thumb ? (
        <img src={thumb} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className="aspect-video w-full object-cover" />
      ) : (
        <div className="aspect-video w-full" />
      )}
      <span className="absolute inset-0 grid place-items-center bg-black/20 transition-colors group-hover:bg-black/30">
        <span className="grid size-12 place-items-center rounded-full bg-black/70 text-white shadow-lg">
          <svg viewBox="0 0 24 24" className="ml-0.5 size-5" fill="currentColor" aria-hidden="true">
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
      </span>
      <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-xs font-medium text-white">{site}</span>
    </a>
  )
}

/** `[text](url)` or `![alt](url)` starting at `i` (the `[`): its text, url and end, or null. */
function bracket(s: string, i: number): { text: string; url: string; end: number } | null {
  const close = s.indexOf('](', i + 1)
  if (close < 0) return null
  const end = s.indexOf(')', close + 2)
  if (end < 0) return null
  const url =
    s
      .slice(close + 2, end)
      .trim()
      .split(/\s+/)[0] ?? ''
  return url ? { text: s.slice(i + 1, close), url, end: end + 1 } : null
}

const BARE_URL = /^https?:\/\/[^\s<>]*[^\s<>.,;:!?'")\]]/

function inline(s: string, keyBase: string, rich = false): ReactNode[] {
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
    } else if (rich && ch === '!' && s[i + 1] === '[') {
      const b = bracket(s, i + 1)
      const src = b && safeMediaUrl(b.url)
      if (b && src) {
        flush()
        out.push(<Media key={`${keyBase}m${n++}`} src={src} alt={b.text} />)
        i = b.end
        continue
      }
    } else if (rich && ch === '[') {
      const b = bracket(s, i)
      const href = b && safeLinkUrl(b.url)
      if (b && href) {
        flush()
        out.push(
          <a key={`${keyBase}a${n}`} href={href} target="_blank" rel="noopener noreferrer nofollow ugc" className={LINK_CLASS}>
            {inline(b.text, `${keyBase}a${n}.`, rich)}
          </a>,
        )
        n++
        i = b.end
        continue
      }
    } else if (rich && ch === 'h' && (i === 0 || /[\s(]/.test(s[i - 1]))) {
      const m = s.slice(i).match(BARE_URL)
      const href = m && safeLinkUrl(m[0])
      if (m && href) {
        flush()
        out.push(
          <a key={`${keyBase}u${n++}`} href={href} target="_blank" rel="noopener noreferrer nofollow ugc" className={`${LINK_CLASS} break-all`}>
            {m[0]}
          </a>,
        )
        i += m[0].length
        continue
      }
    } else if (rich && ch === '~' && s[i + 1] === '~') {
      const j = s.indexOf('~~', i + 2)
      if (j > i + 2) {
        flush()
        out.push(
          <del key={`${keyBase}s${n}`} className="text-muted-foreground">
            {inline(s.slice(i + 2, j), `${keyBase}s${n}.`, rich)}
          </del>,
        )
        n++
        i = j + 2
        continue
      }
    } else if (ch === '*' && s[i + 1] === '*') {
      const j = s.indexOf('**', i + 2)
      if (j > i + 2) {
        flush()
        out.push(<strong key={`${keyBase}b${n}`}>{inline(s.slice(i + 2, j), `${keyBase}b${n}.`, rich)}</strong>)
        n++
        i = j + 2
        continue
      }
    } else if (ch === '*') {
      const j = closeItalic(s, i + 1)
      if (j > i + 1) {
        flush()
        out.push(<em key={`${keyBase}i${n}`}>{inline(s.slice(i + 1, j), `${keyBase}i${n}.`, rich)}</em>)
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

function lines(ls: string[], keyBase: string, rich = false): ReactNode[] {
  const out: ReactNode[] = []
  ls.forEach((l, i) => {
    if (i) out.push(<br key={`${keyBase}br${i}`} />)
    out.push(<Fragment key={`${keyBase}l${i}`}>{inline(l, `${keyBase}l${i}.`, rich)}</Fragment>)
  })
  return out
}

const UL = /^- (.*)$/
const OL = /^\d+\. (.*)$/
const BQ = /^> ?(.*)$/
const TASK = /^\[([ xX])\] (.*)$/
const HR = /^ {0,3}([-*_])(?: *\1){2,} *$/
const TABLE_SEP = /^ *\|? *:?-+:? *(?:\| *:?-+:? *)*\|? *$/

/** The cells of a `| a | b |` row (a `\|` stays a literal bar). */
function cells(row: string): string[] {
  const t = row
    .trim()
    .replace(/^\|/, '')
    .replace(/(?<!\\)\|$/, '')
  return t.split(/(?<!\\)\|/).map((c) => c.trim().replace(/\\\|/g, '|'))
}

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
  /**
   * The share author's own writing (intro, notes, descriptions): headings, fences, tables, rules,
   * task lists, ~~strike~~, links, and https images and videos. Off for comments, which stay plain.
   */
  rich?: boolean
}

/** The options for the share author's own writing. */
export const RICH: MarkdownOptions = { rich: true }

/**
 * Renders a restricted markdown subset to React elements; with `rich`, also tables, links, images
 * and video. Never emits raw HTML, and every address is checked (links http/https/mailto, media
 * https only, no referrer). Text past `max` is cut. Kept in step with the extension's copy.
 */
export function renderMarkdown(src: string, max = MAX_LEN, opts: MarkdownOptions = {}): ReactNode {
  const text = src.length > max ? src.slice(0, max) + '…' : src
  const all = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let k = 0
  const links = opts.shareLinks
  const embed = (l: string) => (links ? shareLinkSlug(l, links.origins) : null)
  const rich = !!opts.rich
  const isFence = (l: string) => rich && l.trimStart().startsWith('```')
  const isHeading = (l: string) => rich && /^#{1,6}\s+\S/.test(l)
  const isHr = (l: string) => rich && HR.test(l)
  const isTable = (at: number) => rich && all[at]?.includes('|') && TABLE_SEP.test(all[at + 1] ?? '') && all[at + 1].includes('-')
  const video = (l: string) => (rich ? videoLink(l) : null)
  let i = 0
  while (i < all.length) {
    const line = all[i]
    if (!line.trim()) {
      i++
      continue
    }
    let m: RegExpMatchArray | null
    const slug = embed(line)
    if (isFence(line)) {
      const code: string[] = []
      i++
      while (i < all.length && !isFence(all[i])) code.push(all[i++])
      if (i < all.length) i++
      blocks.push(
        <pre key={k++} className="max-w-full overflow-x-auto rounded-lg bg-muted p-2.5 text-xs leading-relaxed [overflow-wrap:normal]">
          <code>{code.join('\n')}</code>
        </pre>,
      )
    } else if (isHeading(line) && (m = line.match(/^(#{1,6})\s+(.+?)\s*#*$/))) {
      const level = Math.min(m[1].length, 3)
      const content = inline(m[2], `${k}.`, rich)
      const className = level === 1 ? 'text-base font-semibold' : level === 2 ? 'text-sm font-semibold' : 'text-xs font-semibold uppercase tracking-wide text-muted-foreground'
      blocks.push(
        level === 1 ? (
          <h3 key={k++} className={className}>
            {content}
          </h3>
        ) : level === 2 ? (
          <h4 key={k++} className={className}>
            {content}
          </h4>
        ) : (
          <h5 key={k++} className={className}>
            {content}
          </h5>
        ),
      )
      i++
    } else if (links && slug) {
      blocks.push(<Fragment key={k++}>{links.render(slug)}</Fragment>)
      i++
    } else if (isHr(line)) {
      blocks.push(<hr key={k++} className="my-3 border-border" />)
      i++
    } else if (video(line)) {
      blocks.push(<VideoCard key={k++} {...video(line)!} />)
      i++
    } else if (isTable(i)) {
      const head = cells(line)
      const align = cells(all[i + 1]).map((c) => (c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : 'left') as 'left' | 'center' | 'right')
      i += 2
      const rows: string[][] = []
      while (i < all.length && all[i].trim() && all[i].includes('|')) rows.push(cells(all[i++]))
      const key = k++
      blocks.push(
        <div key={key} className="max-w-full overflow-x-auto rounded-lg border border-border [overflow-wrap:normal]">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-muted/60">
              <tr>
                {head.map((c, j) => (
                  <th key={j} style={{ textAlign: align[j] ?? 'left' }} className="border-b border-border px-3 py-1.5 font-semibold whitespace-nowrap">
                    {inline(c, `${key}.h${j}.`, rich)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-b border-border last:border-0 even:bg-muted/25">
                  {head.map((_, j) => (
                    <td key={j} style={{ textAlign: align[j] ?? 'left' }} className="px-3 py-1.5 align-top">
                      {inline(r[j] ?? '', `${key}.${ri}.${j}.`, rich)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
    } else if ((m = line.match(UL)) || (m = line.match(OL))) {
      const re = UL.test(line) ? UL : OL
      const items: string[] = []
      while (i < all.length && (m = all[i].match(re))) {
        items.push(m[1])
        i++
      }
      const lis = items.map((it, j) => {
        const t = rich && re === UL ? it.match(TASK) : null
        return t ? (
          <li key={j} className="-ml-5 flex list-none items-start gap-2">
            <input type="checkbox" checked={t[1] !== ' '} readOnly disabled className="mt-1 size-3.5 shrink-0 accent-primary" aria-label={t[1] !== ' ' ? 'Done' : 'Not done'} />
            <span className={t[1] !== ' ' ? 'text-muted-foreground line-through' : undefined}>{inline(t[2], `${k}.${j}.`, rich)}</span>
          </li>
        ) : (
          <li key={j}>{inline(it, `${k}.${j}.`, rich)}</li>
        )
      })
      blocks.push(re === UL ? <ul key={k++}>{lis}</ul> : <ol key={k++}>{lis}</ol>)
    } else if (BQ.test(line)) {
      const qs: string[] = []
      while (i < all.length && (m = all[i].match(BQ))) {
        qs.push(m[1])
        i++
      }
      blocks.push(<blockquote key={k}>{lines(qs, `${k}.`, rich)}</blockquote>)
      k++
    } else {
      const ps: string[] = []
      while (i < all.length && all[i].trim() && !UL.test(all[i]) && !OL.test(all[i]) && !BQ.test(all[i]) && !embed(all[i]) && !isFence(all[i]) && !isHeading(all[i]) && !isHr(all[i]) && !video(all[i]) && !isTable(i)) {
        ps.push(all[i])
        i++
      }
      blocks.push(<p key={k}>{lines(ps, `${k}.`, rich)}</p>)
      k++
    }
  }
  return <>{blocks}</>
}

/** Markdown as one line of plain text, for compact previews (list, quote and emphasis marks removed). */
export function markdownPreview(src: string): string {
  return src
    .split(/\r\n?|\n/)
    .filter((l) => !/^ *\|? *:?-+:? *(?:\| *:?-+:? *)*\|? *$/.test(l) && !/^ {0,3}([-*_])(?: *\1){2,} *$/.test(l))
    .map((l) => l.replace(/^(?:#{1,6}\s+|- \[[ xX]\] |- |\d+\. |> ?)/, ''))
    .join(' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/\*\*|[*`]|~~/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}
