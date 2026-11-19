// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  aimCardSpring,
  type CardSpring,
  createCardSpring,
  isSettled,
  stepCardSpring,
} from "@/lib/card-spring"

function run(spring: CardSpring, seconds: number): CardSpring {
  let current = spring
  for (let t = 0; t < seconds; t += 1 / 60)
    current = stepCardSpring(current, 1 / 60)
  return current
}

describe("card spring", () => {
  it("starts at rest", () => {
    expect(isSettled(createCardSpring())).toBe(true)
  })

  it("moves toward the target and settles there", () => {
    const aimed = aimCardSpring(createCardSpring(), 1, -0.5, true)
    expect(isSettled(aimed)).toBe(false)
    const done = run(aimed, 3)
    expect(done.x.position).toBeCloseTo(1, 3)
    expect(done.y.position).toBeCloseTo(-0.5, 3)
    expect(done.light).toBeCloseTo(1, 2)
    expect(isSettled(done)).toBe(true)
  })

  it("clamps targets to -1..1", () => {
    const aimed = aimCardSpring(createCardSpring(), 9, -9, true)
    expect(aimed.x.target).toBe(1)
    expect(aimed.y.target).toBe(-1)
  })

  it("survives a huge frame gap without exploding", () => {
    const aimed = aimCardSpring(createCardSpring(), 1, 1, true)
    const stepped = stepCardSpring(aimed, 10)
    expect(Number.isFinite(stepped.x.position)).toBe(true)
    expect(Math.abs(stepped.x.position)).toBeLessThan(2)
  })

  it("fades the light in faster than out", () => {
    const lit = stepCardSpring(
      aimCardSpring(createCardSpring(), 0, 0, true),
      0.05
    )
    const full = run(aimCardSpring(createCardSpring(), 0, 0, true), 2)
    const dim = stepCardSpring(aimCardSpring(full, 0, 0, false), 0.05)
    expect(lit.light).toBeGreaterThan(1 - dim.light)
  })
})
