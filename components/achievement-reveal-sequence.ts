// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The face-down → face-up reveal: charge (a shake that grows) → lift + spin
// (1.5 or 2.5 turns) → canvas impact (rings + sparks, mythic also shakes).
// Plain Web Animations on the card's own layers: each animation is awaited
// (`.finished`), so the stages can never drift apart, and nothing persists
// once they end. The rotation uses the individual `rotate` property, so it
// composes with the spring tilt on `transform` instead of replacing it.

import type { UnlockFx } from "@/components/achievement-unlock-fx"
import { revealPlan } from "@/lib/achievement-reveal"
import { type Rarity, rarityColorVar } from "@/lib/achievements"
import { playSfx } from "@/lib/sfx/play"

const JITTER_FRAMES = 14

function chargeJitter(peakPx: number): Keyframe[] {
  return Array.from({ length: JITTER_FRAMES }, (_, i) => {
    const k = ((i + 1) / JITTER_FRAMES) * peakPx
    const dx = (Math.random() - 0.5) * 2 * k
    const dy = (Math.random() - 0.5) * 2 * k
    return {
      scale: 1 + 0.04 * (i / JITTER_FRAMES),
      translate: `${dx}px ${dy}px`,
    }
  })
}

export type RevealLayers = {
  /** Gets the shake, lift and landing squash (`translate` / `scale`). */
  lift: HTMLElement
  /** Gets the spin (`rotate: y …`), starting face down at 180°. */
  flip: HTMLElement
  /** The card back, which brightens while charging. */
  back: HTMLElement | null
}

/** Plays the full reveal; resolves when the card has landed face up. */
export async function playRevealSequence(
  { lift, flip, back }: RevealLayers,
  rarity: Rarity,
  fx: UnlockFx
): Promise<void> {
  const plan = revealPlan(rarity)

  // 1 · Charge.
  back?.animate(
    [{ filter: "brightness(1)" }, { filter: "brightness(1.5) saturate(1.3)" }],
    { duration: plan.chargeMs, easing: "ease-in", fill: "forwards" }
  )
  await lift.animate(
    [{ scale: 1, translate: "0 0" }, ...chargeJitter(plan.jitterPx)],
    {
      duration: plan.chargeMs,
      easing: "linear",
    }
  ).finished

  // 2 · Lift + spin, landing with a squash.
  playSfx("card-flip")
  lift.animate(
    [
      { scale: 1.04, translate: "0 0" },
      { offset: 0.45, scale: 1.22, translate: "0 -10%" },
      { offset: 0.85, scale: 0.95, translate: "0 0" },
      { scale: 1, translate: "0 0" },
    ],
    { duration: plan.spinMs, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)" }
  )
  await flip.animate(
    [{ rotate: "y 180deg" }, { rotate: `y ${180 + plan.turnDeg}deg` }],
    {
      duration: plan.spinMs,
      easing: "cubic-bezier(0.25, 0.6, 0.2, 1)",
      fill: "forwards",
    }
  ).finished
  for (const animation of back?.getAnimations() ?? []) animation.cancel()

  // 3 · Impact, centred on the landed card.
  const rect = flip.getBoundingClientRect()
  const color = fx.resolveColor(rarityColorVar(rarity))
  fx.impact({
    color,
    confettiColors: [
      color,
      fx.resolveColor(rarityColorVar("legendary")),
      "white",
    ],
    intensity: plan.impact,
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  })
  playSfx(rarity === "mythic" ? "unlock-mythic" : "card-reveal")
}
