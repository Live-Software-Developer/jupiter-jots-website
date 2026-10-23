import { describe, expect, it } from 'vitest'
import { parseVisibility, shareRobots } from './visibility'

describe('parseVisibility', () => {
  it('keeps the three values and reads anything else as unlisted', () => {
    expect(parseVisibility('public')).toBe('public')
    expect(parseVisibility('private')).toBe('private')
    expect(parseVisibility('unlisted')).toBe('unlisted')
    expect(parseVisibility('listed')).toBe('unlisted')
    expect(parseVisibility(undefined)).toBe('unlisted')
  })
})

describe('shareRobots', () => {
  it('indexes only public shares, and never follows their links', () => {
    expect(shareRobots('public')).toEqual({ index: true, follow: false })
    expect(shareRobots('unlisted')).toEqual({ index: false, follow: false })
    expect(shareRobots('private')).toEqual({ index: false, follow: false })
  })
})
