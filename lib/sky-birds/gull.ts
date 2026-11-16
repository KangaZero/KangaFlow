// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Foreground gulls: lazy noise-driven arcs that tighten and loosen, thermals
// (tighter circling while rising) vs slow gliding descent, irregular heavy
// flap bouts with a fast downstroke, and an articulated 3-segment wing whose
// wrist/tip flex with noise. Pure; drawing lives in lib/sky-birds/draw.

import {
  angleDiff,
  clamp,
  edgeForce,
  lerp,
  type Predator,
  type Random,
  TAU,
  type World,
} from "@/lib/sky-birds/flock"
import type { Noise } from "@/lib/sky-birds/noise"

export type Gull = {
  x: number
  y: number
  h: number
  speed: number
  scale: number
  phase: number
  /** 0 = gliding pose, 1 = flapping pose (blended). */
  flapMix: number
  flapAmp: number
  freq: number
  beatsLeft: number
  bank: number
  seed: number
  age: number
  thermal: number
  vy: number
  turnRate: number
}

const between = (random: Random, min: number, max: number): number =>
  min + random() * (max - min)

export function makeGull(index: number, world: World, random: Random): Gull {
  const dir = index % 2 === 0 ? 1 : -1
  return {
    age: 0,
    bank: 0,
    beatsLeft: 0,
    flapAmp: 1,
    flapMix: 0,
    freq: between(random, 2.4, 3.3),
    h:
      dir > 0
        ? between(random, -0.1, 0.1)
        : Math.PI + between(random, -0.1, 0.1),
    phase: 0,
    scale: between(random, 1.15, 1.5),
    seed: between(random, 0, 99),
    speed: between(random, 42, 52),
    thermal: 0,
    turnRate: 0,
    vy: 0,
    x: between(random, world.width * 0.2, world.width * 0.8),
    y: between(random, world.height * 0.5, world.height * 0.72),
  }
}

export function stepGull(
  g: Gull,
  dt: number,
  time: number,
  world: World,
  noise: Noise,
  predators: readonly Predator[],
  random: Random
): void {
  g.age += dt
  const arc =
    noise.noise3(g.seed, time * 0.06, 1) * 0.55 +
    noise.noise3(g.seed + 7, time * 0.17, 2) * 0.18
  let desiredTurn = arc
  if (g.thermal <= 0 && random() < dt * 0.04) g.thermal = between(random, 5, 9)
  if (g.thermal > 0) {
    g.thermal -= dt
    desiredTurn = 0.55 * (arc >= 0 ? 1 : -1)
  }
  const [ex, ey] = edgeForce(g.x, g.y, world, {
    bottom: world.height * 0.12,
    top: world.height * 0.42,
    x: world.width * 0.12,
  })
  if (ex !== 0) desiredTurn += angleDiff(g.h, ex > 0 ? 0 : Math.PI) * 0.9
  for (const p of predators) {
    if (Math.hypot(g.x - p.x, g.y - p.y) < p.r * 0.8) {
      desiredTurn += angleDiff(g.h, Math.atan2(g.y - p.y, g.x - p.x)) * 1.2
      if (g.beatsLeft <= 0) g.beatsLeft = 4
    }
  }
  g.turnRate = lerp(
    g.turnRate,
    clamp(desiredTurn, -0.7, 0.7),
    Math.min(1, dt * 0.8)
  )
  g.h += g.turnRate * dt
  g.bank = lerp(g.bank, clamp(g.turnRate * 1.6, -1, 1), Math.min(1, dt * 1.4))
  // ey > 0 means "too high, push down" (edgeForce's convention) → positive vy.
  const targetVy = g.thermal > 0 ? -9 : 4 + ey * 20
  g.vy = clamp(lerp(g.vy, targetVy, Math.min(1, dt * 0.5)), -30, 30)
  if (
    g.beatsLeft <= 0 &&
    (g.y > world.height * 0.8 || g.speed < 40) &&
    random() < dt * 0.8
  ) {
    g.beatsLeft = Math.round(between(random, 2, 5))
  }
  if (g.beatsLeft <= 0 && random() < dt * 0.05)
    g.beatsLeft = Math.round(between(random, 2, 4))
  const flapping = g.beatsLeft > 0
  g.flapMix = lerp(
    g.flapMix,
    flapping ? 1 : 0,
    Math.min(1, dt * (flapping ? 5 : 1.6))
  )
  if (flapping) {
    const before = g.phase
    g.phase += dt * g.freq * TAU * (Math.sin(g.phase) > 0 ? 1.3 : 0.75)
    if (Math.floor(g.phase / TAU) > Math.floor(before / TAU)) g.beatsLeft--
    g.flapAmp = lerp(g.flapAmp, between(random, 0.85, 1.15), dt)
    g.vy -= 6 * dt
    g.speed = Math.min(56, g.speed + 6 * dt)
  } else {
    g.speed = Math.max(38, g.speed - 1.5 * dt)
  }
  g.x += Math.cos(g.h) * g.speed * dt
  g.y += Math.sin(g.h) * g.speed * 0.45 * dt + g.vy * dt
}

const OBLIQUE = 0.36
const SEGMENTS = [16, 18, 20] as const
const AMPLITUDE = [0.6, 0.38, 0.32] as const
const BIAS = [0.12, 0, 0] as const
const ROOT = [0, 3] as const

/**
 * Wing joints (shoulder → elbow → wrist → tip) in the gull's screen-local frame
 * (x forward, y down): 3D elevation/sweep per joint, projected obliquely so
 * both wings lift together; banking raises one wing.
 */
export function gullWing(
  g: Gull,
  side: -1 | 1,
  noise: Noise
): [number, number][] {
  const flex = noise.noise3(g.seed, g.age * 0.9, 0) * 0.12
  const glideElev = [0.3 + flex * 0.5, -0.16 - flex, -0.28 - flex * 1.4]
  const glideSweep = [-0.12, 0.42, 0.55 + flex]
  const points: [number, number][] = [[ROOT[0], side * ROOT[1] * OBLIQUE]]
  let x = ROOT[0]
  let lat = ROOT[1]
  let z = 0
  let elev = 0
  let sweep = 0
  for (let i = 0; i < 3; i++) {
    const flapElev =
      (AMPLITUDE[i] ?? 0) * g.flapAmp * Math.sin(g.phase - i * 0.6) +
      (BIAS[i] ?? 0)
    const flapSweep =
      i === 2
        ? 0.3 + 0.5 * Math.max(0, -Math.cos(g.phase))
        : 0.1 * Math.sin(g.phase)
    elev += lerp(glideElev[i] ?? 0, flapElev, g.flapMix)
    sweep += lerp(glideSweep[i] ?? 0, flapSweep, g.flapMix)
    const length = SEGMENTS[i] ?? 0
    const flat = Math.cos(sweep) * length
    x -= Math.sin(sweep) * length
    const dl = flat * Math.cos(elev)
    lat += dl
    z += flat * Math.sin(elev) + side * g.bank * dl * 0.5
    points.push([x, -z + side * lat * OBLIQUE])
  }
  return points
}
