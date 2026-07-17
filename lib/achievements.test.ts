// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  type Achievement,
  applyUnlock,
  COMPLETION_IDS,
  createInitialAchievements,
  getAchievementDef,
  makeUnlocked,
  reconcile,
} from "@/lib/achievements"

const ISO = "2026-07-17T00:00:00.000Z"

describe("achievements reducer", () => {
  it("starts fully locked", () => {
    expect(createInitialAchievements().every((a) => !a.isUnlocked)).toBe(true)
  })

  it("unlocks an achievement", () => {
    const next = applyUnlock(createInitialAchievements(), "new-beginnings", ISO)
    expect(next.find((a) => a.id === "new-beginnings")?.isUnlocked).toBe(true)
  })

  it("dedupes: re-unlocking is a no-op (same reference)", () => {
    const once = applyUnlock(createInitialAchievements(), "eos", ISO)
    expect(applyUnlock(once, "eos", ISO)).toBe(once)
  })

  it("no-ops for an unknown id", () => {
    const init = createInitialAchievements()
    // @ts-expect-error unknown id is rejected at the type level; verify runtime
    expect(applyUnlock(init, "nope", ISO)).toBe(init)
  })

  it("attaches a split only to Speedophile", () => {
    const speed = makeUnlocked("speedophile", ISO, 4200)
    expect(speed.isUnlocked && "split" in speed && speed.split).toBe(4200)
    expect("split" in makeUnlocked("eos", ISO)).toBe(false)
  })

  it("reconcile keeps unlocked state and adds new ids as locked", () => {
    const stored: Achievement[] = [makeUnlocked("eos", ISO)]
    const merged = reconcile(stored)
    expect(merged).toHaveLength(createInitialAchievements().length)
    expect(merged.find((a) => a.id === "eos")?.isUnlocked).toBe(true)
    expect(merged.find((a) => a.id === "new-beginnings")?.isUnlocked).toBe(
      false
    )
  })

  it("counts only the direct-trigger achievements toward completion", () => {
    expect(COMPLETION_IDS).toContain("new-beginnings")
    expect(COMPLETION_IDS).toContain("eos")
    expect(COMPLETION_IDS).toContain("snoopy-detective")
    expect(COMPLETION_IDS).not.toContain("go-touch-grass")
  })

  it("throws on an unknown definition id", () => {
    // @ts-expect-error runtime guard test
    expect(() => getAchievementDef("nope")).toThrow()
  })
})
