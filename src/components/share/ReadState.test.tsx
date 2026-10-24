import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import type { PBookmark } from "@/lib/share/types"

import { BookmarkReadToggle, ShareReadProvider } from "./ReadState"

const store = vi.hoisted(() => ({
  loadReads: vi.fn(async () => new Map<string, boolean>()),
  writeRead: vi.fn(async () => {}),
}))
vi.mock("@/lib/share/readStore", () => store)

const bookmark = (over: Partial<PBookmark> = {}): PBookmark => ({
  key: "b:1",
  url: "https://example.com/1",
  title: "One",
  domain: "example.com",
  note: "",
  tags: [],
  read: false,
  ...over,
})

let root: Root | null = null
let host: HTMLElement | null = null

function mount(bookmark: PBookmark, stored?: Map<string, boolean>) {
  store.loadReads.mockResolvedValue(stored ?? new Map())
  host = document.createElement("div")
  document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root!.render(
      <ShareReadProvider slug="share-1">
        <BookmarkReadToggle bookmark={bookmark} />
      </ShareReadProvider>,
    )
  })
  return host.querySelector("button")!
}

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  act(() => root?.unmount())
  host?.remove()
  root = null
  host = null
  vi.clearAllMocks()
})

describe("reader-local read state", () => {
  it("starts from the payload and toggles read/unread in IndexedDB", () => {
    const button = mount(bookmark())
    expect(button.getAttribute("aria-label")).toBe("Mark as read")
    act(() => button.click())
    expect(button.getAttribute("aria-label")).toBe("Mark as unread")
    expect(store.writeRead).toHaveBeenLastCalledWith("share-1", "b:1", true)
    act(() => button.click())
    expect(button.getAttribute("aria-label")).toBe("Mark as read")
    expect(store.writeRead).toHaveBeenLastCalledWith("share-1", "b:1", false)
  })

  it("lets a stored unread choice override a bookmark the curator marked read", async () => {
    const button = mount(bookmark({ read: true }), new Map([["b:1", false]]))
    await act(async () => {
      await Promise.resolve()
    })
    expect(button.getAttribute("aria-label")).toBe("Mark as read")
  })
})
