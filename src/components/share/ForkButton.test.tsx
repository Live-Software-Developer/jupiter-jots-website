import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import { STORE_URL } from "@/lib/site"

import { ForkButton } from "./ForkButton"

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

function mount() {
  host = document.createElement("div")
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => root!.render(<ForkButton slug="abcdefghij" />))
  return host.querySelector("button")!
}

async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 10))
  })
}

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe("ForkButton", () => {
  it("sendsSlugWhenExtensionAnswersPing", async () => {
    vi.stubEnv("NEXT_PUBLIC_JJ_EXTENSION_ID", EXT)
    const runtime = stubChrome((msg) => (msg.type === "jj:ping" ? { ok: true, version: "2.0.1" } : { ok: true }))
    const button = mount()
    expect(button.textContent).toContain("Save to Jupiter Jots")
    await act(async () => button.click())
    await settle()
    expect(runtime.sendMessage).toHaveBeenNthCalledWith(1, EXT, { type: "jj:ping" }, expect.any(Function))
    expect(runtime.sendMessage).toHaveBeenNthCalledWith(2, EXT, { type: "jj:fork-share", slug: "abcdefghij" }, expect.any(Function))
    expect(host!.textContent).toContain("Opening Jupiter Jots…")
    expect(host!.textContent).not.toContain("Install Jupiter Jots")
  })

  it("showsInstallHelpWithoutExtension", async () => {
    vi.stubEnv("NEXT_PUBLIC_JJ_EXTENSION_ID", EXT)
    const runtime = stubChrome(() => undefined) // not installed: lastError, no answer
    const button = mount()
    await act(async () => button.click())
    await settle()
    expect(runtime.sendMessage).toHaveBeenCalledTimes(1)
    expect(host!.textContent).toContain("Install Jupiter Jots, then use Import → Import a share and paste this link")
    expect(host!.querySelector(`a[href="${STORE_URL}"]`)).not.toBeNull()
    expect([...host!.querySelectorAll("button")].some((b) => b.textContent === "Copy link")).toBe(true)
    expect(button.getAttribute("aria-expanded")).toBe("true")
  })

  it("shows the install help in other browsers and when no extension id is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_JJ_EXTENSION_ID", EXT)
    let button = mount() // no `chrome` global at all
    await act(async () => button.click())
    await settle()
    expect(host!.textContent).toContain("Install Jupiter Jots")
    act(() => root?.unmount())
    host?.remove()

    vi.stubEnv("NEXT_PUBLIC_JJ_EXTENSION_ID", "")
    const runtime = stubChrome(() => ({ ok: true }))
    button = mount()
    await act(async () => button.click())
    await settle()
    expect(runtime.sendMessage).not.toHaveBeenCalled()
    expect(host!.textContent).toContain("Install Jupiter Jots")
  })
})
