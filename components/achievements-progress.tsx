"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Progress } from "@/components/animate-ui/components/radix/progress"
import { cn } from "@/lib/utils"
import { useAchievements } from "@/providers/achievements-provider"
import { useLocale } from "@/providers/locale-provider"

// Overall unlock progress (all achievements, ignoring page filters). Shared by
// the achievements page header and the unlock toast so the count/markup live in
// one place. The animate-ui indicator treats `value` as a 0–100 percentage and
// ignores `max`, so we pass the percentage and label the count via getValueLabel.
export function AchievementsProgress({ className }: { className?: string }) {
  const { achievements } = useAchievements()
  const { translate } = useLocale()

  const total = achievements.length
  const unlocked = achievements.filter((a) => a.isUnlocked).length
  const percent = total === 0 ? 0 : (unlocked / total) * 100
  const count = `${unlocked} / ${total}`

  return (
    <div className={cn("flex w-full flex-col gap-1.5", className)}>
      <div className="flex items-center justify-between text-muted-foreground text-xs">
        <span>{translate("achievements.unlocked")}</span>
        <span className="tabular-nums">{count}</span>
      </div>
      <Progress getValueLabel={() => count} value={percent} />
    </div>
  )
}
