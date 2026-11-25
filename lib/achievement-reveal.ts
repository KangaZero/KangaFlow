// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Which unlocked achievements the visitor has already flipped face-up on the
// achievements page. Stored as id → the `unlockedAt` that was revealed, so a
// card unlocked again after a progress reset (Sand Mandala) is face-down
// again instead of skipping its reveal.

import {
  rarityLevel,
  UNLOCK_INTENSITY,
  type UnlockIntensity,
} from "@/lib/achievement-unlock"
import {
  ACHIEVEMENTS,
  type Achievement,
  type AchievementId,
  type Rarity,
} from "@/lib/achievements"

export type RevealedMap = Partial<Readonly<Record<AchievementId, string>>>

export const REVEALED_STORAGE_KEY = "kangaflow:achievements-revealed"

/** Untrusted storage value → only known ids with string timestamps survive. */
export function parseRevealed(value: unknown): RevealedMap {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return {}
  const out: Partial<Record<AchievementId, string>> = {}
  for (const { id } of ACHIEVEMENTS) {
    const stamp: unknown = Reflect.get(value, id)
    if (typeof stamp === "string") out[id] = stamp
  }
  return out
}

/** Unlocked, but this unlock has not been flipped face-up yet. */
export function needsReveal(
  achievement: Achievement,
  revealed: RevealedMap
): boolean {
  return (
    achievement.isUnlocked &&
    revealed[achievement.id] !== achievement.unlockedAt
  )
}

/** The map after revealing `achievement` (no-op for locked ones). */
export function withRevealed(
  revealed: RevealedMap,
  achievement: Achievement
): RevealedMap {
  if (!achievement.isUnlocked) return revealed
  return { ...revealed, [achievement.id]: achievement.unlockedAt }
}

/** Timing + strength of the face-down → face-up reveal, per rarity. */
export type RevealPlan = {
  /** Stage 1: the card shakes harder and harder, ms. */
  chargeMs: number
  /** Peak shake amplitude at the end of the charge, px. */
  jitterPx: number
  /** Stage 2: lift + spin, ms. */
  spinMs: number
  /** Degrees spun past the back face (540 = 1.5 turns). */
  turnDeg: number
  /**
   * Stage 3: the canvas impact. The toast's intensity minus the flash and
   * confetti (the reveal ends on rings + sparks), and only mythic shakes.
   */
  impact: UnlockIntensity
}

const BASE_CHARGE_MS = 450
const BASE_SPIN_MS = 900

export function revealPlan(rarity: Rarity): RevealPlan {
  const tier = rarityLevel(rarity)
  const intensity = UNLOCK_INTENSITY[rarity]
  return {
    chargeMs: BASE_CHARGE_MS + tier * 120,
    impact: {
      ...intensity,
      confetti: 0,
      flash: 0,
      shake: rarity === "mythic" ? intensity.shake : 0,
    },
    jitterPx: 1.5 + tier * 0.8,
    spinMs: BASE_SPIN_MS + tier * 90,
    turnDeg: tier >= rarityLevel("legendary") ? 900 : 540,
  }
}
