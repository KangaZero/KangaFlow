// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { Award, Gem, type LucideIcon, Medal, Star, Trophy } from "lucide-react"

// Single source of truth for the achievement catalogue. Titles/descriptions are
// NOT here — they live in i18n under `achievements.items.<id>` so every label is
// translatable. This module owns structure, rarity, and how each unlocks.

export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "legendary",
  "mythic",
] as const
export type Rarity = (typeof RARITIES)[number]

// How an achievement unlocks. `mount|theme|reveal` are the direct user triggers
// that count toward completion; `completion`/`speedrun` are derived; `locked`
// achievements have no in-app trigger yet (reachable only via unlock()).
export type AchievementTrigger =
  | "mount"
  | "theme"
  | "reveal"
  | "completion"
  | "speedrun"
  | "locked"

type AchievementDef = {
  id: string
  rarity: Rarity
  trigger: AchievementTrigger
  // Secret achievements render as "???" until unlocked.
  secret: boolean
}

export const ACHIEVEMENTS = [
  { id: "new-beginnings", rarity: "common", secret: false, trigger: "mount" },
  { id: "eos", rarity: "common", secret: false, trigger: "theme" },
  {
    id: "snoopy-detective",
    rarity: "uncommon",
    secret: false,
    trigger: "reveal",
  },
  { id: "puzzle-master", rarity: "rare", secret: false, trigger: "locked" },
  { id: "out-of-bounds", rarity: "rare", secret: false, trigger: "locked" },
  { id: "sand-mandala", rarity: "legendary", secret: true, trigger: "locked" },
  {
    id: "go-touch-grass",
    rarity: "legendary",
    secret: false,
    trigger: "completion",
  },
  { id: "speedophile", rarity: "mythic", secret: true, trigger: "speedrun" },
] as const satisfies readonly AchievementDef[]

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"]

// Achievements whose unlock counts toward 100% (the direct user triggers).
export const COMPLETION_IDS: readonly AchievementId[] = ACHIEVEMENTS.filter(
  (achievement) =>
    achievement.trigger === "mount" ||
    achievement.trigger === "theme" ||
    achievement.trigger === "reveal"
).map((achievement) => achievement.id)

// Unlock everything in under this window to earn "Speedophile".
export const SPEEDRUN_THRESHOLD_MS = 67_000

// Discriminated union of persisted runtime state. `unlockedAt` is an ISO string
// (survives JSON); `split` (the speedrun time) exists only on an unlocked
// Speedophile.
type Locked = { isUnlocked: false }
type Unlocked = { isUnlocked: true; unlockedAt: string }

export type Achievement =
  | ({ id: Exclude<AchievementId, "speedophile"> } & (Locked | Unlocked))
  | ({ id: "speedophile" } & (Locked | (Unlocked & { split: number })))

export function createInitialAchievements(): Achievement[] {
  return ACHIEVEMENTS.map((achievement) => ({
    id: achievement.id,
    isUnlocked: false,
  }))
}

// Build the unlocked variant for an id (Speedophile carries its `split` time).
export function makeUnlocked(
  id: AchievementId,
  unlockedAt: string,
  split = 0
): Achievement {
  return id === "speedophile"
    ? { id, isUnlocked: true, split, unlockedAt }
    : { id, isUnlocked: true, unlockedAt }
}

// Pure unlock transition. Returns the SAME array reference (a no-op) when the id
// is unknown or already unlocked — that identity is the dedupe signal callers
// rely on. Otherwise returns a new array with that achievement unlocked.
export function applyUnlock(
  achievements: Achievement[],
  id: AchievementId,
  unlockedAt: string,
  split = 0
): Achievement[] {
  const existing = achievements.find((achievement) => achievement.id === id)
  if (existing == null || existing.isUnlocked) {
    return achievements
  }
  const unlocked = makeUnlocked(id, unlockedAt, split)
  return achievements.map((achievement) =>
    achievement.id === id ? unlocked : achievement
  )
}

// Merge stored state onto the current catalogue: keep unlock state for known
// ids, drop removed ones, add newly-defined achievements as locked.
export function reconcile(stored: Achievement[]): Achievement[] {
  return createInitialAchievements().map(
    (base) => stored.find((achievement) => achievement.id === base.id) ?? base
  )
}

export function getAchievementDef(id: AchievementId): AchievementDef {
  const def = ACHIEVEMENTS.find((achievement) => achievement.id === id)
  if (def == null) {
    throw new Error(`Unknown achievement id: ${id}`)
  }
  return def
}

export const RARITY_ICON: Record<Rarity, LucideIcon> = {
  common: Award,
  legendary: Star,
  mythic: Gem,
  rare: Trophy,
  uncommon: Medal,
}

// Rarity colours live as CSS custom properties in globals.css (single source);
// this just references the token so nothing is a hard-coded hex.
export function rarityColorVar(rarity: Rarity): string {
  return `var(--rarity-${rarity})`
}
