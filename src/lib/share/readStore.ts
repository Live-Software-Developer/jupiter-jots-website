/**
 * Visitor-local "read" state for public share pages. The share payload carries the curator's
 * snapshot, but a reader's own progress should not go back to the server. Only the share slug,
 * the bookmark key and a boolean are stored in IndexedDB; no titles, notes or URLs.
 */
const DB_NAME = "jupiter-jots-share"
const STORE = "reads"
const VERSION = 1

const available = () => typeof indexedDB !== "undefined"

function openDatabase(): Promise<IDBDatabase | null> {
  if (!available()) return Promise.resolve(null)
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

const dbKey = (slug: string, bookmarkKey: string) => `${slug}\u0000${bookmarkKey}`

/** Every local override for one share; keys are bookmark keys, values are read/unread. */
export async function loadReads(slug: string): Promise<Map<string, boolean>> {
  const db = await openDatabase()
  if (!db) return new Map()
  return new Promise((resolve) => {
    const prefix = `${slug}\u0000`
    const reads = new Map<string, boolean>()
    const transaction = db.transaction(STORE, "readonly")
    const request = transaction.objectStore(STORE).openCursor(IDBKeyRange.bound(prefix, `${prefix}￿`))
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      reads.set(String(cursor.key).slice(prefix.length), cursor.value === 1 || cursor.value === true)
      cursor.continue()
    }
    request.onerror = () => resolve(new Map())
    transaction.oncomplete = () => {
      db.close()
      resolve(reads)
    }
    transaction.onabort = () => {
      db.close()
      resolve(new Map())
    }
  })
}

/** Remember one reader's choice, including a deliberate unread override. */
export async function writeRead(slug: string, bookmarkKey: string, read: boolean): Promise<void> {
  const db = await openDatabase()
  if (!db) return
  await new Promise<void>((resolve) => {
    const transaction = db.transaction(STORE, "readwrite")
    transaction.objectStore(STORE).put(read ? 1 : 0, dbKey(slug, bookmarkKey))
    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
    transaction.onerror = () => {
      db.close()
      resolve()
    }
    transaction.onabort = () => {
      db.close()
      resolve()
    }
  })
}
