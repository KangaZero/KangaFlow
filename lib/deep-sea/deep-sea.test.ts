// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { createJellies, createSchool, createSnow } from "@/lib/deep-sea/ambient"
import {
  cruise,
  followSpine,
  isOffscreen,
  item,
  makeSwimmer,
  type SeaSystem,
} from "@/lib/deep-sea/core"
import {
  createAnglers,
  createFarVisitors,
  createGulpers,
  createSharks,
  createVampireSquids,
  createVipers,
  VISITOR_SIZE,
  visitorSize,
} from "@/lib/deep-sea/creatures"
import { BUBBLE_DEPTHS, makeCssBubbles } from "@/lib/deep-sea/css-bubbles"
import { buildDeepSea, DEEP_SEA_LAYERS } from "@/lib/deep-sea/scene"

const W = 1280
const H = 720

/**
 * Recording 2D-context stand-in: every method is a no-op that remembers any
 * non-finite numeric argument, so a NaN reaching the canvas fails the test.
 * jsdom has no canvas; a structural mock is the only way to exercise draw().
 */
function recordingContext(): {
  ctx: CanvasRenderingContext2D
  nonFinite: string[]
} {
  const nonFinite: string[] = []
  const gradient = { addColorStop: () => undefined }
  const target: Record<string, unknown> = {}
  const proxy = new Proxy(target, {
    get(store, key) {
      if (typeof key !== "string") return undefined
      if (key in store) return store[key]
      return (...args: unknown[]) => {
        for (const arg of args) {
          if (typeof arg === "number" && !Number.isFinite(arg))
            nonFinite.push(key)
        }
        return key.startsWith("create") ? gradient : undefined
      }
    },
  })
  return { ctx: proxy as unknown as CanvasRenderingContext2D, nonFinite }
}

function simulate(system: SeaSystem, seconds: number) {
  const { ctx, nonFinite } = recordingContext()
  system.resize(W, H)
  let t = 0
  for (let f = 0; f < seconds * 60; f++) {
    t += 1 / 60
    system.pointer?.(W / 2, H / 2)
    system.step(1 / 60, t)
    system.draw(ctx, t)
  }
  return nonFinite
}

describe("deep-sea core", () => {
  it("item() clamps the index and throws on an empty list", () => {
    expect(item([1, 2, 3], -5)).toBe(1)
    expect(item([1, 2, 3], 99)).toBe(3)
    expect(() => item([], 0)).toThrow()
  })

  it("followSpine keeps every segment at its rest length", () => {
    const c = makeSwimmer(W, H, 120, [0.4, 0.6], 12, 30)
    const len = 120 / 11
    for (let f = 0; f < 300; f++) {
      c.x += 2
      c.y += Math.sin(f / 10) * 3
      c.beat += 0.1
      followSpine(c, len, (u) => u * 0.2)
    }
    for (let i = 1; i < c.spine.length; i++) {
      const a = item(c.spine, i - 1)
      const b = item(c.spine, i)
      expect(Math.hypot(b.x - a.x, b.y - a.y)).toBeCloseTo(len, 5)
    }
  })

  it("rigid amp keeps the spine straight", () => {
    const c = makeSwimmer(W, H, 100, [0.5, 0.5], 6, 20)
    for (let f = 0; f < 120; f++) {
      c.x += 1
      c.beat += 0.2
      followSpine(c, 20, () => 0)
    }
    const ys = c.spine.map((p) => p.y)
    expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(1e-6)
  })

  it("cruise steers a swimmer back into its depth band", () => {
    const band = [0.6, 0.8] as const
    const c = makeSwimmer(W, H, 60, band, 8, 30)
    c.y = 10
    for (let f = 0; f < 60 * 30; f++)
      cruise(c, 1 / 60, f / 60, W, H, { band, speed: 30 })
    expect(c.y).toBeGreaterThan(band[0] * H - 40)
    expect(c.y).toBeLessThan(band[1] * H + 40)
  })

  it("cruise wraps a swimmer that left the screen", () => {
    const c = makeSwimmer(W, H, 60, [0.5, 0.5], 8, 30)
    c.x = W + 300
    cruise(c, 1 / 60, 0, W, H, { band: [0.5, 0.5], margin: 260, speed: 30 })
    expect(c.x).toBeLessThan(0)
  })

  it("detects fully off-screen bodies", () => {
    const c = makeSwimmer(W, H, 100, [0.5, 0.5], 6, 20)
    expect(isOffscreen(c, W)).toBe(false)
    for (const p of c.spine) p.x -= W * 3
    expect(isOffscreen(c, W)).toBe(true)
  })
})

describe("deep-sea creatures", () => {
  const systems: Record<string, () => SeaSystem> = {
    angler: () => createAnglers(),
    foregroundShark: () =>
      createSharks({ pass: true, size: [380, 820], speed: 120 }),
    gulper: () => createGulpers(),
    jelly: () => createJellies({ n: 2 }),
    school: () => createSchool({ n: 8 }),
    shark: () => createSharks(),
    snow: () => createSnow(20),
    vampireSquid: () => createVampireSquids(),
    viper: () => createVipers(),
    visitors: () =>
      createFarVisitors({ firstAfter: 0.1, waitRange: [0.1, 0.2] }),
  }

  for (const [name, make] of Object.entries(systems)) {
    it(`${name}: 60 simulated seconds never draw a non-finite value`, () => {
      expect(simulate(make(), 60)).toEqual([])
    })
  }

  it("giant squid tops out around 70% of the screen; sizes skew small", () => {
    const span = 2.25 // mantle tip → tentacle clubs, in body units
    expect(visitorSize("squid", W, 1) * span).toBeLessThanOrEqual(W * 0.7)
    expect(visitorSize("squid", W, 0)).toBeCloseTo(VISITOR_SIZE.squid[0] * W)
    expect(visitorSize("squid", W, 0.5)).toBeLessThan(
      ((VISITOR_SIZE.squid[0] + VISITOR_SIZE.squid[1]) / 2) * W
    )
  })
})

describe("deep-sea scene", () => {
  it("builds a cast for every layer; touch devices drop the foreground pass", () => {
    const full = buildDeepSea(false)
    const coarse = buildDeepSea(true)
    for (const layer of DEEP_SEA_LAYERS) expect(full[layer.id]).toBeDefined()
    expect(full.foreground.length).toBe(1)
    expect(coarse.foreground.length).toBe(0)
  })

  it("every bubble depth has a layer slot", () => {
    const slots = DEEP_SEA_LAYERS.flatMap((layer) =>
      "bubblesBefore" in layer ? [layer.bubblesBefore] : []
    )
    expect([...slots].sort()).toEqual([...BUBBLE_DEPTHS].sort())
  })

  it("makeCssBubbles is deterministic with an injected random", () => {
    let seed = 1
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return seed / 2147483647
    }
    const bubbles = makeCssBubbles({ loners: 5, perVent: 4, vents: 3 }, random)
    expect(bubbles).toHaveLength(17)
    for (const b of bubbles) {
      expect(b.x).toBeGreaterThanOrEqual(-1)
      expect(b.x).toBeLessThanOrEqual(101)
      expect(b.duration).toBeGreaterThan(0)
      expect(b.big).toBe(b.size > 22)
    }
  })
})
