"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Lock } from "lucide-react"
import { ViewTransition } from "react"

import { AchievementArt } from "@/components/achievement-art"
import { getAchievementLabels } from "@/lib/achievement-labels"
import { type Achievement, rarityStars, setLabel } from "@/lib/achievements"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

/**
 * The trading card itself: rarity-stock frame, title + rarity pill, the
 * achievement's art, description and a set/stars/date footer, under holo +
 * glare layers that follow --mx/--my/--hyp from whoever tilts it (the slab's
 * useCardTilt, the collection's useCardSpring). Locked cards get a sealed
 * cover; secret + locked ones also hide their hint. Styles:
 * achievement-slab.css. Spans only, so it can sit inside a <button>.
 *
 * `morphName` makes the card a named shared element (React <ViewTransition>):
 * the collection card and its inspect-dialog copy use the same name, never
 * mounted at the same time, so opening/closing morphs between them.
 */
export function AchievementCardFace({
  achievement,
  className,
  morphName,
}: {
  achievement: Achievement
  className?: string
  morphName?: string | undefined
}) {
  const { locale, translate } = useLocale()
  const { def, hidden, title, description, rarityLabel } = getAchievementLabels(
    achievement,
    translate
  )
  const locked = !achievement.isUnlocked
  const unlockedDate = achievement.isUnlocked
    ? new Date(achievement.unlockedAt).toLocaleDateString(locale)
    : null

  const card = (
    <span
      className={cn("ach-card", className)}
      data-locked={locked}
      data-rarity={def.rarity}
    >
      <span className="ach-card__face">
        <span className="ach-card__frame">
          <span className="ach-card__head">
            <span className="ach-card__title">{title}</span>
            <span className="ach-card__pill">{rarityLabel}</span>
          </span>
          <span className="ach-card__art">
            <AchievementArt id={achievement.id} />
          </span>
          <span className="ach-card__body">{description}</span>
          <span className="ach-card__foot">
            <span>{setLabel(achievement.id)}</span>
            <span className="ach-card__stars">{rarityStars(def.rarity)}</span>
            <span>{unlockedDate}</span>
          </span>
        </span>
        <span className="ach-card__holo" />
        <span className="ach-card__glare" />
      </span>

      {locked ? (
        <span className="ach-card__sealed">
          {hidden ? (
            <span className="ach-card__sealed-q">?</span>
          ) : (
            <Lock aria-hidden />
          )}
          <span>{translate("achievements.slab.sealed")}</span>
          {hidden ? null : (
            <span className="ach-card__sealed-hint">{description}</span>
          )}
        </span>
      ) : null}
    </span>
  )

  return morphName ? (
    <ViewTransition default="none" name={morphName} share="ach-morph">
      {card}
    </ViewTransition>
  ) : (
    card
  )
}
