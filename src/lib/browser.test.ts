import { describe, expect, it } from "vitest"

import { detectBrowser, installCta, UNKNOWN_BROWSER } from "./browser"
import { STORE_URL } from "./site"

const CHROME_UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36"
const brands = (...b: string[]) => ({ brands: b.map((brand) => ({ brand })), mobile: false })

const detect = (nav: Parameters<typeof detectBrowser>[0]) => detectBrowser(nav, undefined).then((b) => b.key)

describe("detectBrowser", () => {
  it("tells the Chromium browsers apart", async () => {
    expect(await detect({ userAgent: CHROME_UA, userAgentData: brands("Google Chrome", "Chromium") })).toBe("chrome")
    expect(await detect({ userAgent: CHROME_UA, brave: { isBrave: async () => true }, userAgentData: brands("Brave", "Chromium") })).toBe("brave")
    expect(await detect({ userAgent: `${CHROME_UA} Edg/141.0.0.0` })).toBe("edge")
    expect(await detect({ userAgent: `${CHROME_UA} OPR/120.0.0.0` })).toBe("opera")
    expect(await detect({ userAgent: `${CHROME_UA} Vivaldi/7.0` })).toBe("vivaldi")
    expect(await detect({ userAgent: CHROME_UA, userAgentData: brands("Chromium") })).toBe("chromium")
    expect(await detect({ userAgent: CHROME_UA })).toBe("chrome")
  })

  it("knows the browsers without the extension", async () => {
    expect(await detect({ userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:140.0) Gecko/20100101 Firefox/140.0" })).toBe("firefox")
    expect(await detect({ userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15" })).toBe("safari")
    expect(await detect({ userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36" })).toBe("mobile")
  })
})

describe("installCta", () => {
  it("names the browser, or says honestly where it runs", async () => {
    const brave = await detectBrowser({ userAgent: CHROME_UA, brave: { isBrave: async () => true } }, undefined)
    expect(installCta(brave)).toEqual({ label: "Add to Brave", href: STORE_URL, external: true })
    const firefox = await detectBrowser({ userAgent: "Firefox/140.0" }, undefined)
    expect(installCta(firefox).label).toBe("Available for Chrome, Edge & Brave")
    expect(installCta(firefox, true)).toEqual({ label: "Get the extension", href: "/#get", external: false })
    expect(installCta(UNKNOWN_BROWSER).label).toBe("Get the extension")
  })
})
