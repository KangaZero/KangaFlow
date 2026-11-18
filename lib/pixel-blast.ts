// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure maths for the PixelBlast background (components/PixelBlast.tsx), pulled
// out of the vendored React Bits component so it is unit-testable.

export type Rgb = readonly [r: number, g: number, b: number]

/** Row-major 3x3 matrix. A tuple, so every index is known to exist. */
export type Mat3 = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
]

export type Point = readonly [x: number, y: number]

const WHITE: Rgb = [1, 1, 1]
const HEX_DIGITS = /^[\da-f]+$/i

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value))

/**
 * `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` → linear 0..1 channels (alpha is
 * ignored). Anything unparseable falls back to white, like upstream.
 */
export const hexToRgb = (hex: string): Rgb => {
  const digits = hex.trim().replace(/^#/, "")
  if (!HEX_DIGITS.test(digits)) {
    return WHITE
  }
  const expanded =
    digits.length === 3 || digits.length === 4
      ? [...digits.slice(0, 3)].map((digit) => digit + digit).join("")
      : digits
  if (expanded.length < 6) {
    return WHITE
  }
  const value = Number.parseInt(expanded.slice(0, 6), 16)
  return [
    ((value >> 16) & 255) / 255,
    ((value >> 8) & 255) / 255,
    (value & 255) / 255,
  ]
}

/** 2x2 ordered-dither threshold in [0, 1). */
export const bayer2 = (x: number, y: number): number =>
  (Math.floor(x) / 2 + Math.floor(y) * Math.floor(y) * 0.75) % 1

/** 8x8 ordered-dither threshold in [0, 1), built recursively from bayer2. */
export const bayer8 = (x: number, y: number): number =>
  (bayer2(x / 4, y / 4) * 0.25 + bayer2(x / 2, y / 2)) * 0.25 + bayer2(x, y)

/** The 64 bayer8 thresholds, row-major, ready to inline into GLSL. */
export const BAYER8_TABLE: readonly number[] = Array.from(
  { length: 64 },
  (_, index) => bayer8(index % 8, Math.floor(index / 8))
)

export const multiply3 = (x: Mat3, y: Mat3): Mat3 => {
  const [a0, a1, a2, a3, a4, a5, a6, a7, a8] = x
  const [b0, b1, b2, b3, b4, b5, b6, b7, b8] = y
  return [
    a0 * b0 + a1 * b3 + a2 * b6,
    a0 * b1 + a1 * b4 + a2 * b7,
    a0 * b2 + a1 * b5 + a2 * b8,
    a3 * b0 + a4 * b3 + a5 * b6,
    a3 * b1 + a4 * b4 + a5 * b7,
    a3 * b2 + a4 * b5 + a5 * b8,
    a6 * b0 + a7 * b3 + a8 * b6,
    a6 * b1 + a7 * b4 + a8 * b7,
    a6 * b2 + a7 * b5 + a8 * b8,
  ]
}

/** Inverse via the adjugate. A singular matrix divides by 1 instead of 0. */
export const invert3 = (m: Mat3): Mat3 => {
  const [a, b, c, d, e, f, g, h, i] = m
  const cofactorA = e * i - f * h
  const cofactorB = -(d * i - f * g)
  const cofactorC = d * h - e * g
  const det = a * cofactorA + b * cofactorB + c * cofactorC || 1
  return [
    cofactorA / det,
    -(b * i - c * h) / det,
    (b * f - c * e) / det,
    cofactorB / det,
    (a * i - c * g) / det,
    -(a * f - c * d) / det,
    cofactorC / det,
    -(a * h - b * g) / det,
    (a * e - b * d) / det,
  ]
}

/** Column-major copy, the layout `uniformMatrix3fv` expects. */
export const transpose3 = (m: Mat3): Mat3 => {
  const [a, b, c, d, e, f, g, h, i] = m
  return [a, d, g, b, e, h, c, f, i]
}

/**
 * Screen → tilted-plane homography for a canvas of `width` x `height`, tilted
 * `tiltX` / `tiltY` degrees about its centre.
 */
export const planeFor = (
  tiltX: number,
  tiltY: number,
  width: number,
  height: number
): Mat3 => {
  const ax = (tiltX * Math.PI) / 180
  const ay = (tiltY * Math.PI) / 180
  const depth = Math.max(width, height) * 1.25
  const cx = width / 2
  const cy = height / 2
  const tilt: Mat3 = [
    Math.cos(ay),
    0,
    0,
    Math.sin(ax) * Math.sin(ay),
    Math.cos(ax),
    0,
    (Math.sin(ay) * Math.cos(ax)) / depth,
    -Math.sin(ax) / depth,
    1,
  ]
  const toCentre: Mat3 = [1, 0, cx, 0, 1, cy, 0, 0, 1]
  const fromCentre: Mat3 = [1, 0, -cx, 0, 1, -cy, 0, 0, 1]
  return invert3(multiply3(multiply3(toCentre, tilt), fromCentre))
}

/** Sentinel for a point behind the tilted plane's horizon. */
export const OFF_PLANE: Point = [-1e6, -1e6]

/**
 * Maps a canvas point (y down) onto the plane. `plane === null` means no tilt,
 * so the point passes through unchanged.
 */
export const toPlane = (
  plane: Mat3 | null,
  height: number,
  x: number,
  y: number
): Point => {
  if (plane === null) {
    return [x, y]
  }
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = plane
  const flippedY = height - y
  const z = m6 * x + m7 * flippedY + m8
  if (z <= 1e-4) {
    return OFF_PLANE
  }
  return [
    (m0 * x + m1 * flippedY + m2) / z,
    height - (m3 * x + m4 * flippedY + m5) / z,
  ]
}
