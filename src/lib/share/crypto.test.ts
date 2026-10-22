// @vitest-environment node
import { describe, expect, it } from 'vitest'
import vec from './crypto.vectors.json'
import { WrongPassword, decryptJson, deriveKey, encryptJson } from './crypto'

const b64 = (s: string) => Uint8Array.from(Buffer.from(s, 'base64'))

describe('share crypto', () => {
  it('decrypts the shared vector', async () => {
    const key = await deriveKey(vec.password, b64(vec.salt_b64), vec.kdf_iters)
    expect(await decryptJson(key, vec.cipher)).toEqual({ hello: 'world' })
  })
  it('reproduces the vector cipher with the fixed iv', async () => {
    const key = await deriveKey(vec.password, b64(vec.salt_b64), vec.kdf_iters)
    expect(await encryptJson(key, JSON.parse(vec.plaintext), b64(vec.iv_b64))).toBe(vec.cipher)
  })
  it('throws WrongPassword on a wrong password', async () => {
    const key = await deriveKey('nope', b64(vec.salt_b64), vec.kdf_iters)
    await expect(decryptJson(key, vec.cipher)).rejects.toBeInstanceOf(WrongPassword)
  })
})
