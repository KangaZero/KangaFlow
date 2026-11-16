// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The light-theme sky birds as one scene: a small loose murmuration, a pale
// distant flock, foreground gulls and an occasional autonomous hawk pass whose
// fright ripples through the flock. No cursor interaction (kept cheap).

import { mulberry32 } from "@/lib/seeded-random"
import {
  drawFlock,
  drawGull,
  drawHawk,
  type FlockLook,
  type SkyBirdPalette,
} from "@/lib/sky-birds/draw"
import {
  type Flock,
  makeFlock,
  type Predator,
  stepFlock,
  type World,
} from "@/lib/sky-birds/flock"
import { type Gull, makeGull, stepGull } from "@/lib/sky-birds/gull"
import { createNoise } from "@/lib/sky-birds/noise"

/** Integration step cap: frame-rate independent, stable under tab hiccups. */
export const MAX_STEP = 1 / 30
/** Longest real gap simulated in one frame (e.g. after a stall). */
export const MAX_FRAME = 0.1

export type SkyBirdCounts = {
  starlings: number
  farStarlings: number
  gulls: number
}

/** Kept deliberately light: still reads as a murmuration, cheap to simulate. */
export const BIRD_COUNTS = {
  coarse: { farStarlings: 0, gulls: 1, starlings: 28 },
  fine: { farStarlings: 16, gulls: 2, starlings: 46 },
} as const satisfies Record<"coarse" | "fine", SkyBirdCounts>

const NEAR_LOOK: FlockLook = {
  alpha: [0.55, 0.95],
  color: "starling",
  scale: 1,
}
const FAR_LOOK: FlockLook = {
  alpha: [0.3, 0.5],
  color: "starlingFar",
  scale: 0.55,
}

export type Hawk = Predator & { vx: number; vy: number }

export type SkyBirdScene = {
  readonly flocks: { near: Flock; far: Flock }
  readonly gulls: Gull[]
  readonly hawk: () => Hawk | null
  readonly time: () => number
  resize: (width: number, height: number) => void
  /** Advance by real elapsed seconds (sub-stepped and capped internally). */
  advance: (elapsed: number) => void
  draw: (ctx: CanvasRenderingContext2D, palette: SkyBirdPalette) => void
}

export function createSkyBirds(
  world: World,
  counts: SkyBirdCounts,
  seed: number
): SkyBirdScene {
  const random = mulberry32(seed)
  const noise = createNoise(seed)
  const size: World = { height: world.height, width: world.width }
  const near = makeFlock(counts.starlings, size, random)
  const far = makeFlock(counts.farStarlings, size, random, 0.7)
  const gulls = Array.from({ length: counts.gulls }, (_, i) =>
    makeGull(i, size, random)
  )
  let hawk: Hawk | null = null
  let hawkWait = 7
  let time = 0

  function step(dt: number): void {
    time += dt
    if (hawk === null) {
      hawkWait -= dt
      if (hawkWait <= 0) {
        const anchor = near.birds[0]
        hawk = {
          r: 95,
          vx: 300,
          vy: (random() - 0.5) * 60,
          x: -40,
          y: (anchor?.y ?? size.height * 0.3) + (random() - 0.5) * 120,
        }
      }
    } else {
      hawk.vy += Math.sin(time * 2) * 40 * dt
      hawk.x += hawk.vx * dt
      hawk.y += hawk.vy * dt
      if (hawk.x > size.width + 60) {
        hawk = null
        hawkWait = 8 + random() * 6
      }
    }
    const predators: Predator[] = hawk === null ? [] : [hawk]
    stepFlock(near, dt, time, size, noise, predators, random)
    stepFlock(far, dt, time, size, noise, [], random)
    for (const g of gulls) stepGull(g, dt, time, size, noise, predators, random)
  }

  return {
    advance(elapsed) {
      let remaining = Math.min(MAX_FRAME, Math.max(0, elapsed))
      while (remaining > 0) {
        const dt = Math.min(MAX_STEP, remaining)
        step(dt)
        remaining -= dt
      }
    },
    draw(ctx, palette) {
      drawFlock(ctx, far, FAR_LOOK, palette)
      drawFlock(ctx, near, NEAR_LOOK, palette)
      if (hawk !== null) drawHawk(ctx, hawk, palette)
      for (const g of gulls) drawGull(ctx, g, noise, palette)
    },
    flocks: { far, near },
    gulls,
    hawk: () => hawk,
    resize(width, height) {
      size.width = width
      size.height = height
    },
    time: () => time,
  }
}
