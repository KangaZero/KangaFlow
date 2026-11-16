// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Shared primitives for the dark-theme deep-sea background: maths, the "spine"
// body model, steering, and canvas drawing helpers. No React, no DOM besides
// the CanvasRenderingContext2D passed in, so the simulation is unit-testable.

export const TAU = Math.PI * 2

export type Range = readonly [min: number, max: number]
/** Vertical band as fractions of the stage height (0 = top, 1 = bottom). */
export type Band = Range
export type Pt = { x: number; y: number }
export type Vec = readonly [x: number, y: number]

/** Everything the scene drives once per frame. */
export interface SeaSystem {
  resize(width: number, height: number): void
  step(dt: number, time: number): void
  draw(ctx: CanvasRenderingContext2D, time: number): void
  pointer?(x: number, y: number): void
}

export const rand = (min: number, max: number): number =>
  min + Math.random() * (max - min)
export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t

/**
 * Bounds-clamped array read. `noUncheckedIndexedAccess` types `arr[i]` as
 * `T | undefined`; every caller here indexes a non-empty, fixed-length list,
 * so an empty one is a programming error worth a loud throw.
 */
export function item<T>(arr: readonly T[], index: number): T {
  const value = arr[clamp(index, 0, arr.length - 1)]
  if (value === undefined) throw new Error("item(): empty array")
  return value
}

/* ------------------------------------------------------------------------ */
/* Spine body model                                                         */
/* ------------------------------------------------------------------------ */

/**
 * A side-view swimmer: a chain of points (the spine) following the head. The
 * outline and fins are drawn relative to each segment's forward/up vectors,
 * so bodies bend naturally through turns.
 */
export type Swimmer = {
  s: number // body length (px)
  dir: 1 | -1 // cruising direction
  x: number
  y: number
  vx: number
  vy: number
  wander: number
  ph: number // per-individual phase offset
  beat: number // tail-beat phase
  gape: number // jaw opening 0..1 (species that use it)
  spine: Pt[]
}

export function makeSpine(
  x: number,
  y: number,
  segments: number,
  segmentLength: number,
  angle: number
): Pt[] {
  return Array.from({ length: segments }, (_, i) => ({
    x: x - Math.cos(angle) * i * segmentLength,
    y: y - Math.sin(angle) * i * segmentLength,
  }))
}

export function makeSwimmer(
  width: number,
  height: number,
  size: number,
  band: Band,
  segments: number,
  speed: number,
  enterFromEdge = false
): Swimmer {
  const dir = Math.random() < 0.5 ? 1 : -1
  const x = enterFromEdge ? (dir > 0 ? -20 : width + 20) : rand(0, width)
  const y = rand(band[0], band[1]) * height
  return {
    beat: rand(0, TAU),
    dir,
    gape: 0,
    ph: rand(0, TAU),
    s: size,
    spine: makeSpine(
      x,
      y,
      segments,
      size / (segments - 1),
      dir > 0 ? 0 : Math.PI
    ),
    vx: dir * speed,
    vy: 0,
    wander: rand(0, TAU),
    x,
    y,
  }
}

export function shiftSwimmer(c: Swimmer, dx: number): void {
  c.x += dx
  for (const p of c.spine) p.x += dx
}

export type CruiseOptions = {
  band: Band
  speed: number
  /** Extra speed multiplier at the peak of a burst-and-coast cycle. */
  burst?: number
  burstFrequency?: number
  /** Chance per second of turning around. */
  reverse?: number
  agility?: number
  /** Off-screen distance before wrapping to the other side. */
  margin?: number
  /** Scale vertical steering: heavy / hovering bodies stay level. */
  vyScale?: number
}

/**
 * Shared steering: hold a cruising direction, wander, stay inside a depth band,
 * and wrap horizontally once fully off-screen (so the jump is never seen).
 * Returns the resulting speed.
 */
export function cruise(
  c: Swimmer,
  dt: number,
  time: number,
  width: number,
  height: number,
  o: CruiseOptions
): number {
  c.wander += rand(-1, 1) * dt * 1.2
  if (Math.random() < dt * (o.reverse ?? 0.015)) c.dir = c.dir > 0 ? -1 : 1
  const burst = o.burst
    ? 1 +
      o.burst *
        Math.max(0, Math.sin(time * (o.burstFrequency ?? 0.6) + c.ph)) ** 6
    : 1
  const speed = o.speed * burst
  const fx = c.dir * speed + Math.cos(c.wander) * speed * 0.25
  let fy = Math.sin(c.wander) * speed * 0.35
  const top = o.band[0] * height
  const bottom = o.band[1] * height
  if (c.y < top) fy += (top - c.y) * 1.2
  if (c.y > bottom) fy -= (c.y - bottom) * 1.2
  fy *= o.vyScale ?? 1
  const k = Math.min(1, dt * (o.agility ?? 0.7))
  c.vx = lerp(c.vx, fx, k)
  c.vy = lerp(c.vy, fy, k)
  c.x += c.vx * dt
  c.y += c.vy * dt
  const margin = o.margin ?? 260
  if (c.x < -margin) shiftSwimmer(c, width + 2 * margin)
  else if (c.x > width + margin) shiftSwimmer(c, -width - 2 * margin)
  return Math.hypot(c.vx, c.vy)
}

