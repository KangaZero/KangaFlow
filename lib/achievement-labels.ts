// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import {
  type Achievement,
  type AchievementDef,
  getAchievementDef,
} from "@/lib/achievements"
import type { Translate } from "@/lib/i18n"

export type AchievementLabels = {
  def: AchievementDef
  /** Secret and still locked: title, description and rarity are masked. */
  hidden: boolean
  title: string
  description: string
  rarityLabel: string
}

// The one place that decides what a visitor may see of an achievement. Shared by
// the slab, the details panel and search so a secret can never leak through one
// of them.
export function getAchievementLabels(
  achievement: Achievement,
  translate: Translate
): AchievementLabels {
  const def = getAchievementDef(achievement.id)
  const hidden = def.secret && !achievement.isUnlocked
  return {
    def,
    description: hidden
      ? translate("achievements.slab.secretHint")
      : translate(`achievements.items.${achievement.id}.description`),
    hidden,
    rarityLabel: hidden
      ? translate("achievements.slab.secret")
      : translate(`achievements.rarities.${def.rarity}`),
    title: hidden
      ? translate("achievements.hidden")
      : translate(`achievements.items.${achievement.id}.title`),
  }
}
