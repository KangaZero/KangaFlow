"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { ViewTransition } from "react"

import { AchievementArt } from "@/components/achievement-art"
import { AchievementClearSeal } from "@/components/achievement-clear-seal"
import { AchievementCollectionCard } from "@/components/achievement-collection-card"
import { useAchievementCollection } from "@/components/achievement-collection-context"
import { getAchievementLabels } from "@/lib/achievement-labels"
import {
  type Achievement,
  rarityColorVar,
  setNumberLabel,
} from "@/lib/achievements"
import { interpolate } from "@/lib/i18n"
import { useLocale } from "@/providers/locale-provider"

/** A locked achievement's pocket: the printed checklist slot it will fill. */
function AchievementSlot({ achievement }: { achievement: Achievement }) {
  const { translate } = useLocale()
  const { def, hidden, description, rarityLabel } = getAchievementLabels(
    achievement,
    translate
  )
  return (
    <div className="acl-slot" style={{ "--rc": rarityColorVar(def.rarity) }}>
      <span className="acl-slot-no">{setNumberLabel(achievement.id)}</span>
      <span className="acl-slot-rarity">{rarityLabel}</span>
      {hidden ? (
        <span aria-hidden="true" className="acl-slot-q">
          ?
        </span>
      ) : (
        <AchievementArt id={achievement.id} />
      )}
      <span className="acl-slot-hint">{description}</span>
    </div>
  )
}

/**
 * Layout A: a binder page of sleeve pockets in the chosen sort. Owned cards
 * sit in their pockets, locked ones leave the printed slot showing, and the
 * last pocket is the set plaque that takes the CLEAR seal at 100%.
 */
export function AchievementBinder({
  achievements,
}: {
  achievements: readonly Achievement[]
}) {
  const { translate } = useLocale()
  const { visible } = useAchievementCollection()
  const total = achievements.length
  const owned = achievements.filter(
    (achievement) => achievement.isUnlocked
  ).length
  const count = `${owned}/${total}`

  return (
    <div className="acl-binder">
      <div className="acl-binder-head">
        <b>{`${translate("achievements.slab.series")} · ${translate("achievements.layouts.binder")}`}</b>
        <span>{count}</span>
      </div>
      <ol className="acl-pockets">
        {achievements.map((achievement) => (
          // Keyed boundary = list identity: a sort change (a Transition)
          // glides each pocket to its new place.
          <ViewTransition key={achievement.id}>
            <li
              className="acl-pocket acl-deal"
              data-dimmed={visible.has(achievement.id) ? undefined : ""}
            >
              {achievement.isUnlocked ? (
                <AchievementCollectionCard achievement={achievement} />
              ) : (
                <AchievementSlot achievement={achievement} />
              )}
            </li>
          </ViewTransition>
        ))}
        <li className="acl-pocket acl-deal">
          <div className="acl-plaque">
            {owned === total && total > 0 ? (
              <AchievementClearSeal count={count} />
            ) : (
              <>
                <b>{count}</b>
                <small>
                  {interpolate(translate("achievements.collection.remaining"), {
                    count: total - owned,
                  })}
                </small>
              </>
            )}
          </div>
        </li>
      </ol>
    </div>
  )
}
