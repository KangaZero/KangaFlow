// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The "gacha slam" unlock celebration as data: how intense each rarity is and
// when every beat happens. Pure (no DOM/React) so the timing contract is
// unit-tested; components/achievement-toast turns it into Motion keyframes.

import { RARITIES, type Rarity } from "@/lib/achievements"

export type UnlockIntensity = {
  /** Extra rattle time on top of the base, ms. */
  charge: number
  particles: number
  rings: number
  /** Screen jolt amplitude, px (0 = none). */
  shake: number
  /** Peak opacity of the single low-contrast flash (0 = none). Kept ≤ 0.18. */
  flash: number
  confetti: number
  /** Capsule glow while it rattles. */
  glow: boolean
  /** Light leaking through the capsule seam before it opens. */
  leak: boolean
  /** Subtle light rays behind the capsule (no enlarged card). */
  rays: boolean
  /** Low-alpha screen dim under the toast during the charge + open beat. */
  dim: boolean
  /** How long the settled toast stays before auto-dismissing, ms. */
  hold: number
}

export const UNLOCK_INTENSITY = {
  common: {
    charge: 0,
    confetti: 0,
    dim: false,
    flash: 0,
    glow: false,
    hold: 3200,
    leak: false,
    particles: 14,
    rays: false,
    rings: 0,
    shake: 0,
  },
  legendary: {
    charge: 650,
    confetti: 70,
    dim: true,
    flash: 0.14,
    glow: true,
    hold: 5400,
    leak: true,
    particles: 70,
    rays: true,
    rings: 2,
    shake: 5,
  },
  mythic: {
    charge: 950,
    confetti: 130,
    dim: true,
    flash: 0.18,
    glow: true,
    hold: 6800,
    leak: true,
    particles: 110,
    rays: true,
    rings: 3,
    shake: 8,
  },
  rare: {
    charge: 420,
    confetti: 0,
    dim: false,
    flash: 0.1,
    glow: true,
    hold: 4400,
    leak: true,
    particles: 44,
    rays: false,
    rings: 1,
    shake: 3,
  },
  uncommon: {
    charge: 220,
    confetti: 0,
    dim: false,
    flash: 0,
    glow: true,
    hold: 3800,
    leak: false,
    particles: 26,
    rays: false,
    rings: 1,
    shake: 0,
  },
} as const satisfies Record<Rarity, UnlockIntensity>

/** 0 (common) … 4 (mythic), derived from RARITIES order. */
export const rarityLevel = (rarity: Rarity): number => RARITIES.indexOf(rarity)

export const CAPSULE_DROP_MS = 520
const BASE_RATTLE_MS = 300
const OPEN_MS = 560
const SLAB_POP_DELAY_MS = 40
const IMPACT_DELAY_MS = 60
const PLATE_AFTER_POP_MS = 300
const READOUT_AFTER_SLAM_MS = 260
const READOUT_MS = 1000

/** Every beat of the celebration, in ms from mount. */
export type UnlockTimeline = {
  drop: number
  rattleStart: number
  rattle: number
  openAt: number
  open: number
  popAt: number
  impactAt: number
  slamAt: number
  readoutAt: number
  settleAt: number
  hold: number
}

export function unlockTimeline(rarity: Rarity): UnlockTimeline {
  const intensity = UNLOCK_INTENSITY[rarity]
  const rattle = BASE_RATTLE_MS + intensity.charge
  const rattleStart = CAPSULE_DROP_MS
  const openAt = rattleStart + rattle
  const popAt = openAt + SLAB_POP_DELAY_MS
  const slamAt = popAt + PLATE_AFTER_POP_MS
  const readoutAt = slamAt + READOUT_AFTER_SLAM_MS
  return {
    drop: CAPSULE_DROP_MS,
    hold: intensity.hold,
    impactAt: openAt + IMPACT_DELAY_MS,
    open: OPEN_MS,
    openAt,
    popAt,
    rattle,
    rattleStart,
    readoutAt,
    settleAt: readoutAt + READOUT_MS,
    slamAt,
  }
}

/**
 * Capsule rattle keyframes: alternating tilt + nudge whose amplitude grows
 * through the charge and with rarity, ending at rest (0).
 */
export function rattleKeyframes(rarity: Rarity): {
  rotate: number[]
  x: number[]
} {
  const level = rarityLevel(rarity)
  const steps = 10 + level * 6
  const rotate: number[] = []
  const x: number[] = []
  for (let i = 0; i <= steps; i++) {
    const amplitude = (3 + level * 3) * (0.3 + (i / steps) * 0.9)
    const sign = i % 2 === 0 ? -1 : 1
    rotate.push(Math.round(sign * amplitude * 10) / 10)
    x.push(Math.round(-sign * amplitude * 2.5) / 10)
  }
  rotate.push(0)
  x.push(0)
  return { rotate, x }
}

/** Starburst clip-path (grade sticker): alternating outer/inner points. */
export function starburstPolygon(spikes = 12, inner = 0.38): string {
  const points: string[] = []
  for (let k = 0; k < spikes * 2; k++) {
    const angle = (k / (spikes * 2)) * Math.PI * 2 - Math.PI / 2
    const radius = k % 2 === 0 ? 0.5 : inner
    const x = (50 + Math.cos(angle) * radius * 100).toFixed(1)
    const y = (50 + Math.sin(angle) * radius * 100).toFixed(1)
    points.push(`${x}% ${y}%`)
  }
  return `polygon(${points.join(", ")})`
}
