// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Particle state for the achievement-unlock celebration: sparks, dots,
// confetti, shock rings and light rays. Pure data + a step function (no DOM),
// so the physics and the particle cap are unit-tested; the toast's canvas only
// draws whatever this state holds.

export const MAX_PARTICLES = 420

export type Particle = {
  kind: "spark" | "dot" | "confetti"
  x: number
  y: number
  vx: number
  vy: number
  /** Seconds alive / total lifetime. */
  age: number
  life: number
  size: number
  color: string
  drag: number
  gravity: number
  rotation: number
  spin: number
  phase: number
}

export type Ring = {
  x: number
  y: number
  color: string
  maxRadius: number
  width: number
  age: number
  life: number
}
export type Rays = {
  x: number
  y: number
  color: string
  age: number
  build: number
  fade: number
}

export type FxState = { particles: Particle[]; rings: Ring[]; rays: Rays[] }

export const createFx = (): FxState => ({ particles: [], rays: [], rings: [] })

type Random = () => number

export function burst(
  state: FxState,
  {
    x,
    y,
    color,
    count,
    speed = 260,
    size = 2.6,
    life = 0.7,
  }: {
    x: number
    y: number
    color: string
    count: number
    speed?: number
    size?: number
    life?: number
  },
  random: Random = Math.random
): void {
  for (let i = 0; i < count && state.particles.length < MAX_PARTICLES; i++) {
    const angle = random() * Math.PI * 2
    const velocity = speed * (0.35 + random() * 0.9)
    state.particles.push({
      age: 0,
      color,
      drag: 3.2,
      gravity: 120,
      kind: i % 2 === 0 ? "dot" : "spark",
      life,
      phase: 0,
      rotation: 0,
      size: size * (0.6 + random() * 0.7),
      spin: 0,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      x,
      y,
    })
  }
}

export function confetti(
  state: FxState,
  {
    x,
    y,
    colors,
    count,
  }: { x: number; y: number; colors: readonly string[]; count: number },
  random: Random = Math.random
): void {
  for (let i = 0; i < count && state.particles.length < MAX_PARTICLES; i++) {
    // Thrown upward in a fan, then gravity takes over.
    const angle = -Math.PI / 2 + (random() - 0.5) * 2.4
    const velocity = 260 + random() * 360
    state.particles.push({
      age: 0,
      color: colors[i % colors.length] ?? "currentColor",
      drag: 1.6,
      gravity: 520,
      kind: "confetti",
      life: 1.8 + random(),
      phase: random() * 6,
      rotation: random() * 6,
      size: 4 + random() * 4,
      spin: (random() - 0.5) * 24,
      vx: Math.cos(angle) * velocity,
      vy: Math.sin(angle) * velocity,
      x,
      y,
    })
  }
}

export function ring(state: FxState, value: Omit<Ring, "age">): void {
  state.rings.push({ ...value, age: 0 })
}

export function rays(state: FxState, value: Omit<Rays, "age">): void {
  state.rays.push({ ...value, age: 0 })
}

/** Advance the simulation by `dt` seconds, dropping anything past its life. */
export function stepFx(state: FxState, dt: number): void {
  state.particles = state.particles.filter((p) => {
    p.age += dt
    if (p.age >= p.life) return false
    p.vx *= 1 - p.drag * dt
    p.vy = p.vy * (1 - p.drag * dt) + p.gravity * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    if (p.kind === "confetti") {
      p.rotation += p.spin * dt
      p.x += Math.sin(p.age * 6 + p.phase) * 40 * dt // flutter
    }
    return true
  })
  state.rings = state.rings.filter((r) => {
    r.age += dt
    return r.age < r.life
  })
  state.rays = state.rays.filter((r) => {
    r.age += dt
    return r.age < r.build + r.fade
  })
}

export const isFxIdle = (state: FxState): boolean =>
  state.particles.length === 0 &&
  state.rings.length === 0 &&
  state.rays.length === 0
