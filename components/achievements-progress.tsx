"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useId } from "react"

import { AchievementClearSeal } from "@/components/achievement-clear-seal"
import { highestUnlockedRarity, rarityColorVar } from "@/lib/achievements"
import { cn } from "@/lib/utils"
import { useAchievements } from "@/providers/achievements-provider"
import { useLocale } from "@/providers/locale-provider"

/**
 * Overall unlock progress (all achievements, ignoring page filters) as a
 * segmented strip: a native <progress> whose fill uncovers a rarity ramp, an
 * n/total stamp inked in the rarest tier unlocked so far, and a hanko seal in
 * place of the stamp at 100%. The CSS inputs (--segments, --tier) are
 * derived here; the look lives in achievements-top.css.
 */
export function AchievementsProgress({ className }: { className?: string }) {
  const { achievements } = useAchievements()
  const { translate } = useLocale()
  const id = useId()

  const total = achievements.length
  const unlocked = achievements.filter((a) => a.isUnlocked).length
  const complete = total > 0 && unlocked === total
  const count = `${unlocked}/${total}`
  const tier = highestUnlockedRarity(achievements)

  return (
    <div
      className={cn("at-strip", className)}
      style={{
        "--segments": Math.max(total, 1),
        "--tier": tier ? rarityColorVar(tier) : undefined,
      }}
    >
      <label className="at-tag" htmlFor={id}>
        {translate("achievements.unlocked")}
      </label>
      <div className="at-strip-row">
        <progress
          aria-valuetext={count}
          className="at-progress"
          id={id}
          max={Math.max(total, 1)}
          value={unlocked}
        />
        {complete ? (
          <AchievementClearSeal count={count} />
        ) : (
          <span aria-hidden="true" className="at-stamp">
            {count}
          </span>
        )}
      </div>
    </div>
  )
}
