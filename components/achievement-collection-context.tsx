"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { createContext, type ReactNode, use } from "react"

import type { UnlockFx } from "@/components/achievement-unlock-fx"
import type { RevealedMap } from "@/lib/achievement-reveal"
import type { Achievement, AchievementId } from "@/lib/achievements"

export type AchievementCollection = {
  /** Site animation setting folded with the OS preference. */
  reduced: boolean
  /** Canvas impact layer (sparks + rings) shared with the unlock toast. */
  fx: UnlockFx
  revealed: RevealedMap
  markRevealed: (achievement: Achievement) => void
  /** The card currently open in the inspect dialog (its morph target). */
  inspectedId: AchievementId | null
  inspect: (id: AchievementId) => void
  /** Ids that pass the search + rarity filter; the rest render dimmed. */
  visible: ReadonlySet<AchievementId>
}

const CollectionContext = createContext<AchievementCollection | null>(null)

/** Everything the three layouts and their cards share, without prop drilling. */
export function AchievementCollectionProvider({
  value,
  children,
}: {
  value: AchievementCollection
  children: ReactNode
}) {
  return <CollectionContext value={value}>{children}</CollectionContext>
}

export function useAchievementCollection(): AchievementCollection {
  const value = use(CollectionContext)
  if (value === null)
    throw new Error(
      "useAchievementCollection must be used inside AchievementCollectionProvider"
    )
  return value
}
