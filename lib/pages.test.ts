// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { NAV_ORDER, navPositionLabel, PAGE_NAMES } from "@/lib/pages"

describe("NAV_ORDER", () => {
  it("lists every page exactly once", () => {
    expect([...NAV_ORDER].sort()).toEqual([...PAGE_NAMES].sort())
  })
})

describe("navPositionLabel", () => {
  it("numbers pages from 1, zero-padded, against the nav length", () => {
    expect(navPositionLabel("home")).toBe("01 / 04")
    expect(navPositionLabel("achievements")).toBe("02 / 04")
    expect(navPositionLabel("timeline")).toBe("03 / 04")
    expect(navPositionLabel("environment")).toBe("04 / 04")
  })
})
