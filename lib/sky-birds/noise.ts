// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Seeded smooth noise for the light-theme birds: 3D gradient noise
// (Perlin-style), a 2-octave fbm, and the curl of the noise as a swirl field.
// Pure and deterministic for a seed, so the simulation is testable.

import { mulberry32 } from "@/lib/seeded-random"

export type Noise = {
  noise3: (x: number, y: number, z: number) => number
  fbm: (x: number, y: number, z: number) => number
  /** Divergence-free swirl at (x, y): following it curves paths, never sinks. */
  curl: (x: number, y: number, z: number) => readonly [number, number]
}

const fade = (t: number): number => t * t * t * (t * (t * 6 - 15) + 10)
const mix = (a: number, b: number, t: number): number => a + (b - a) * t

function gradient(hash: number, x: number, y: number, z: number): number {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 4 ? y : h === 12 || h === 14 ? x : z
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

export function createNoise(seed: number): Noise {
  const random = mulberry32(seed)
  const base = Array.from({ length: 256 }, (_, i) => i)
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const a = base[i] ?? 0
    base[i] = base[j] ?? 0
    base[j] = a
  }
  const perm = Uint8Array.from([...base, ...base])
  const p = (i: number): number => perm[i & 511] ?? 0

  function noise3(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255
    const fx = x - Math.floor(x)
    const fy = y - Math.floor(y)
    const fz = z - Math.floor(z)
    const u = fade(fx)
    const v = fade(fy)
    const w = fade(fz)
    const A = p(X) + Y
    const AA = p(A) + Z
    const AB = p(A + 1) + Z
    const B = p(X + 1) + Y
    const BA = p(B) + Z
    const BB = p(B + 1) + Z
    return mix(
      mix(
        mix(gradient(p(AA), fx, fy, fz), gradient(p(BA), fx - 1, fy, fz), u),
        mix(
          gradient(p(AB), fx, fy - 1, fz),
          gradient(p(BB), fx - 1, fy - 1, fz),
          u
        ),
        v
      ),
      mix(
        mix(
          gradient(p(AA + 1), fx, fy, fz - 1),
          gradient(p(BA + 1), fx - 1, fy, fz - 1),
          u
        ),
        mix(
          gradient(p(AB + 1), fx, fy - 1, fz - 1),
          gradient(p(BB + 1), fx - 1, fy - 1, fz - 1),
          u
        ),
        v
      ),
      w
    )
  }

  const fbm = (x: number, y: number, z: number): number =>
    noise3(x, y, z) * 0.65 + noise3(x * 2.1, y * 2.1, z * 1.7) * 0.35

  // Curl of a scalar potential ψ: (∂ψ/∂y, −∂ψ/∂x). Spatial scale is baked in.
  const CURL_SCALE = 0.006
  const EPS = 0.6
  function curl(x: number, y: number, z: number): readonly [number, number] {
    const n = (a: number, b: number) =>
      noise3(a * CURL_SCALE, b * CURL_SCALE, z)
    return [
      (n(x, y + EPS) - n(x, y - EPS)) / (2 * EPS),
      -(n(x + EPS, y) - n(x - EPS, y)) / (2 * EPS),
    ]
  }

  return { curl, fbm, noise3 }
}
