import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { COMING_SOON, FEATURE_SECTIONS } from '@/components/site/features/sections'
import FeaturesPage, { metadata } from './page'

const page = () => {
  const host = document.createElement('div')
  host.innerHTML = renderToStaticMarkup(<FeaturesPage />)
  return host
}

describe('/features', () => {
  it('has one h1 and a labelled section for every feature area', () => {
    const p = page()
    expect(p.querySelectorAll('h1')).toHaveLength(1)
    for (const s of FEATURE_SECTIONS) {
      const section = p.querySelector(`section#${s.id}`)
      expect(section, s.id).not.toBeNull()
      expect(section!.querySelector(`#${s.id}-h`)?.textContent).toBe(s.title)
      expect(s.points.length, s.id).toBeGreaterThanOrEqual(3)
      expect(s.points.length, s.id).toBeLessThanOrEqual(6)
    }
    expect(p.querySelector('section#soon')?.textContent).toContain(COMING_SOON[0].term)
  })

  it('jumps to every section from the sticky section nav', () => {
    const nav = page().querySelector('nav[aria-label="Features on this page"]')!
    const targets = [...nav.querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(targets).toEqual([...FEATURE_SECTIONS.map((s) => `#${s.id}`), '#soon'])
  })

  it('links to the guides', () => {
    const hrefs = [...page().querySelectorAll('a')].map((a) => a.getAttribute('href'))
    expect(hrefs).toEqual(expect.arrayContaining(['/guide', '/guide/ask-jupiter', '/guide/agents']))
  })

  it('every hero moon jumps to a section on the page', () => {
    const p = page()
    const moons = [...p.querySelectorAll('nav[aria-label="Jump to a part of Jupiter Jots"] a')]
    expect(moons.length).toBeGreaterThan(0)
    for (const a of moons) expect(p.querySelector(a.getAttribute('href')!), a.textContent!).not.toBeNull()
  })

  it('carries its own canonical and Open Graph image', () => {
    expect(metadata.alternates?.canonical).toBe('/features')
    expect(JSON.stringify(metadata.openGraph)).toContain('/og/features.png')
  })
})
