// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  type Achievement,
  applyUnlock,
  CATALOGUE_COUNT_BY_RARITY,
  COMPLETION_IDS,
  createInitialAchievements,
  formatSplit,
  getAchievementDef,
  highestUnlockedRarity,
  isNewlyUnlocked,
  makeUnlocked,
  NEW_UNLOCK_WINDOW_MS,
  reconcile,
  setNumber,
  sortAchievements,
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

  it("keeps the oneko easter egg out of completion", () => {
    expect(getAchievementDef("psychopath")).toEqual({
      id: "psychopath",
      rarity: "uncommon",
      secret: true,
      trigger: "oneko",
    })
    expect(COMPLETION_IDS).not.toContain("psychopath")
  })

  it("throws on an unknown definition id", () => {
    // @ts-expect-error runtime guard test
    expect(() => getAchievementDef("nope")).toThrow()
  })
})

describe("achievement collection helpers", () => {
  const now = Date.parse(ISO)
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString()

  it("numbers achievements by catalogue position (1-based)", () => {
    expect(setNumber("new-beginnings")).toBe(1)
    expect(setNumber("speedophile")).toBe(createInitialAchievements().length)
  })

  it("flags unlocks inside the NEW window only", () => {
    expect(isNewlyUnlocked(makeUnlocked("eos", hoursAgo(1)), now)).toBe(true)
    expect(
      isNewlyUnlocked(
        makeUnlocked("eos", new Date(now - NEW_UNLOCK_WINDOW_MS).toISOString()),
        now
      )
    ).toBe(false)
    expect(isNewlyUnlocked({ id: "eos", isUnlocked: false }, now)).toBe(false)
    // A future timestamp (clock skew) is not "new".
    expect(isNewlyUnlocked(makeUnlocked("eos", hoursAgo(-1)), now)).toBe(false)
  })

  it("sorts by set without mutating the input", () => {
    const input = createInitialAchievements().toReversed()
    const sorted = sortAchievements(input, "set")
    expect(sorted.map((a) => a.id)).toEqual(
      createInitialAchievements().map((a) => a.id)
    )
    expect(input[0]?.id).toBe("speedophile")
  })

  it("sorts rarest first, ties by set", () => {
    const ids = sortAchievements(createInitialAchievements(), "rarity").map(
      (a) => a.id
    )
    expect(ids[0]).toBe("speedophile")
    expect(ids.indexOf("sand-mandala")).toBeLessThan(
      ids.indexOf("go-touch-grass")
    )
    expect(ids.at(-1)).toBe("eos")
  })

  it("sorts most recent unlock first, locked last", () => {
    let list = createInitialAchievements()
    list = applyUnlock(list, "eos", hoursAgo(5))
    list = applyUnlock(list, "puzzle-master", hoursAgo(1))
    const ids = sortAchievements(list, "recent").map((a) => a.id)
    expect(ids.slice(0, 3)).toEqual(["puzzle-master", "eos", "new-beginnings"])
  })

  it("formats a speedrun split as m:ss.cc", () => {
    expect(formatSplit(58_420)).toBe("0:58.42")
    expect(formatSplit(66_999)).toBe("1:07.00")
    expect(formatSplit(0)).toBe("0:00.00")
  })

  it("counts catalogue totals per rarity", () => {
    expect(CATALOGUE_COUNT_BY_RARITY).toEqual({
      common: 2,
      legendary: 2,
      mythic: 1,
      rare: 3,
      uncommon: 3,
    })
  })
})

describe("highestUnlockedRarity", () => {
  it("is undefined while nothing is unlocked", () => {
    expect(highestUnlockedRarity(createInitialAchievements())).toBeUndefined()
  })

  it("returns the rarest unlocked tier, ignoring locked ones", () => {
    const achievements = createInitialAchievements().map((achievement) =>
      achievement.id === "eos" || achievement.id === "puzzle-master"
        ? makeUnlocked(achievement.id, ISO)
        : achievement
    )
    expect(getAchievementDef("eos").rarity).toBe("common")
    expect(getAchievementDef("puzzle-master").rarity).toBe("rare")
    expect(highestUnlockedRarity(achievements)).toBe("rare")
  })

  it("is mythic once everything is unlocked", () => {
    const all = createInitialAchievements().map((achievement) =>
      makeUnlocked(achievement.id, ISO)
    )
    expect(highestUnlockedRarity(all)).toBe("mythic")
  })
})
