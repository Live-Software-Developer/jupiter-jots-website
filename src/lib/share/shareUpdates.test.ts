import { describe, expect, it } from "vitest"

import { newerShareUpdate } from "./shareUpdates"

describe("newerShareUpdate", () => {
  const current = "2026-10-24T10:00:00.000Z"

  it("accepts a newer server timestamp", () => {
    expect(newerShareUpdate({ updated_at: "2026-10-24T10:00:01.000Z" }, current)).toBe("2026-10-24T10:00:01.000Z")
  })

  it("ignores the same timestamp, which a view count can announce", () => {
    expect(newerShareUpdate({ updated_at: current }, current)).toBeNull()
  })

  it("accepts a different microsecond timestamp inside the same millisecond", () => {
    expect(newerShareUpdate({ updated_at: "2026-10-24T10:00:00.000456Z" }, current)).toBe("2026-10-24T10:00:00.000456Z")
  })

  it("ignores an older event that arrived late", () => {
    expect(newerShareUpdate({ updated_at: "2026-10-24T09:59:59.000Z" }, current)).toBeNull()
  })

  it("ignores malformed events", () => {
    expect(newerShareUpdate(null, current)).toBeNull()
    expect(newerShareUpdate("share_updated", current)).toBeNull()
    expect(newerShareUpdate({}, current)).toBeNull()
    expect(newerShareUpdate({ updated_at: 42 }, current)).toBeNull()
    expect(newerShareUpdate({ updated_at: "not a date" }, current)).toBeNull()
  })

  it("accepts a valid event when the page's own timestamp is unusable", () => {
    expect(newerShareUpdate({ updated_at: "2026-10-24T10:00:01.000Z" }, "unknown")).toBe("2026-10-24T10:00:01.000Z")
  })
})
