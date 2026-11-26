// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"
import { pickActiveSection } from "@/lib/active-section"

describe("pickActiveSection", () => {
  const line = 300

  it("is the first section before anything crosses the line", () => {
    expect(pickActiveSection([400, 1200, 2000, 2800], line, false)).toBe(0)
  })

  it("is the last section whose top crossed the line", () => {
    expect(pickActiveSection([-900, -100, 250, 1100], line, false)).toBe(2)
  })

  it("counts a top exactly on the line as crossed", () => {
    expect(pickActiveSection([-400, 300, 900], line, false)).toBe(1)
  })

  it("is the last section at the bottom of the page, even if short", () => {
    expect(pickActiveSection([-2000, -1200, -400, 500], line, true)).toBe(3)
  })

  it("skips sections that are not in the DOM", () => {
    expect(pickActiveSection([-800, null, -50, null], line, false)).toBe(2)
    expect(pickActiveSection([-800, -50, null], line, true)).toBe(1)
  })

  it("falls back to 0 when no section is present", () => {
    expect(pickActiveSection([null, null], line, false)).toBe(0)
    expect(pickActiveSection([], line, true)).toBe(0)
  })
})
