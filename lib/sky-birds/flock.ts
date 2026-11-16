// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Starling murmuration: topological boids (each bird tracks its 7 nearest
// neighbours, like real starlings), capped turn rate + acceleration (inertia,
// so paths curve), per-bird personality (no shared rhythm), flap–glide coupled
// to climbing/accelerating, and fear / turn impulses that propagate
// neighbour-to-neighbour with loss (ripples, density waves).

import type { Noise } from "@/lib/sky-birds/noise"

export const K_NEAREST = 7
export const TAU = Math.PI * 2

export type World = { width: number; height: number }
export type Predator = { x: number; y: number; r: number }
export type Random = () => number

export type Starling = {
  x: number
  y: number
  h: number
  speed: number
  cruise: number
  turnRate: number
  accel: number
  freq: number
  phase: number
  size: number
  /** 0 = far/pale, 1 = near/dark (depth variety inside one flock). */
  z: number
  /** < 0.6 = a straggler that lags and catches up. */
  cohesion: number
  alarm: number
  turnSignal: number
  bank: number
  gliding: boolean
  glideTimer: number
  /** > 0 while the bird has peeled off on its own heading. */
  explore: number
  exploreSeed: number
}

export type Flock = {
  birds: Starling[]
  seed: number
  /** Speed multiplier (far flocks drift slower: aerial perspective). */
  speedScale: number
}

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v))
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
export const angleDiff = (a: number, b: number): number =>
  Math.atan2(Math.sin(b - a), Math.cos(b - a))
const between = (random: Random, min: number, max: number): number =>
  min + random() * (max - min)

/**
 * Smooth inward push that ramps up quadratically across each margin and is
 * exactly 0 inside the safe area — birds arc away early instead of bouncing.
 */
export function edgeForce(
  x: number,
  y: number,
  world: World,
  margin: { x: number; top: number; bottom: number }
): readonly [number, number] {
  let fx = 0
  let fy = 0
  const left = margin.x - x
  const right = x - (world.width - margin.x)
  const top = margin.top - y
  const bottom = y - (world.height - margin.bottom)
  if (left > 0) fx += (left / margin.x) ** 2
  if (right > 0) fx -= (right / margin.x) ** 2
  if (top > 0) fy += (top / margin.top) ** 2
  if (bottom > 0) fy -= (bottom / margin.bottom) ** 2
  return [fx, fy]
}

/** Indices of the k nearest other birds (exact; flocks here are small). */
export function nearestNeighbours(
  birds: readonly Starling[],
  index: number,
  k: number = K_NEAREST
): number[] {
  const self = birds[index]
  if (!self) return []
  const distances: [number, number][] = []
  birds.forEach((other, i) => {
    if (i !== index)
      distances.push([(other.x - self.x) ** 2 + (other.y - self.y) ** 2, i])
  })
  distances.sort((a, b) => a[0] - b[0])
  return distances.slice(0, k).map(([, i]) => i)
}

export function makeFlock(
  count: number,
  world: World,
  random: Random,
  speedScale = 1
): Flock {
  const cx = world.width * between(random, 0.3, 0.6)
  const cy = world.height * between(random, 0.22, 0.38)
  const birds = Array.from({ length: count }, (): Starling => {
    const h = between(random, -0.4, 0.4)
    return {
      accel: between(random, 70, 140),
      alarm: 0,
      bank: 0,
      cohesion:
        random() < 0.08
          ? between(random, 0.25, 0.5)
          : between(random, 0.85, 1.15),
      cruise: between(random, 0.86, 1.14),
      explore: 0,
      exploreSeed: between(random, 0, 99),
      freq: between(random, 10, 14),
      glideTimer: between(random, 0, 0.6),
      gliding: false,
      h,
      phase: between(random, 0, TAU),
      size: between(random, 0.8, 1.25),
      speed: between(random, 70, 95),
      turnRate: between(random, 2.2, 4.6),
      turnSignal: 0,
      x: cx + between(random, -90, 90),
      y: cy + between(random, -40, 40),
      z: random(),
    }
  })
  return { birds, seed: between(random, 0, 99), speedScale }
}

