import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeAll, expect, it, vi } from "vitest"

import { FeedbackForm } from "./FeedbackForm"

let root: Root | null = null
let host: HTMLDivElement

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  act(() => root?.unmount())
  root = null
  host?.remove()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

function mount() {
  host = document.createElement("div")
  document.body.append(host)
  root = createRoot(host)
  act(() => root!.render(<FeedbackForm />))
}

/** Sets a controlled field the way typing does, so React sees the change. */
function type(el: HTMLTextAreaElement, value: string) {
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!
  act(() => {
    set.call(el, value)
    el.dispatchEvent(new Event("input", { bubbles: true }))
  })
}

const submit = async () => {
  await act(async () => {
    host.querySelector("form")!.requestSubmit()
  })
}

it("posts website feedback to the same endpoint as the extension", async () => {
  vi.stubEnv("NEXT_PUBLIC_JJ_API_URL", "https://api.example.test")
  const fetch = vi.fn(async () => new Response(null, { status: 204 }))
  vi.stubGlobal("fetch", fetch)
  mount()
  act(() => (host.querySelector('input[value="idea"]') as HTMLInputElement).click())
  type(host.querySelector("#fb-message")!, "Show reading time on shares")
  await submit()
  expect(host.textContent).toContain("Thank you, it’s with us")
  const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit]
  expect(url).toBe("https://api.example.test/api/sharing/feedback")
  expect(JSON.parse(init.body as string)).toMatchObject({ kind: "idea", message: "Show reading time on shares", source: "website" })
})

it("asks for more than a few words before sending", async () => {
  const fetch = vi.fn()
  vi.stubGlobal("fetch", fetch)
  mount()
  type(host.querySelector("#fb-message")!, "meh")
  await submit()
  expect(host.querySelector('[role="alert"]')?.textContent).toMatch(/at least 10/)
  expect(fetch).not.toHaveBeenCalled()
})
