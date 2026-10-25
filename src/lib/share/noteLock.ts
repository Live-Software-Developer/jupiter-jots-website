import { b64decode, BadCipher, decryptJson, deriveKey } from './crypto'
import { NOTE_MAX } from './payload'
import type { PNote, PNoteLock } from './types'

/** The extension's accepted PBKDF2 range for a lock (as for private shares); anything else is refused, never weakened. */
export const LOCK_MIN_ITERS = 100_000
export const LOCK_MAX_ITERS = 2_000_000

/** The lock's salt or iteration count is outside what the extension makes: it is not tried. */
export class UnsafeLock extends Error {
  constructor() {
    super('unsafe lock parameters')
    this.name = 'UnsafeLock'
  }
}

function saltOf(lock: PNoteLock): Uint8Array | null {
  if (!Number.isInteger(lock.iters) || lock.iters < LOCK_MIN_ITERS || lock.iters > LOCK_MAX_ITERS) return null
  try {
    const s = b64decode(lock.salt)
    return s.length >= 16 ? s : null
  } catch {
    return null
  }
}

async function text(key: CryptoKey, cipher: string): Promise<string> {
  const v = await decryptJson(key, cipher)
  if (typeof v !== 'string') throw new BadCipher('locked field is not a string')
  return v
}

/** Identifies a lock's ciphertext: a live refresh with the same one keeps the note open. */
export const lockSig = (lock: PNoteLock) => `${lock.salt}|${lock.iters}|${lock.body}|${lock.title ?? ''}`

/**
 * Opens a locked note with its own password, in this page only: the key is derived from the
 * note's salt and iteration count and never leaves this function. Returns the note as a plain
 * shared note (its title, markdown body; no tags or links travel with a locked note). Throws
 * WrongPassword for a wrong password, UnsafeLock or BadCipher for a lock it won't or can't read.
 */
export async function openLockedNote(note: PNote, password: string): Promise<PNote> {
  const lock = note.lock
  if (!lock) return note
  const salt = saltOf(lock)
  if (!salt) throw new UnsafeLock()
  const key = await deriveKey(password, salt, lock.iters)
  const body = await text(key, lock.body)
  const title = lock.title !== undefined ? await text(key, lock.title) : note.title
  return { key: note.key, title, body: body.length > NOTE_MAX ? body.slice(0, NOTE_MAX) : body, tags: [] }
}
