// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure spring physics for the trading-card tilt (technique after React Bits'
// ProfileCard): a damped spring pulls each axis toward its pointer target,
// integrated in small sub-steps so a slow frame can't blow it up, plus a
// "light" value that fades in fast and out slowly (the holo intensity).

export type SpringAxis = { position: number; velocity: number; target: number }
export type CardSpring = {
  x: SpringAxis
  y: SpringAxis
  light: number
  lightTarget: number
}

const STIFFNESS = 120
const DAMPING = 16
const SUB_STEP = 1 / 120
const LIGHT_IN = 0.18
const LIGHT_OUT = 0.45
const EPSILON = 5e-4

export function createCardSpring(): CardSpring {
  const axis = (): SpringAxis => ({ position: 0, target: 0, velocity: 0 })
  return { light: 0, lightTarget: 0, x: axis(), y: axis() }
}

function stepAxis(axis: SpringAxis, dt: number): SpringAxis {
  let { position, velocity } = axis
  const steps = Math.max(1, Math.ceil(dt / SUB_STEP))
  const h = dt / steps
  for (let i = 0; i < steps; i += 1) {
    velocity += (STIFFNESS * (axis.target - position) - DAMPING * velocity) * h
    position += velocity * h
  }
  return { ...axis, position, velocity }
}

/** Advance the spring by `dt` seconds (clamped to 50 ms). */
export function stepCardSpring(spring: CardSpring, dt: number): CardSpring {
  const clamped = Math.min(0.05, Math.max(0, dt))
  const tau = spring.lightTarget > spring.light ? LIGHT_IN : LIGHT_OUT
  return {
    ...spring,
    light:
      spring.light +
      (spring.lightTarget - spring.light) * (1 - Math.exp(-clamped / tau)),
    x: stepAxis(spring.x, clamped),
    y: stepAxis(spring.y, clamped),
  }
}

/** True once every value is within EPSILON of rest (the loop can sleep). */
export function isSettled(spring: CardSpring): boolean {
  const still = (a: SpringAxis) =>
    Math.abs(a.target - a.position) < EPSILON && Math.abs(a.velocity) < EPSILON
  return (
    still(spring.x) &&
    still(spring.y) &&
    Math.abs(spring.lightTarget - spring.light) < 2e-3
  )
}

/** Point the spring at a normalised pointer position (-1..1 on each axis). */
export function aimCardSpring(
  spring: CardSpring,
  nx: number,
  ny: number,
  active: boolean
): CardSpring {
  const clamp = (n: number) => Math.max(-1, Math.min(1, n))
  return {
    ...spring,
    lightTarget: active ? 1 : 0,
    x: { ...spring.x, target: clamp(nx) },
    y: { ...spring.y, target: clamp(ny) },
  }
}
