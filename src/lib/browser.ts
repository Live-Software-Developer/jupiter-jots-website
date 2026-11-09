import { lazyStore } from "@/lib/lazy-store"
import { STORE_URL } from "@/lib/site"

export type BrowserKey = "chrome" | "brave" | "edge" | "opera" | "vivaldi" | "arc" | "chromium" | "firefox" | "safari" | "mobile" | "other"

export type Browser = {
  key: BrowserKey
  /** Display name, e.g. "Brave". */
  name: string
  /** A desktop Chromium browser: it installs Jupiter Jots from the Chrome Web Store. */
  canInstall: boolean
}

type Nav = Pick<Navigator, "userAgent"> & {
  brave?: { isBrave?: () => Promise<boolean> }
  userAgentData?: { brands?: { brand: string }[]; mobile?: boolean }
}

const CHROMIUM: Partial<Record<BrowserKey, string>> = {
  chrome: "Chrome",
  brave: "Brave",
  edge: "Edge",
  opera: "Opera",
  vivaldi: "Vivaldi",
  arc: "Arc",
  chromium: "Chromium",
}

const make = (key: BrowserKey): Browser =>
  CHROMIUM[key]
    ? { key, name: CHROMIUM[key]!, canInstall: true }
    : { key, name: { firefox: "Firefox", safari: "Safari", mobile: "your phone" }[key as string] ?? "your browser", canInstall: false }

/** Before detection (and on the server): no browser named, nothing promised. */
export const UNKNOWN_BROWSER: Browser = { key: "other", name: "your browser", canInstall: false }

/** Which browser this is, from the user agent, UA client hints and Brave's own API. */
export async function detectBrowser(nav: Nav = navigator, doc: Document | undefined = globalThis.document): Promise<Browser> {
  const ua = nav.userAgent
  const brands = nav.userAgentData?.brands?.map((b) => b.brand) ?? []
  const has = (brand: string) => brands.includes(brand)

  // Chromium on Android/iOS runs no extensions; neither does any other phone browser.
  if (nav.userAgentData?.mobile || /Android|iPhone|iPad|iPod|Mobile/.test(ua)) return make("mobile")
  if (/Firefox\/|FxiOS/.test(ua)) return make("firefox")
  const chromium = has("Chromium") || /Chrom(e|ium)\//.test(ua)
  if (!chromium) return make(/Safari\//.test(ua) ? "safari" : "other")

  try {
    if (nav.brave?.isBrave && (await nav.brave.isBrave())) return make("brave")
  } catch {
    // Not Brave, or its API changed.
  }
  if (has("Microsoft Edge") || /Edg\//.test(ua)) return make("edge")
  if (has("Opera") || /OPR\//.test(ua)) return make("opera")
  if (/Vivaldi\//.test(ua)) return make("vivaldi")
  // Arc sends Chrome's user agent but themes every page with its palette variables.
  if (doc && getComputedStyle(doc.documentElement).getPropertyValue("--arc-palette-title")) return make("arc")
  // Client hints name Chrome; without them (older builds) a plain Chrome UA is taken as Chrome.
  return make(brands.length && !has("Google Chrome") ? "chromium" : "chrome")
}

const store = lazyStore(UNKNOWN_BROWSER, () => detectBrowser())

/** The visitor's browser; UNKNOWN_BROWSER on the server and the first client render. */
export const useBrowser = store.use

export type InstallCta = { label: string; href: string; external: boolean }

/**
 * What an install button says and where it goes. Chromium browsers all install from the Chrome
 * Web Store; other browsers and phones get an honest label pointing at the platforms list.
 * Before detection: a neutral "Get the extension". `compact` keeps the header button short.
 */
export function installCta(b: Browser, compact = false): InstallCta {
  if (b.canInstall) return { label: `Add to ${b.name}`, href: STORE_URL, external: true }
  if (b === UNKNOWN_BROWSER || compact) return { label: "Get the extension", href: b === UNKNOWN_BROWSER ? STORE_URL : "/#get", external: b === UNKNOWN_BROWSER }
  return { label: "Available for Chrome, Edge & Brave", href: "/#get", external: false }
}
