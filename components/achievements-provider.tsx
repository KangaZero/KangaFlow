"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useTheme } from "next-themes"
import * as React from "react"

import {
  type Achievement,
  type AchievementId,
  applyUnlock,
  COMPLETION_IDS,
  createInitialAchievements,
  getAchievementDef,
  type Rarity,
  reconcile,
  SPEEDRUN_THRESHOLD_MS,
} from "@/lib/achievements"

const STORAGE_KEY = "kangaflow.achievements"

// Overloaded so only Speedophile takes (and requires) a split time.
type UnlockArgs =
  | [id: "speedophile", split: number]
  | [id: Exclude<AchievementId, "speedophile">]

type AchievementsContextValue = {
  achievements: Achievement[]
  countByRarity: Record<Rarity, number>
  unlockAchievement: (...args: UnlockArgs) => void
  currentUnlocked: Achievement | null
  dismissCurrent: () => void
}

const AchievementsContext =
  React.createContext<AchievementsContextValue | null>(null)

function isAchievementArray(value: unknown): value is Achievement[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "isUnlocked" in item &&
        typeof (item as { isUnlocked: unknown }).isUnlocked === "boolean"
    )
  )
}

export function AchievementsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const { theme } = useTheme()
  const [achievements, setAchievements] = React.useState<Achievement[]>(
    createInitialAchievements
  )
  const [currentUnlocked, setCurrentUnlocked] =
    React.useState<Achievement | null>(null)
  const [hydrated, setHydrated] = React.useState(false)

  // Latest achievements, readable synchronously inside stable callbacks.
  const achievementsRef = React.useRef(achievements)
  achievementsRef.current = achievements

  const unlockAchievement = React.useCallback((...args: UnlockArgs) => {
    const [id, split] = args
    const previous = achievementsRef.current
    const next = applyUnlock(previous, id, new Date().toISOString(), split)
    // applyUnlock returns the same reference when it's a no-op (unknown or
    // already unlocked) — that's the dedupe.
    if (next === previous) {
      return
    }
    // Update the ref eagerly so several unlocks fired in one tick each build on
    // the latest list instead of racing on stale state.
    achievementsRef.current = next
    setAchievements(next)
    setCurrentUnlocked(
      next.find((achievement) => achievement.id === id) ?? null
    )
  }, [])

  const dismissCurrent = React.useCallback(() => {
    setCurrentUnlocked(null)
  }, [])

  // Hydrate from localStorage once on mount (avoids an SSR/first-paint mismatch
  // by starting from the locked baseline, then loading).
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (raw != null) {
        const parsed: unknown = JSON.parse(raw)
        if (isAchievementArray(parsed)) {
          setAchievements(reconcile(parsed))
        }
      }
    } catch {
      // Corrupt storage → keep the locked baseline.
    }
    setHydrated(true)
  }, [])

  // Persist after hydration so we never overwrite storage with the baseline.
  React.useEffect(() => {
    if (!hydrated) {
      return
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(achievements))
  }, [achievements, hydrated])

  // Trigger: New Beginnings on first mount (after hydration, so returning
  // visitors are deduped and see no toast).
  React.useEffect(() => {
    if (hydrated) {
      unlockAchievement("new-beginnings")
    }
  }, [hydrated, unlockAchievement])

  // Trigger: Eos when the theme actually changes (not on the initial resolve).
  const previousTheme = React.useRef<string | undefined>(undefined)
  React.useEffect(() => {
    if (theme === undefined) {
      return
    }
    if (previousTheme.current === undefined) {
      previousTheme.current = theme
      return
    }
    if (theme !== previousTheme.current) {
      previousTheme.current = theme
      unlockAchievement("eos")
    }
  }, [theme, unlockAchievement])

  // Trigger: Go Touch Grass (100%) + Speedophile (fast 100%).
  React.useEffect(() => {
    const completion = achievements.filter((achievement) =>
      COMPLETION_IDS.includes(achievement.id)
    )
    const allUnlocked =
      completion.length > 0 &&
      completion.every((achievement) => achievement.isUnlocked)
    const grass = achievements.find(
      (achievement) => achievement.id === "go-touch-grass"
    )
    if (!allUnlocked || grass == null || grass.isUnlocked) {
      return
    }
    unlockAchievement("go-touch-grass")
    const times: number[] = []
    for (const achievement of completion) {
      if (achievement.isUnlocked) {
        times.push(new Date(achievement.unlockedAt).getTime())
      }
    }
    const span = Math.max(...times) - Math.min(...times)
    if (span < SPEEDRUN_THRESHOLD_MS) {
      unlockAchievement("speedophile", span)
    }
  }, [achievements, unlockAchievement])

  const countByRarity = React.useMemo<Record<Rarity, number>>(() => {
    const counts: Record<Rarity, number> = {
      common: 0,
      legendary: 0,
      mythic: 0,
      rare: 0,
      uncommon: 0,
    }
    for (const achievement of achievements) {
      if (achievement.isUnlocked) {
        counts[getAchievementDef(achievement.id).rarity] += 1
      }
    }
    return counts
  }, [achievements])

  const value = React.useMemo<AchievementsContextValue>(
    () => ({
      achievements,
      countByRarity,
      currentUnlocked,
      dismissCurrent,
      unlockAchievement,
    }),
    [
      achievements,
      countByRarity,
      unlockAchievement,
      currentUnlocked,
      dismissCurrent,
    ]
  )

  return (
    <AchievementsContext.Provider value={value}>
      {children}
    </AchievementsContext.Provider>
  )
}

export function useAchievements(): AchievementsContextValue {
  const context = React.useContext(AchievementsContext)
  if (context == null) {
    throw new Error(
      "useAchievements must be used within an AchievementsProvider"
    )
  }
  return context
}
