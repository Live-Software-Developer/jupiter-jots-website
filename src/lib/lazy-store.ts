import { useSyncExternalStore } from "react"

/**
 * A value worked out once in the browser (on first subscribe) and shared by every component
 * that reads it. The server, and the first client render, see `initial`, so hydration matches.
 */
export function lazyStore<T>(initial: T, load: () => Promise<T>) {
  let value = initial
  let started = false
  const subs = new Set<() => void>()
  const set = (next: T) => {
    value = next
    subs.forEach((s) => s())
  }
  const subscribe = (cb: () => void) => {
    subs.add(cb)
    if (!started) {
      started = true
      load().then(set, () => {})
    }
    return () => void subs.delete(cb)
  }
  return {
    use: () => useSyncExternalStore(subscribe, () => value, () => initial),
    set,
    /** Tests only: forget the value so the next subscriber works it out again. */
    reset: () => {
      value = initial
      started = false
    },
  }
}
