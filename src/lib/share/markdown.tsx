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

/** Renders a restricted markdown subset to React elements. Never emits raw HTML. */
export function renderMarkdown(src: string): ReactNode {
  const text = src.length > MAX_LEN ? src.slice(0, MAX_LEN) + '…' : src
  const all = text.replace(/\r\n?/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let k = 0
  let i = 0
  while (i < all.length) {
    const line = all[i]
    if (!line.trim()) {
      i++
      continue
    }
    let m: RegExpMatchArray | null
    if ((m = line.match(UL)) || (m = line.match(OL))) {
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
      while (i < all.length && all[i].trim() && !UL.test(all[i]) && !OL.test(all[i]) && !BQ.test(all[i])) {
        ps.push(all[i])
        i++
      }
      blocks.push(<p key={k}>{lines(ps, `${k}.`)}</p>)
      k++
    }
  }
  return <>{blocks}</>
}
