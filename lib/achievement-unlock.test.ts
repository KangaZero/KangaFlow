// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  rarityLevel,
  rattleKeyframes,
  starburstPolygon,
  UNLOCK_INTENSITY,
  unlockTimeline,
} from "@/lib/achievement-unlock"
import { RARITIES } from "@/lib/achievements"
import {
  burst,
  confetti,
  createFx,
  isFxIdle,
  MAX_PARTICLES,
  ring,
  stepFx,
} from "@/lib/unlock-particles"

describe("unlockTimeline", () => {
  it("orders every beat: drop → rattle → open → pop/impact → slam → readout → settle", () => {
    for (const rarity of RARITIES) {
      const t = unlockTimeline(rarity)
      expect(t.rattleStart).toBe(t.drop)
      expect(t.openAt).toBe(t.rattleStart + t.rattle)
      expect(t.popAt).toBeGreaterThan(t.openAt)
      expect(t.impactAt).toBeGreaterThan(t.openAt)
      expect(t.slamAt).toBeGreaterThan(t.popAt)
      expect(t.readoutAt).toBeGreaterThan(t.slamAt)
      expect(t.settleAt).toBeGreaterThan(t.readoutAt)
    }
  })

  it("rarer unlocks rattle longer and stay longer", () => {
    const timelines = RARITIES.map(unlockTimeline)
    for (let i = 1; i < timelines.length; i++) {
      expect(timelines[i]?.rattle).toBeGreaterThan(
        timelines[i - 1]?.rattle ?? 0
      )
      expect(timelines[i]?.hold).toBeGreaterThan(timelines[i - 1]?.hold ?? 0)
    }
  })

  it("dims the screen only for legendary and mythic", () => {
    expect(RARITIES.filter((r) => UNLOCK_INTENSITY[r].dim)).toEqual([
      "legendary",
      "mythic",
    ])
  })

  it("keeps every flash low-contrast", () => {
    for (const rarity of RARITIES)
      expect(UNLOCK_INTENSITY[rarity].flash).toBeLessThanOrEqual(0.18)
  })
})

describe("rattleKeyframes", () => {
  it("alternates, grows in amplitude and ends at rest", () => {
    const { rotate, x } = rattleKeyframes("rare")
    expect(rotate.at(-1)).toBe(0)
    expect(x.at(-1)).toBe(0)
    expect(Math.sign(rotate[0] ?? 0)).toBe(-Math.sign(rotate[1] ?? 0))
    expect(Math.abs(rotate.at(-2) ?? 0)).toBeGreaterThan(
      Math.abs(rotate[0] ?? 0)
    )
  })

  it("rattles harder and with more steps for rarer capsules", () => {
    const peak = (r: (typeof RARITIES)[number]) =>
      Math.max(...rattleKeyframes(r).rotate.map(Math.abs))
    expect(peak("mythic")).toBeGreaterThan(peak("common"))
    expect(rattleKeyframes("mythic").rotate.length).toBeGreaterThan(
      rattleKeyframes("common").rotate.length
    )
    expect(rarityLevel("common")).toBe(0)
    expect(rarityLevel("mythic")).toBe(4)
  })
})

describe("unlock particles", () => {
  it("never exceeds the particle cap", () => {
    const fx = createFx()
    burst(fx, { color: "red", count: 300, x: 0, y: 0 })
    confetti(fx, { colors: ["a", "b"], count: 300, x: 0, y: 0 })
    expect(fx.particles.length).toBe(MAX_PARTICLES)
  })

  it("moves particles, applies gravity to confetti and clears everything after its life", () => {
    const fx = createFx()
    confetti(fx, { colors: ["a"], count: 5, x: 100, y: 100 }, () => 0.5)
    ring(fx, { color: "a", life: 0.5, maxRadius: 80, width: 4, x: 0, y: 0 })
    const startY = fx.particles[0]?.y ?? 0
    stepFx(fx, 0.1)
    expect(fx.particles[0]?.y).toBeLessThan(startY) // thrown upward first
    for (let i = 0; i < 400; i++) stepFx(fx, 1 / 60)
    expect(isFxIdle(fx)).toBe(true)
  })

  it("stays finite under large time steps", () => {
    const fx = createFx()
    burst(fx, { color: "a", count: 40, x: 10, y: 10 })
    stepFx(fx, 0.05)
    for (const p of fx.particles) {
      expect(Number.isFinite(p.x)).toBe(true)
      expect(Number.isFinite(p.y)).toBe(true)
    }
  })
})

describe("starburstPolygon", () => {
  it("has two points per spike, all inside the box", () => {
    const poly = starburstPolygon(10)
    const points = poly.slice("polygon(".length, -1).split(", ")
    expect(points).toHaveLength(20)
    for (const point of points) {
      for (const value of point.split(" ")) {
        const n = Number.parseFloat(value)
        expect(n).toBeGreaterThanOrEqual(0)
        expect(n).toBeLessThanOrEqual(100)
      }
    }
  })
})
