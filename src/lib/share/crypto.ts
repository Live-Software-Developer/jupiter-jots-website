// PBKDF2-SHA256 -> AES-GCM-256. cipher = base64(iv[12] || ciphertext).
export class WrongPassword extends Error {
  constructor() {
    super('wrong password')
    this.name = 'WrongPassword'
  }
}

const enc = new TextEncoder()
const dec = new TextDecoder()

export function b64encode(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s)
}
export function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s)
  const out = new Uint8Array(new ArrayBuffer(bin.length))
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function decryptJson<T = unknown>(key: CryptoKey, cipher: string): Promise<T> {
  try {
    const raw = b64decode(cipher)
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: raw.slice(0, 12) },
      key,
      raw.slice(12),
    )
    return JSON.parse(dec.decode(plain)) as T
  } catch {
    throw new WrongPassword()
  }
}

export async function encryptJson(key: CryptoKey, value: unknown, iv?: Uint8Array): Promise<string> {
  const ivBytes = (iv ?? crypto.getRandomValues(new Uint8Array(12))) as BufferSource
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, key, enc.encode(JSON.stringify(value))),
  )
  const out = new Uint8Array(12 + ct.length)
  out.set(ivBytes as Uint8Array, 0)
  out.set(ct, 12)
  return b64encode(out)
}
