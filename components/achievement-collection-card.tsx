"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useRef, useState } from "react"

import { AchievementCardBack } from "@/components/achievement-card-back"
import { AchievementCardFace } from "@/components/achievement-card-face"
import { useAchievementCollection } from "@/components/achievement-collection-context"
import { playRevealSequence } from "@/components/achievement-reveal-sequence"
import { useCardSpring } from "@/hooks/use-card-spring"
import { getAchievementLabels } from "@/lib/achievement-labels"
import { needsReveal } from "@/lib/achievement-reveal"
import { type Achievement, rarityColorVar, setLabel } from "@/lib/achievements"
import { interpolate } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

/** Edge tilt for collection cards: stronger than the projects hand (14°). */
const TILT_DEG = 20

/** View-transition name shared by a card and its inspect-dialog copy. */
export const cardMorphName = (id: Achievement["id"]) => `ach-card-${id}`

/**
 * One card in a collection layout. Face up when owned and already revealed;
 * face down (chrome back) when locked or freshly unlocked. A fresh card
 * reveals on click (achievement-reveal-sequence); a revealed one opens the
 * inspect dialog and morphs into it (the face is a named <ViewTransition>,
 * unnamed while its dialog copy is mounted: one name, one mounted element).
 */
export function AchievementCollectionCard({
  achievement,
  className,
}: {
  achievement: Achievement
  className?: string
}) {
  const { reduced, fx, revealed, markRevealed, inspectedId, inspect, visible } =
    useAchievementCollection()
  const { translate } = useLocale()
  const hostRef = useRef<HTMLButtonElement>(null)
  const liftRef = useRef<HTMLSpanElement>(null)
  const flipRef = useRef<HTMLSpanElement>(null)
  const [revealing, setRevealing] = useState(false)

  const { def, title, rarityLabel } = getAchievementLabels(
    achievement,
    translate
  )
  const locked = !achievement.isUnlocked
  const fresh = needsReveal(achievement, revealed)
  const faceUp = !locked && !fresh
  useCardSpring(hostRef, !reduced && !revealing, { tiltDeg: TILT_DEG })

  const label = locked
    ? interpolate(translate("achievements.collection.lockedCard"), {
        set: setLabel(achievement.id),
      })
    : fresh
      ? interpolate(translate("achievements.collection.reveal"), {
          rarity: rarityLabel,
        })
      : `${title} · ${rarityLabel}`

  async function reveal() {
    const lift = liftRef.current
    const flip = flipRef.current
    if (!lift || !flip) return
    setRevealing(true)
    try {
      if (!reduced)
        await playRevealSequence(
          { back: flip.querySelector<HTMLElement>(".acb"), flip, lift },
          def.rarity,
          fx
        )
    } finally {
      // Commit face-up while the spin's last frame (fill: forwards) still
      // holds the card, then drop the animation one frame later: the CSS
      // face-up angle equals the spin's end, so nothing jumps or re-spins.
      markRevealed(achievement)
      requestAnimationFrame(() => {
        for (const animation of flip.getAnimations()) animation.cancel()
        setRevealing(false)
      })
    }
  }

  function onClick() {
    if (locked || revealing) return
    if (fresh) void reveal()
    else inspect(achievement.id)
  }

  return (
    <button
      aria-disabled={locked || undefined}
      aria-label={label}
      className={cn("acc", className)}
      data-dimmed={visible.has(achievement.id) ? undefined : ""}
      data-locked={locked || undefined}
      data-revealing={revealing || undefined}
      onClick={onClick}
      ref={hostRef}
      style={{ "--rarity": rarityColorVar(def.rarity) }}
      type="button"
    >
      <span className="acc-lift" ref={liftRef}>
        <span
          className="acc-flip"
          data-face={faceUp ? "front" : "back"}
          ref={flipRef}
        >
          <AchievementCardFace
            achievement={achievement}
            morphName={
              faceUp && inspectedId !== achievement.id
                ? cardMorphName(achievement.id)
                : undefined
            }
          />
          <AchievementCardBack isNew={fresh} />
        </span>
      </span>
    </button>
  )
}
