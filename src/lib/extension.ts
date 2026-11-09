import { lazyStore } from "@/lib/lazy-store"

/** The slice of `chrome.runtime` Chrome gives a page that an installed extension lists in externally_connectable. */
type PageRuntime = {
  lastError?: { message?: string }
  sendMessage: (extensionId: string, message: unknown, callback: (response: unknown) => void) => void
}

/** How long to wait for the extension before assuming it is not installed. */
const ANSWER_MS = 1500

const extensionId = () => process.env.NEXT_PUBLIC_JJ_EXTENSION_ID ?? ""

/**
 * One message to the installed extension; undefined when there is no extension to answer
 * (another browser, not installed, disabled, too slow, or NEXT_PUBLIC_JJ_EXTENSION_ID unset).
 */
export function sendToExtension(message: unknown): Promise<unknown> {
  const id = extensionId()
  const runtime = (globalThis as { chrome?: { runtime?: PageRuntime } }).chrome?.runtime
  if (!id || typeof runtime?.sendMessage !== "function") return Promise.resolve(undefined)
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), ANSWER_MS)
    try {
      runtime.sendMessage(id, message, (response) => {
        clearTimeout(timer)
        // Reading lastError tells Chrome the failure was handled.
        resolve(runtime.lastError ? undefined : response)
      })
    } catch {
      clearTimeout(timer)
      resolve(undefined)
    }
  })
}

export const isOk = (r: unknown) => typeof r === "object" && r !== null && (r as { ok?: unknown }).ok === true

export type ExtensionPresence = "unknown" | "installed" | "missing"

const presence = lazyStore<ExtensionPresence>("unknown", async () => (isOk(await sendToExtension({ type: "jj:ping" })) ? "installed" : "missing"))

/** Whether Jupiter Jots is installed in this browser: one ping per page load, shared by every caller. */
export const useExtensionPresence = presence.use

/** Tests only. */
export const resetExtensionPresence = presence.reset

/** Opens the extension's fork screen for a share; false when the extension did not take it. */
export async function forkShare(slug: string): Promise<boolean> {
  return isOk(await sendToExtension({ type: "jj:fork-share", slug }))
}
