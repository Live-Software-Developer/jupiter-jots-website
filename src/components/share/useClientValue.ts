import { useSyncExternalStore } from "react"

const noSubscribe = () => () => {}

/**
 * A browser-only value that never changes while the page is open (WebCrypto support, a name in
 * localStorage). The server render and hydration see `server`; the client then reads `read()`.
 */
export const useClientValue = <T,>(read: () => T, server: T): T => useSyncExternalStore(noSubscribe, read, () => server)
