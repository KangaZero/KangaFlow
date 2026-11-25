"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/achievement-slab.css"

import { AchievementCardFace } from "@/components/achievement-card-face"
import { useCardTilt } from "@/hooks/use-card-tilt"
import { getAchievementLabels } from "@/lib/achievement-labels"
import {
  type Achievement,
  RARITY_GRADE,
  rarityColorVar,
  setLabel,
} from "@/lib/achievements"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

type AchievementSlabProps = {
  achievement: Achievement
  isNew?: boolean
  /** When given, the slab is a button that opens the inspect view. */
  onInspect?: () => void
  /** Shared-element name for the card inside (see AchievementCardFace). */
  morphName?: string | undefined
  className?: string
}

/**
 * An achievement as a graded trading card: an acrylic "slab" with a grading
 * label on top and the card in a recessed well. Locked cards are sealed;
 * secret + locked ones also mask their title. Every inner element is a `span`
 * so the whole slab can legally be a `<button>`.
 */
export function AchievementSlab({
  achievement,
  isNew = false,
  onInspect,
  morphName,
  className,
}: AchievementSlabProps) {
  const { locale, translate } = useLocale()
  const tilt = useCardTilt()
  const { def, title, rarityLabel } = getAchievementLabels(
    achievement,
    translate
  )
  const locked = !achievement.isUnlocked
  const set = setLabel(achievement.id)
  const unlockedDate = achievement.isUnlocked
    ? new Date(achievement.unlockedAt).toLocaleDateString(locale)
    : null

  const content = (
    <span className="ach-slab__case">
      {isNew && !locked ? (
        <span className="ach-slab__new">
          {translate("achievements.slab.new")}
        </span>
      ) : null}

      <span className="ach-slab__label">
        <span className="ach-slab__label-title">{title}</span>
        <span className="ach-slab__grade">
          {locked ? "—" : RARITY_GRADE[def.rarity]}
          <small>
            {locked
              ? translate("achievements.slab.sealed")
              : translate(`achievements.grades.${def.rarity}`)}
          </small>
        </span>
        <span>{`${translate("achievements.slab.series")} · ${rarityLabel}`}</span>
        <span>{`${set} · ${unlockedDate ?? translate("achievements.slab.notPulled")}`}</span>
      </span>

      <span className="ach-slab__well">
        <AchievementCardFace achievement={achievement} morphName={morphName} />
      </span>

      <span className="ach-slab__glare" />
    </span>
  )

  const shared = {
    className: cn("ach-slab block w-full text-left", className),
    "data-locked": locked,
    "data-rarity": def.rarity,
    style: { "--rarity": rarityColorVar(def.rarity) },
    ...tilt,
  }

  if (onInspect == null) {
    return <div {...shared}>{content}</div>
  }

  return (
    <button
      {...shared}
      aria-label={`${title} · ${rarityLabel} · ${
        locked
          ? translate("achievements.locked")
          : translate("achievements.unlocked")
      }`}
      className={cn(shared.className, "cursor-pointer")}
      onClick={onInspect}
      type="button"
    >
      {content}
    </button>
  )
}
