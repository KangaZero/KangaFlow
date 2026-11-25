// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  needsReveal,
  parseRevealed,
  revealPlan,
  withRevealed,
} from "@/lib/achievement-reveal"
import { type Achievement, makeUnlocked } from "@/lib/achievements"

const LOCKED: Achievement = { id: "eos", isUnlocked: false }
const UNLOCKED = makeUnlocked("eos", "2026-11-25T00:00:00.000Z")

describe("parseRevealed", () => {
  it("drops non-objects, unknown ids and non-string stamps", () => {
    expect(parseRevealed(null)).toEqual({})
    expect(parseRevealed(["eos"])).toEqual({})
    expect(parseRevealed({ bogus: "x", eos: "t", psychopath: 3 })).toEqual({
      eos: "t",
    })
  })
})

describe("needsReveal", () => {
  it("is false for locked cards", () => {
    expect(needsReveal(LOCKED, {})).toBe(false)
  })

  it("is true until this exact unlock was revealed", () => {
    expect(needsReveal(UNLOCKED, {})).toBe(true)
    expect(needsReveal(UNLOCKED, withRevealed({}, UNLOCKED))).toBe(false)
  })

  it("is true again when the card was re-unlocked after a reset", () => {
    const again = makeUnlocked("eos", "2026-11-26T00:00:00.000Z")
    expect(needsReveal(again, withRevealed({}, UNLOCKED))).toBe(true)
  })
})

describe("withRevealed", () => {
  it("ignores locked cards", () => {
    const before = {}
    expect(withRevealed(before, LOCKED)).toBe(before)
  })
})

describe("revealPlan", () => {
  it("grows with rarity", () => {
    const common = revealPlan("common")
    const mythic = revealPlan("mythic")
    expect(mythic.chargeMs).toBeGreaterThan(common.chargeMs)
    expect(mythic.spinMs).toBeGreaterThan(common.spinMs)
    expect(mythic.impact.particles).toBeGreaterThan(common.impact.particles)
  })

  it("spins 1.5 turns, 2.5 from legendary up", () => {
    expect(revealPlan("rare").turnDeg).toBe(540)
    expect(revealPlan("legendary").turnDeg).toBe(900)
    expect(revealPlan("mythic").turnDeg).toBe(900)
  })

  it("never flashes or throws confetti, and only mythic shakes", () => {
    for (const rarity of ["common", "rare", "legendary", "mythic"] as const) {
      const { impact } = revealPlan(rarity)
      expect(impact.flash).toBe(0)
      expect(impact.confetti).toBe(0)
      expect(impact.shake > 0).toBe(rarity === "mythic")
    }
  })
})
