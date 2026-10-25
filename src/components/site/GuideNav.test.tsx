import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GuidePager, GuideTabs } from './GuideNav'
import { FOOTER_COLUMNS, GUIDE_STEPS, NAV } from './nav'

const parse = (html: string) => {
  const host = document.createElement('div')
  host.innerHTML = html
  return host
}
const hrefs = (el: Element) => [...el.querySelectorAll('a')].map((a) => a.getAttribute('href'))

describe('site navigation', () => {
  it('sends every Features link to /features', () => {
    expect(NAV.find((n) => n.label === 'Features')).toMatchObject({ href: '/features', match: '/features' })
    const footer: (readonly [string, string])[] = FOOTER_COLUMNS.flatMap((c): (readonly [string, string])[] => [...c.links])
    expect(footer).toContainEqual(['Features', '/features'])
    expect([...NAV.map((n) => n.href), ...footer.map(([, h]) => h)]).not.toContain('/#features')
  })

  it('reads the guide in order: basics, Ask Jupiter, agents', () => {
    expect(GUIDE_STEPS.map((s) => s.href)).toEqual(['/guide', '/guide/ask-jupiter', '/guide/agents'])
  })
})

describe('GuideTabs', () => {
  it.each(GUIDE_STEPS.map((s) => s.href))('lists every guide page and marks %s as current', (current) => {
    const nav = parse(renderToStaticMarkup(<GuideTabs current={current} />))
    expect(hrefs(nav)).toEqual(['/guide', '/guide/ask-jupiter', '/guide/agents', '/features'])
    const on = nav.querySelectorAll('[aria-current="page"]')
    expect(on).toHaveLength(1)
    expect(on[0].getAttribute('href')).toBe(current)
  })
})

describe('GuidePager', () => {
  const pager = (current: (typeof GUIDE_STEPS)[number]['href']) => parse(renderToStaticMarkup(<GuidePager current={current} />))

  it('the main guide points on to Ask Jupiter, and to every feature', () => {
    const p = pager('/guide')
    expect(p.querySelector('a[rel="next"]')?.getAttribute('href')).toBe('/guide/ask-jupiter')
    expect(p.querySelector('a[rel="prev"]')).toBeNull()
    expect(hrefs(p)).toContain('/features')
  })

  it('Ask Jupiter sits between the basics and the agents guide', () => {
    const p = pager('/guide/ask-jupiter')
    expect(p.querySelector('a[rel="prev"]')?.getAttribute('href')).toBe('/guide')
    expect(p.querySelector('a[rel="next"]')?.getAttribute('href')).toBe('/guide/agents')
  })

  it('the agents guide points back to Ask Jupiter, and to every feature', () => {
    const p = pager('/guide/agents')
    expect(p.querySelector('a[rel="prev"]')?.getAttribute('href')).toBe('/guide/ask-jupiter')
    expect(p.querySelector('a[rel="next"]')).toBeNull()
    expect(hrefs(p)).toContain('/features')
  })
})
