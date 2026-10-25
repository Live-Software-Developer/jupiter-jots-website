// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { WrongPassword } from './crypto'
import vec from './noteLock.vectors.json'
import { lockSig, openLockedNote, UnsafeLock } from './noteLock'
import { toNote, toPayload } from './payload'

// Locked notes exactly as the extension's buildPayload carries them (its sharePayload.test checks the same file).
describe('locked notes in a payload', () => {
  it('a visible-title locked note parses to a PNote with its lock, no body, tags or links', () => {
    expect(toNote(vec.visible)).toEqual({ key: 'n:7', title: 'Visible plan', body: '', tags: [], lock: vec.visible.lock })
  })

  it('a hidden-title one parses with an empty title and its title cipher', () => {
    expect(toNote(vec.hidden)).toEqual({ key: 'n:8', title: '', body: '', tags: [], lock: vec.hidden.lock })
  })

  it('a malformed lock is dropped like any malformed note', () => {
    for (const bad of [
      { ...vec.visible, lock: null },
      { ...vec.visible, lock: { ...vec.visible.lock, v: 2 } },
      { ...vec.visible, lock: { ...vec.visible.lock, body: 3 } },
      { ...vec.visible, title: null },
      { ...vec.hidden, lock: { ...vec.hidden.lock, title: '' } },
    ])
      expect(toNote(bad)).toBeNull()
  })

  it('works as an item, a collection note and a graph node', () => {
    const p = toPayload({
      v: 1,
      title: 'T',
      intro: '',
      curator: { name: '' },
      items: [
        { key: 'n:8', kind: 'note', note: vec.hidden },
        { key: 'c:1', kind: 'collection', collection: { name: 'C', note: '', hue: 1, bookmarks: [], notes: [{ ...vec.visible, key: 'c:1/n:7' }] } },
        { key: 'g:1', kind: 'graph', graph: { name: 'G', description: '', mode: 'board', steps: [], links: [], nodes: [{ id: 'a', stepId: null, x: 0, y: 0, ref: { kind: 'note', note: { ...vec.visible, key: 'g:1/n:a' } } }] } },
      ],
    })!
    expect(p.items).toHaveLength(3)
    const [n, c, g] = p.items
    if (n.kind !== 'note' || c.kind !== 'collection' || g.kind !== 'graph' || g.graph.nodes[0].ref.kind !== 'note') throw new Error('kind')
    expect(n.note.lock).toEqual(vec.hidden.lock)
    expect(c.collection.notes![0].lock).toEqual(vec.visible.lock)
    expect(g.graph.nodes[0].ref.note.lock).toEqual(vec.visible.lock)
  })
})

describe('openLockedNote', () => {
  it('decrypts the body, and the hidden title, with the note password', async () => {
    expect(await openLockedNote(toNote(vec.hidden)!, vec.password)).toEqual({ key: 'n:8', title: vec.title, body: vec.body, tags: [] })
    expect(await openLockedNote(toNote(vec.visible)!, vec.password)).toEqual({ key: 'n:7', title: 'Visible plan', body: vec.body, tags: [] })
  })

  it('a wrong password is WrongPassword', async () => {
    await expect(openLockedNote(toNote(vec.hidden)!, vec.wrong_password)).rejects.toBeInstanceOf(WrongPassword)
  })

  it('refuses unsafe parameters without trying them', async () => {
    const weak = toNote({ ...vec.visible, lock: { ...vec.visible.lock, iters: 1000 } })!
    await expect(openLockedNote(weak, vec.password)).rejects.toBeInstanceOf(UnsafeLock)
    const short = toNote({ ...vec.visible, lock: { ...vec.visible.lock, salt: 'AAAA' } })!
    await expect(openLockedNote(short, vec.password)).rejects.toBeInstanceOf(UnsafeLock)
  })

  it('lockSig changes with the ciphertext', () => {
    expect(lockSig(vec.visible.lock as never)).not.toBe(lockSig(vec.hidden.lock as never))
  })
})
