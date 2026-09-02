// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  addVisitedSocial,
  hasVisitedEverySocial,
  isStringArray,
  reconcileVisitedSocials,
} from "@/lib/social-stalker"

const ALL = ["GitHub", "LinkedIn", "Email"] as const

describe("social stalker", () => {
  it("records a first visit", () => {
    expect(addVisitedSocial([], "GitHub")).toEqual(["GitHub"])
  })

  it("dedupes: revisiting is a no-op (same reference)", () => {
    const once = addVisitedSocial([], "GitHub")
    expect(addVisitedSocial(once, "GitHub")).toBe(once)
  })

  it("unlocks only once every social has been opened", () => {
    expect(hasVisitedEverySocial(["GitHub", "LinkedIn"], ALL)).toBe(false)
    expect(hasVisitedEverySocial([...ALL], ALL)).toBe(true)
  })

  it("never unlocks against an empty catalogue", () => {
    expect(hasVisitedEverySocial([], [])).toBe(false)
  })

  it("ignores order and extra names", () => {
    expect(
      hasVisitedEverySocial(["Email", "X", "LinkedIn", "GitHub"], ALL)
    ).toBe(true)
  })

  it("reconcile drops socials that left the catalogue", () => {
    expect(reconcileVisitedSocials(["GitHub", "MySpace"], ALL)).toEqual([
      "GitHub",
    ])
  })

  it("narrows parsed storage to string arrays", () => {
    expect(isStringArray(["a", "b"])).toBe(true)
    expect(isStringArray(["a", 1])).toBe(false)
    expect(isStringArray(null)).toBe(false)
  })
})
