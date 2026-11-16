// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"
import { mulberry32 } from "@/lib/seeded-random"
import {
  angleDiff,
  edgeForce,
  K_NEAREST,
  makeFlock,
  nearestNeighbours,
  stepFlock,
  type World,
} from "@/lib/sky-birds/flock"
import { makeGull, stepGull } from "@/lib/sky-birds/gull"
import { createNoise } from "@/lib/sky-birds/noise"
import { BIRD_COUNTS, createSkyBirds, MAX_STEP } from "@/lib/sky-birds/scene"

const WORLD: World = { height: 720, width: 1280 }

describe("sky-birds noise", () => {
  it("is deterministic for a seed and differs across seeds", () => {
    const a = createNoise(42)
    const b = createNoise(42)
    const c = createNoise(43)
    const samples = [
      [0.3, 1.7, 2.2],
      [10.5, -3.1, 0.4],
      [5, 5, 5],
    ] as const
    for (const [x, y, z] of samples)
      expect(a.noise3(x, y, z)).toBe(b.noise3(x, y, z))
    expect(
      samples.some(([x, y, z]) => a.noise3(x, y, z) !== c.noise3(x, y, z))
    ).toBe(true)
  })

  it("stays in a bounded range and is finite", () => {
    const n = createNoise(7)
    for (let i = 0; i < 500; i++) {
      const v = n.fbm(i * 0.37, i * 0.11, i * 0.05)
      expect(Number.isFinite(v)).toBe(true)
      expect(Math.abs(v)).toBeLessThan(1.5)
    }
  })
})

describe("sky-birds flock", () => {
  it("finds exactly the 7 nearest other birds", () => {
    const flock = makeFlock(30, WORLD, mulberry32(1))
    const nn = nearestNeighbours(flock.birds, 0)
    expect(nn).toHaveLength(K_NEAREST)
    expect(nn).not.toContain(0)
    const self = flock.birds[0]
    if (!self) throw new Error("no bird")
    const d = (i: number) => {
      const o = flock.birds[i]
      return o
        ? (o.x - self.x) ** 2 + (o.y - self.y) ** 2
        : Number.POSITIVE_INFINITY
    }
    const farthestNear = Math.max(...nn.map(d))
    const others = flock.birds
      .map((_, i) => i)
      .filter((i) => i !== 0 && !nn.includes(i))
    for (const i of others) expect(d(i)).toBeGreaterThanOrEqual(farthestNear)
  })

  it("never turns faster than turnRate·dt nor changes speed faster than accel·dt", () => {
    const random = mulberry32(3)
    const noise = createNoise(3)
    const flock = makeFlock(40, WORLD, random)
    let t = 0
    for (let f = 0; f < 600; f++) {
      const before = flock.birds.map((b) => ({ h: b.h, speed: b.speed }))
      t += MAX_STEP
      stepFlock(flock, MAX_STEP, t, WORLD, noise, [], random)
      flock.birds.forEach((b, i) => {
        const prev = before[i]
        if (!prev) return
        // calm flock (no predators): alarm stays 0, so the plain cap applies
        expect(Math.abs(angleDiff(prev.h, b.h))).toBeLessThanOrEqual(
          b.turnRate * MAX_STEP + 1e-9
        )
        expect(Math.abs(b.speed - prev.speed)).toBeLessThanOrEqual(
          b.accel * MAX_STEP + 1e-9
        )
      })
    }
  })

  it("a predator's fright ripples outward and then fades", () => {
    const random = mulberry32(5)
    const noise = createNoise(5)
    const flock = makeFlock(40, WORLD, random)
    const first = flock.birds[0]
    if (!first) throw new Error("no bird")
    const predator = { r: 60, x: first.x, y: first.y }
    stepFlock(flock, MAX_STEP, 0, WORLD, noise, [predator], random)
    const directlyHit = flock.birds.filter(
      (b) => Math.hypot(b.x - predator.x, b.y - predator.y) < predator.r
    ).length
    let t = 0
    for (let f = 0; f < 4; f++) {
      t += MAX_STEP
      stepFlock(flock, MAX_STEP, t, WORLD, noise, [], random)
    }
    const alarmed = flock.birds.filter((b) => b.alarm > 0.05).length
    expect(alarmed).toBeGreaterThan(directlyHit) // spread beyond the predator's reach
    for (let f = 0; f < 60 * 12; f++) {
      t += MAX_STEP
      stepFlock(flock, MAX_STEP, t, WORLD, noise, [], random)
    }
    expect(Math.max(...flock.birds.map((b) => b.alarm))).toBeLessThan(0.01)
  })

  it("edge force is exactly zero inside the safe area and grows into the margin", () => {
    const margin = { bottom: 200, top: 80, x: 160 }
    expect(edgeForce(640, 360, WORLD, margin)).toEqual([0, 0])
    const near = edgeForce(150, 360, WORLD, margin)[0]
    const nearer = edgeForce(60, 360, WORLD, margin)[0]
    expect(near).toBeGreaterThan(0)
    expect(nearer).toBeGreaterThan(near)
    expect(edgeForce(1260, 360, WORLD, margin)[0]).toBeLessThan(0)
  })
})

describe("sky-birds scene", () => {
  it("60 simulated seconds stay finite, including hawk passes", () => {
    const scene = createSkyBirds(WORLD, BIRD_COUNTS.fine, 11)
    let sawHawk = false
    for (let f = 0; f < 60 * 60; f++) {
      scene.advance(1 / 60)
      if (scene.hawk() !== null) sawHawk = true
    }
    const all = [...scene.flocks.near.birds, ...scene.flocks.far.birds]
    for (const b of all)
      for (const v of [b.x, b.y, b.h, b.speed, b.alarm])
        expect(Number.isFinite(v)).toBe(true)
    for (const g of scene.gulls)
      for (const v of [g.x, g.y, g.h, g.speed])
        expect(Number.isFinite(v)).toBe(true)
    expect(sawHawk).toBe(true)
  })

  it("caps a long frame instead of exploding", () => {
    const scene = createSkyBirds(WORLD, BIRD_COUNTS.coarse, 2)
    scene.advance(5) // a 5 s stall simulates at most MAX_FRAME
    expect(scene.time()).toBeLessThanOrEqual(0.1 + 1e-9)
  })

  it("keeps the flock light", () => {
    const fine = BIRD_COUNTS.fine
    expect(fine.starlings + fine.farStarlings).toBeLessThanOrEqual(70)
    expect(BIRD_COUNTS.coarse.starlings).toBeLessThan(fine.starlings)
  })
})

describe("sky-birds gulls", () => {
  it("a gull above its band heads back down (regression: inverted edge sign ran away to NaN)", () => {
    const random = mulberry32(9)
    const noise = createNoise(9)
    const gull = makeGull(0, WORLD, random)
    gull.y = -200 // far above the safe band
    gull.thermal = 0
    for (let f = 0; f < 60 * 3; f++)
      stepGull(gull, MAX_STEP, f * MAX_STEP, WORLD, noise, [], () => 0.99)
    expect(gull.vy).toBeGreaterThan(0)
    expect(Number.isFinite(gull.y)).toBe(true)
  })
})