/**
 * Pull the spine along behind the head. `amp(u)` is the lateral bend per
 * segment as a fraction of segment length at body position `u` (0 head, 1
 * tail): growing toward the tail = fish/shark, constant = eel, 0 = rigid.
 */
export function followSpine(
  c: Swimmer,
  segmentLength: number,
  amp: (u: number) => number,
  waveK = 0.7
): void {
  const { spine } = c
  const speed = Math.hypot(c.vx, c.vy) || 1
  const nx = -c.vy / speed
  const ny = c.vx / speed
  const head = item(spine, 0)
  head.x = c.x
  head.y = c.y
  for (let i = 1; i < spine.length; i++) {
    const p = item(spine, i - 1)
    const q = item(spine, i)
    const wob =
      Math.sin(c.beat - i * waveK) * amp(i / (spine.length - 1)) * segmentLength
    const dx = q.x - p.x + nx * wob
    const dy = q.y - p.y + ny * wob
    const d = Math.hypot(dx, dy) || 1
    q.x = p.x + (dx / d) * segmentLength
    q.y = p.y + (dy / d) * segmentLength
  }
}

/** Fully outside the viewport (plus half a body): skip drawing. */
export function isOffscreen(c: Swimmer, width: number): boolean {
  const a = item(c.spine, 0).x
  const b = item(c.spine, c.spine.length - 1).x
  const pad = c.s * 0.6
  return Math.max(a, b) < -pad || Math.min(a, b) > width + pad
}

/* ------------------------------------------------------------------------ */
/* Geometry + drawing                                                       */
/* ------------------------------------------------------------------------ */

export type SpineGeometry = {
  S: Pt[]
  top: Vec[]
  bot: Vec[]
  /** Per-segment forward unit vector. */
  T: Vec[]
  /** Per-segment screen-"up" unit vector (dorsal side stays on top). */
  U: Vec[]
  n: number
}

export function spineGeometry(
  spine: Pt[],
  widthAt: (u: number) => number,
  travelSign: number
): SpineGeometry {
  const n = spine.length
  const top: Vec[] = []
  const bot: Vec[] = []
  const T: Vec[] = []
  const U: Vec[] = []
  for (let i = 0; i < n; i++) {
    const a = item(spine, i - 1)
    const b = item(spine, i + 1)
    const p = item(spine, i)
    const d = Math.hypot(a.x - b.x, a.y - b.y) || 1
    const tx = (a.x - b.x) / d
    const ty = (a.y - b.y) / d
    const ux = travelSign > 0 ? ty : -ty
    const uy = travelSign > 0 ? -tx : tx
    const w = widthAt(i / (n - 1))
    T.push([tx, ty])
    U.push([ux, uy])
    top.push([p.x + ux * w, p.y + uy * w])
    bot.push([p.x - ux * w, p.y - uy * w])
  }
  return { bot, n, S: spine, T, top, U }
}

/** Point at segment `i`, offset `fwd` along the body and `up` dorsally. */
export function along(g: SpineGeometry, i: number, fwd = 0, up = 0): Vec {
  const p = item(g.S, i)
  const [tx, ty] = item(g.T, i)
  const [ux, uy] = item(g.U, i)
  return [p.x + tx * fwd + ux * up, p.y + ty * fwd + uy * up]
}

export function polygon(
  ctx: CanvasRenderingContext2D,
  pts: readonly Vec[]
): void {
  ctx.beginPath()
  pts.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
}

export function bodyPath(
  ctx: CanvasRenderingContext2D,
  g: SpineGeometry,
  snout: number
): void {
  const head = item(g.S, 0)
  const [tx, ty] = item(g.T, 0)
  ctx.beginPath()
  ctx.moveTo(head.x + tx * snout, head.y + ty * snout)
  for (const [x, y] of g.top) ctx.lineTo(x, y)
  for (let i = g.bot.length - 1; i >= 0; i--) {
    const [x, y] = item(g.bot, i)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
}

/** Soft bioluminescent point light (`rgb` as "r,g,b"). */
export function glowDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  rgb: string,
  alpha: number
): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius * 4)
  g.addColorStop(0, `rgba(${rgb},${alpha})`)
  g.addColorStop(0.25, `rgba(${rgb},${alpha * 0.35})`)
  g.addColorStop(1, `rgba(${rgb},0)`)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, radius * 4, 0, TAU)
  ctx.fill()
}
