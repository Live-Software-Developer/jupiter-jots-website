// @vitest-environment node
import { describe, expect, it } from 'vitest'
import vec from './crypto.vectors.json'
import { BadCipher, WrongPassword, decryptJson, deriveKey, encryptJson } from './crypto'

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
  it('malformed base64 is BadCipher', async () => {
    const key = await deriveKey(vec.password, b64(vec.salt_b64), vec.kdf_iters)
    await expect(decryptJson(key, '!!not base64!!')).rejects.toBeInstanceOf(BadCipher)
  })
  it('a 12-byte-only cipher is BadCipher', async () => {
    const key = await deriveKey(vec.password, b64(vec.salt_b64), vec.kdf_iters)
    await expect(decryptJson(key, 'AAAAAAAAAAAAAAAA')).rejects.toBeInstanceOf(BadCipher)
  })
  it('a tampered ciphertext byte is WrongPassword', async () => {
    const key = await deriveKey(vec.password, b64(vec.salt_b64), vec.kdf_iters)
    const raw = b64(vec.cipher)
    raw[raw.length - 1] ^= 1
    await expect(decryptJson(key, Buffer.from(raw).toString('base64'))).rejects.toBeInstanceOf(WrongPassword)
  })
  it('non-JSON plaintext is BadCipher', async () => {
    const key = await deriveKey(vec.password, b64(vec.salt_b64), vec.kdf_iters)
    const iv = new Uint8Array(12)
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode('not json')))
    const all = new Uint8Array(12 + ct.length)
    all.set(iv); all.set(ct, 12)
    await expect(decryptJson(key, Buffer.from(all).toString('base64'))).rejects.toBeInstanceOf(BadCipher)
  })
  it('encryptJson rejects a wrong-size iv', async () => {
    const key = await deriveKey(vec.password, b64(vec.salt_b64), vec.kdf_iters)
    await expect(encryptJson(key, {}, new Uint8Array(8))).rejects.toThrow()
  })
})
