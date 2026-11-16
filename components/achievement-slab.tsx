"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/achievement-slab.css"

import { Lock } from "lucide-react"

import { useCardTilt } from "@/hooks/use-card-tilt"
import { getAchievementLabels } from "@/lib/achievement-labels"
import {
  ACHIEVEMENTS,
  type Achievement,
  RARITY_GRADE,
  RARITY_ICON,
  rarityColorVar,
  rarityStars,
  setNumber,
} from "@/lib/achievements"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

const pad = (value: number) => String(value).padStart(2, "0")
const SET_TOTAL = pad(ACHIEVEMENTS.length)

type AchievementSlabProps = {
  achievement: Achievement
  isNew?: boolean
  /** When given, the slab is a button that opens the inspect view. */
  onInspect?: () => void
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
  className,
}: AchievementSlabProps) {
  const { locale, translate } = useLocale()
  const tilt = useCardTilt()
  const { def, hidden, title, description, rarityLabel } = getAchievementLabels(
    achievement,
    translate
  )
  const Icon = RARITY_ICON[def.rarity]
  const locked = !achievement.isUnlocked
  const setLabel = `#${pad(setNumber(achievement.id))}/${SET_TOTAL}`
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
        <span>{`${setLabel} · ${unlockedDate ?? translate("achievements.slab.notPulled")}`}</span>
      </span>

      <span className="ach-slab__well">
        <span
          className="ach-card"
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
                <Icon aria-hidden />
              </span>
              <span className="ach-card__body">{description}</span>
              <span className="ach-card__foot">
                <span>{setLabel}</span>
                <span className="ach-card__stars">
                  {rarityStars(def.rarity)}
                </span>
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