/** One integration step. `dt` must already be capped by the caller. */
export function stepFlock(
  flock: Flock,
  dt: number,
  time: number,
  world: World,
  noise: Noise,
  predators: readonly Predator[],
  random: Random
): void {
  const { birds } = flock
  if (birds.length === 0) return
  // The goal drifts on fractal noise (not an orbit): wanders, pauses, doubles back.
  const goalX =
    world.width * (0.5 + 0.36 * noise.fbm(time * 0.035 + flock.seed, 0, 0))
  const goalY =
    world.height * (0.32 + 0.18 * noise.fbm(0, time * 0.04 + flock.seed, 3))
  const neighbours = birds.map((_, i) => nearestNeighbours(birds, i))

  // Spontaneous turn wave: a few birds start a turn, it spreads.
  if (random() < dt * 0.35) {
    const origin = Math.floor(random() * birds.length)
    const signal = (random() < 0.5 ? -1 : 1) * between(random, 0.6, 1.1)
    for (const i of [origin, ...(neighbours[origin] ?? []).slice(0, 3)]) {
      const bird = birds[i]
      if (bird) bird.turnSignal = signal
    }
  }

  const nextAlarm: number[] = []
  const nextTurn: number[] = []
  birds.forEach((b, index) => {
    // Fear: the nearest birds react first…
    for (const p of predators) {
      const d = Math.hypot(b.x - p.x, b.y - p.y)
      if (d < p.r) b.alarm = Math.max(b.alarm, 1 - d / p.r)
    }
    // …then signals spread neighbour-to-neighbour with loss (the ripple).
    const nn = neighbours[index] ?? []
    let maxAlarm = 0
    let turnSum = 0
    let ax = 0
    let ay = 0
    let cx = 0
    let cy = 0
    let sx = 0
    let sy = 0
    for (const j of nn) {
      const o = birds[j]
      if (!o) continue
      maxAlarm = Math.max(maxAlarm, o.alarm)
      turnSum += o.turnSignal
      ax += Math.cos(o.h)
      ay += Math.sin(o.h)
      cx += o.x
      cy += o.y
      const d2 = (o.x - b.x) ** 2 + (o.y - b.y) ** 2
      if (d2 < 140) {
        const k = 1 - d2 / 140
        sx += (b.x - o.x) * k
        sy += (b.y - o.y) * k
      }
    }
    const m = nn.length || 1
    nextAlarm[index] = Math.max(b.alarm * Math.exp(-dt * 0.9), maxAlarm * 0.86)
    nextTurn[index] =
      lerp(b.turnSignal, (turnSum / m) * 0.9, Math.min(1, dt * 9)) *
      Math.exp(-dt * 1.4)

    // Desired direction: smooth weighted steering terms.
    let dx = (ax / m) * 1.2
    let dy = (ay / m) * 1.2
    dx += (cx / m - b.x) * 0.012 * b.cohesion
    dy += (cy / m - b.y) * 0.012 * b.cohesion
    dx += sx * 0.06
    dy += sy * 0.06
    const goalWeight = b.explore > 0 ? 0 : 0.0016
    dx += (goalX - b.x) * goalWeight
    dy += (goalY - b.y) * goalWeight
    const [qx, qy] = noise.curl(b.x, b.y, time * 0.08 + flock.seed)
    dx += qx * 260
    dy += qy * 260
    if (b.explore > 0) {
      b.explore -= dt
      const a = noise.noise3(b.exploreSeed, time * 0.3, 0) * TAU
      dx += Math.cos(a) * 1.4
      dy += Math.sin(a) * 1.4
    } else if (random() < dt * 0.002) {
      b.explore = between(random, 2, 4)
    }
    const [ex, ey] = edgeForce(b.x, b.y, world, {
      bottom: world.height * 0.34,
      top: world.height * 0.12,
      x: world.width * 0.14,
    })
    dx += ex * 3.2
    dy += ey * 3.2
    if (b.alarm > 0.05) {
      for (const p of predators) {
        const d = Math.hypot(b.x - p.x, b.y - p.y) || 1
        dx += ((b.x - p.x) / d) * b.alarm * 2.4
        dy += ((b.y - p.y) / d) * b.alarm * 2.4
      }
    }

    // Inertia: capped per-bird turn rate (twitchier when frightened) + accel.
    const desired = Math.atan2(dy, dx) + b.turnSignal
    const maxTurn = b.turnRate * (1 + b.alarm * 1.6) * dt
    const turn = clamp(angleDiff(b.h, desired), -maxTurn, maxTurn)
    b.h += turn
    const target =
      82 *
      b.cruise *
      flock.speedScale *
      (1 + b.alarm * 0.7) *
      (b.cohesion < 0.6 ? 0.92 : 1) *
      (b.explore > 0 ? 1.08 : 1)
    b.speed += clamp(target - b.speed, -b.accel * dt, b.accel * dt)
    b.bank = lerp(b.bank, clamp((turn / dt) * 0.35, -1, 1), Math.min(1, dt * 6))

    // Wings follow flight: flap harder climbing/accelerating/afraid; glide otherwise.
    const climbing = Math.sin(b.h) < -0.15
    const accelerating = target > b.speed + 4
    b.glideTimer -= dt
    if (b.glideTimer <= 0) {
      b.gliding =
        !b.gliding &&
        !climbing &&
        !accelerating &&
        b.alarm < 0.2 &&
        random() < 0.55
      b.glideTimer = b.gliding
        ? between(random, 0.25, 0.9)
        : between(random, 0.3, 1.4)
    }
    if (climbing || accelerating || b.alarm > 0.2) b.gliding = false
    if (!b.gliding) {
      const down = Math.sin(b.phase) > 0 // downstroke faster than upstroke
      b.phase +=
        dt *
        b.freq *
        TAU *
        (down ? 1.25 : 0.8) *
        (1 + (climbing ? 0.25 : 0) + b.alarm * 0.3)
    }
    b.x += Math.cos(b.h) * b.speed * dt
    b.y += Math.sin(b.h) * b.speed * dt
  })
  birds.forEach((b, i) => {
    b.alarm = nextAlarm[i] ?? 0
    b.turnSignal = nextTurn[i] ?? 0
  })
}
