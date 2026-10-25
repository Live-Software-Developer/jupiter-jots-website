import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({ cacheLife: () => {} }))
vi.mock('@/lib/share/api', () => ({ getExplore: async () => ({ status: 'error' }) }))

const SRC = join(__dirname, '..')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')
const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f)
    return statSync(p).isDirectory() ? files(p) : /\.(tsx?|mdx)$/.test(f) && !/\.test\./.test(f) ? [p] : []
  })

describe('links between pages', () => {
  it('nothing links to the old /#features anchor any more', () => {
    const offenders = files(SRC).filter((f) => readFileSync(f, 'utf8').includes('/#features'))
    expect(offenders).toEqual([])
  })

  it('the landing page keeps its #features section and points to /features', () => {
    const home = read('app/(site)/page.tsx')
    expect(home).toContain('id="features"')
    expect(home).toContain('href="/features"')
  })

  it('the main guide introduces Ask Jupiter and the agents guide', () => {
    const guide = read('content/guide.mdx')
    expect(guide).toContain('<GuideMore />')
    expect(guide).toContain('](/features)')
    const more = read('components/site/GuideNav.tsx')
    expect(more).toContain('href="/guide/agents"')
    expect(more).toContain('href="/guide/ask-jupiter"')
  })

  it('the agents guide links back to the basics and to Ask Jupiter', () => {
    const agents = read('content/agents.mdx')
    expect(agents).toContain('](/guide)')
    expect(agents).toContain('](/guide#install)')
    expect(agents).toContain('](/guide/ask-jupiter)')
  })

  it('Ask Jupiter links to the agents guide', () => {
    expect(read('content/ask-jupiter.mdx')).toContain('](/guide/agents)')
  })

  it('/features links into guide sections that exist', async () => {
    const { FEATURE_SECTIONS } = await import('@/components/site/features/sections')
    const guide = read('content/guide.mdx')
    for (const s of FEATURE_SECTIONS) {
      const m = s.more?.href.match(/^\/guide#(.+)$/)
      if (m) expect(guide, s.more!.href).toContain(`anchor="${m[1]}"`)
    }
  })

  it('the sitemap lists /features with its own image', async () => {
    const { default: sitemap } = await import('./sitemap')
    const entry = (await sitemap()).find((e) => e.url.endsWith('/features'))
    expect(entry?.images?.[0]).toMatch(/\/og\/features\.png$/)
  })
})
