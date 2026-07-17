"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useAchievements } from "@/components/achievements-provider"
import { HeaderDate } from "@/components/header-date"

// Wires HeaderDate's decoupled `onReveal` hover callback to the Snoopy
// Detective achievement, keeping the date box itself unaware of achievements.
export function SnoopyDate() {
  const { unlockAchievement } = useAchievements()
  return <HeaderDate onReveal={() => unlockAchievement("snoopy-detective")} />
}
