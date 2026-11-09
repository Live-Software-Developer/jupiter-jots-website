import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { resetExtensionPresence } from "@/lib/extension"

import { ShareCta } from "./ForkButton"

const EXT = "dnfmgdmobmoglemckapnbgncnfhkighd"

type Msg = { type: string; slug?: string }

/** A fake `chrome.runtime` as Chrome exposes it to a page listed in externally_connectable. */
function stubChrome(answer: (msg: Msg) => unknown) {
  const runtime: { lastError?: { message: string }; sendMessage: ReturnType<typeof vi.fn> } = {
    sendMessage: vi.fn((_id: string, msg: Msg, cb: (r: unknown) => void) => {
      const r = answer(msg)
      runtime.lastError = r === undefined ? { message: "Could not establish connection. Receiving end does not exist." } : undefined
      setTimeout(() => {
        cb(r)
        runtime.lastError = undefined
      }, 0)
    }),
  }
  vi.stubGlobal("chrome", { runtime })
  return runtime
}

let root: Root | null = null
let host: HTMLElement | null = null

async function mount() {
  host = document.createElement("div")
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(<ShareCta slug="abcdefghij" />))
  await settle()
  return host
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10))
  })
}

const saveButton = () => [...host!.querySelectorAll("button")].find((b) => b.textContent?.includes("Save to Jupiter Jots"))

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  resetExtensionPresence()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("ShareCta", () => {
  it("offers only Save when the extension answers, and sends the slug", async () => {
    vi.stubEnv("NEXT_PUBLIC_JJ_EXTENSION_ID", EXT)
    const runtime = stubChrome((msg) => (msg.type === "jj:ping" ? { ok: true, version: "2.0.1" } : { ok: true }))
    await mount()
    expect(runtime.sendMessage).toHaveBeenNthCalledWith(1, EXT, { type: "jj:ping" }, expect.any(Function))
    expect(host!.textContent).not.toContain("Get Jupiter Jots")
    await act(async () => saveButton()!.click())
    await settle()
    expect(runtime.sendMessage).toHaveBeenNthCalledWith(2, EXT, { type: "jj:fork-share", slug: "abcdefghij" }, expect.any(Function))
    expect(host!.textContent).toContain("Opening Jupiter Jots…")
  })

  it("explains the manual import when the extension does not take the share", async () => {
    vi.stubEnv("NEXT_PUBLIC_JJ_EXTENSION_ID", EXT)
    stubChrome((msg) => (msg.type === "jj:ping" ? { ok: true } : { ok: false }))
    await mount()
    const button = saveButton()!
    await act(async () => button.click())
    await settle()
    expect(host!.textContent).toContain("Import → Import a share and paste this link")
    expect([...host!.querySelectorAll("button")].some((b) => b.textContent === "Copy link")).toBe(true)
    expect(button.getAttribute("aria-expanded")).toBe("true")
  })

  it("offers only the install link without the extension", async () => {
    vi.stubEnv("NEXT_PUBLIC_JJ_EXTENSION_ID", EXT)
    const runtime = stubChrome(() => undefined) // not installed: lastError, no answer
    await mount()
    expect(runtime.sendMessage).toHaveBeenCalledTimes(1)
    expect(saveButton()).toBeUndefined()
    expect(host!.textContent).toContain("Get Jupiter Jots")
    // jsdom is no Chromium browser, so the link goes to the platforms list (installCta is tested on its own).
    expect(host!.querySelector('a[href="/#get"]')?.textContent).toContain("Get Jupiter Jots")
  })

  it("offers the install link in other browsers and when no extension id is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_JJ_EXTENSION_ID", EXT)
    await mount() // no `chrome` global at all
    expect(saveButton()).toBeUndefined()
    expect(host!.textContent).toContain("Get Jupiter Jots")
    act(() => root?.unmount())
    host?.remove()
    resetExtensionPresence()

    vi.stubEnv("NEXT_PUBLIC_JJ_EXTENSION_ID", "")
    const runtime = stubChrome(() => ({ ok: true }))
    await mount()
    expect(runtime.sendMessage).not.toHaveBeenCalled()
    expect(saveButton()).toBeUndefined()
  })
})
