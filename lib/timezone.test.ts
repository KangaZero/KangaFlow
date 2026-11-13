// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { afterEach, describe, expect, it, vi } from "vitest"

import { getLocalTimeZone, getVisitorTimeZone } from "@/lib/timezone"

function stubResolvedZone(timeZone: string): void {
  const real = new Intl.DateTimeFormat().resolvedOptions()
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...real,
    timeZone,
  })
}

describe("timezone", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("reports the visitor's zone as-is", () => {
    stubResolvedZone("Europe/London")
    expect(getVisitorTimeZone()).toBe("Europe/London")
    expect(getLocalTimeZone()).toBe("Europe/London")
  })

  it("has no default when the engine cannot resolve a zone", () => {
    stubResolvedZone("")
    expect(getVisitorTimeZone()).toBeUndefined()
  })

  it("keeps the Asia/Tokyo fallback only in getLocalTimeZone", () => {
    stubResolvedZone("")
    expect(getLocalTimeZone()).toBe("Asia/Tokyo")
  })
})
