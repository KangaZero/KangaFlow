// Shared bubble + deep-sea primitives: pure data/math with no React or DOM
// deps, so both the route-transition template and the sea-creatures components
// can depend on it without importing each other (breaks the import cycle).

import type { Theme } from "@/lib/themes"

// Bioluminescent accent — a literal, like the environment wallpapers: the colour
// IS the deep-sea identity, not a theme token.
export const BIO = "#39e6cf"

// Per-theme rim colour for each bubble.
export const BUBBLE_ACCENT: Record<Theme, string> = {
  dark: BIO,
  light: "rgba(255,255,255,0.95)",
  terminal: "var(--primary)",
}

// Tiny deterministic PRNG (mulberry32). Seed it with Date.now() to get a
// fresh-but-reproducible arrangement each time.
export function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// The soap-film look of a single bubble, tinted by `accent`. Three stacked
// radial-gradients (first listed paints on top): a small offset white specular
// highlight for the glassy read, a thin bright `accent` rim, and a faint inner
// sheen so the sphere isn't hollow. Centre stays transparent.
export function bubbleBackground(accent: string): string {
  return [
    "radial-gradient(circle at 32% 27%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 16%)",
    `radial-gradient(circle at 50% 50%, transparent 60%, ${accent} 71%, ${accent} 73%, transparent 77%)`,
    `radial-gradient(circle at 50% 56%, color-mix(in oklch, ${accent} 14%, transparent) 0%, transparent 62%)`,
  ].join(", ")
}

// Deterministic per-route seed (FNV-1a): identical on server + client so the
// prerendered HTML matches, and available synchronously for first-paint cover.
export function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

export type Bubble = {
  id: number
  leftPct: number
  bottomPct: number
  size: number // px
  drift: number // vw of gentle horizontal bob
  dur: number // seconds per bob cycle
  delay: number // seconds of stagger
  riseVh: number
}

export function makeBubbles(
  seed: number,
  count?: number,
  size?: number
): Bubble[] {
  const rand = mulberry32(seed)
  const bubbleCount = count || 28 + Math.floor(rand() * 10)
  return Array.from({ length: bubbleCount }, (_, id) => ({
    bottomPct: rand() * 100,
    delay: rand() * 0.15,
    drift: (rand() * 2 - 1) * 4,
    dur: 1.4 + rand() * 1.2,
    id,
    leftPct: rand() * 100,
    riseVh: 70 + Math.random() * 35,
    size: (size || 26) + rand() * 90,
  }))
}
