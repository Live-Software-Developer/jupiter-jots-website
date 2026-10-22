// PBKDF2-SHA256 -> AES-GCM-256. cipher = base64(iv[12] || ciphertext).
export class WrongPassword extends Error {
  constructor() {
    super('wrong password')
    this.name = 'WrongPassword'
  }
}

export class BadCipher extends Error {
  constructor(detail = 'malformed cipher') {
    super(detail)
    this.name = 'BadCipher'
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
  let raw: Uint8Array<ArrayBuffer>
  try {
    raw = b64decode(cipher)
  } catch {
    throw new BadCipher('invalid base64')
  }
  // 12-byte IV + 16-byte GCM tag, as the extension (shareCrypto.ts) checks.
  if (raw.length < 12 + 16) throw new BadCipher('cipher too short')
  let plain: ArrayBuffer
  try {
    plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12))
  } catch {
    throw new WrongPassword()
  }
  try {
    return JSON.parse(dec.decode(plain)) as T
  } catch {
    throw new BadCipher('plaintext is not JSON')
  }
}

export async function encryptJson(key: CryptoKey, value: unknown, iv?: Uint8Array): Promise<string> {
  if (iv && iv.length !== 12) throw new Error('iv must be 12 bytes')
  const ivBytes = (iv ?? crypto.getRandomValues(new Uint8Array(12))) as BufferSource
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: ivBytes }, key, enc.encode(JSON.stringify(value))),
  )
  const out = new Uint8Array(12 + ct.length)
  out.set(ivBytes as Uint8Array, 0)
  out.set(ct, 12)
  return b64encode(out)
}
