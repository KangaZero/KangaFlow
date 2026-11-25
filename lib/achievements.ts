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

// How an achievement unlocks. `mount|theme|reveal|webmcp` are the direct user
// triggers that count toward completion; `completion`/`speedrun` are derived;
// `oneko` is a terminal easter egg (`oneko toggle` off) kept OUT of completion so
// nobody has to be cruel to reach 100%; `locked` achievements have no in-app
// trigger yet (reachable only via unlock()).
export type AchievementTrigger =
  | "mount"
  | "theme"
  | "webmcp"
  | "reveal"
  | "completion"
  | "speedrun"
  | "oneko"
  | "locked"

export type AchievementDef = {
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
  {
    id: "social-stalker",
    rarity: "uncommon",
    secret: false,
    trigger: "reveal",
  },
  { id: "puzzle-master", rarity: "rare", secret: false, trigger: "locked" },
  { id: "out-of-bounds", rarity: "rare", secret: false, trigger: "locked" },
  { id: "bleeding-edge", rarity: "rare", secret: false, trigger: "webmcp" },
  { id: "sand-mandala", rarity: "legendary", secret: true, trigger: "locked" },
  {
    id: "go-touch-grass",
    rarity: "legendary",
    secret: false,
    trigger: "completion",
  },
  { id: "psychopath", rarity: "uncommon", secret: true, trigger: "oneko" },
  { id: "speedophile", rarity: "mythic", secret: true, trigger: "speedrun" },
] as const satisfies readonly AchievementDef[]

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"]

// Achievements whose unlock counts toward 100% (the direct user triggers).
export const COMPLETION_IDS: readonly AchievementId[] = ACHIEVEMENTS.filter(
  (achievement) =>
    achievement.trigger === "mount" ||
    achievement.trigger === "theme" ||
    achievement.trigger === "reveal" ||
    achievement.trigger === "webmcp"
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

// Collector "grade" printed on a slab label, one per rarity. Mirrors the PSA
// 1–10 scale purely for flavour; the label text lives in i18n
// (`achievements.grades.<rarity>`).
export const RARITY_GRADE = {
  common: 6,
  legendary: 9,
  mythic: 10,
  rare: 8,
  uncommon: 7,
} as const satisfies Record<Rarity, number>

// 1-based position in the catalogue, printed as "#03/10" on each card.
export function setNumber(id: AchievementId): number {
  return ACHIEVEMENTS.findIndex((achievement) => achievement.id === id) + 1
}

const padSet = (value: number) => String(value).padStart(2, "0")

/** "#03": the zero-padded set number alone (an empty binder slot). */
export function setNumberLabel(id: AchievementId): string {
  return `#${padSet(setNumber(id))}`
}

/** "#03/11": set number over catalogue size, both zero-padded to 2. */
export function setLabel(id: AchievementId): string {
  return `${setNumberLabel(id)}/${padSet(ACHIEVEMENTS.length)}`
}

// An unlock counts as "new" for this long after it happened.
export const NEW_UNLOCK_WINDOW_MS = 24 * 60 * 60 * 1000

export function isNewlyUnlocked(
  achievement: Achievement,
  now: number
): boolean {
  if (!achievement.isUnlocked) return false
  const age = now - Date.parse(achievement.unlockedAt)
  return age >= 0 && age < NEW_UNLOCK_WINDOW_MS
}

export const ACHIEVEMENT_SORTS = ["set", "rarity", "recent"] as const
export type AchievementSort = (typeof ACHIEVEMENT_SORTS)[number]

const unlockedTime = (achievement: Achievement): number =>
  achievement.isUnlocked ? Date.parse(achievement.unlockedAt) : -1

// Pure, non-mutating sort. `set` = catalogue order; `rarity` = rarest first;
// `recent` = latest unlock first, locked last. Ties fall back to set order.
export function sortAchievements(
  achievements: readonly Achievement[],
  sort: AchievementSort
): Achievement[] {
  const bySet = (a: Achievement, b: Achievement) =>
    setNumber(a.id) - setNumber(b.id)
  const compare: Record<
    AchievementSort,
    (a: Achievement, b: Achievement) => number
  > = {
    rarity: (a, b) =>
      RARITIES.indexOf(getAchievementDef(b.id).rarity) -
        RARITIES.indexOf(getAchievementDef(a.id).rarity) || bySet(a, b),
    recent: (a, b) => unlockedTime(b) - unlockedTime(a) || bySet(a, b),
    set: bySet,
  }
  return achievements.toSorted(compare[sort])
}

// Speedrun split (ms) as a stopwatch string, e.g. 58_420 → "0:58.42".
export function formatSplit(ms: number): string {
  const totalCentis = Math.max(0, Math.round(ms / 10))
  const minutes = Math.floor(totalCentis / 6000)
  const seconds = Math.floor((totalCentis % 6000) / 100)
  const centis = totalCentis % 100
  return `${minutes}:${String(seconds).padStart(2, "0")}.${String(centis).padStart(2, "0")}`
}

// Rarest tier among the unlocked achievements (RARITIES order), or undefined
// when nothing is unlocked. Tints the achievements page's progress stamp.
export function highestUnlockedRarity(
  achievements: readonly Achievement[]
): Rarity | undefined {
  return RARITIES.findLast((rarity) =>
    achievements.some(
      (achievement) =>
        achievement.isUnlocked &&
        getAchievementDef(achievement.id).rarity === rarity
    )
  )
}

// One star per rarity tier, derived from RARITIES order (common ★ … mythic ★★★★★).
export function rarityStars(rarity: Rarity): string {
  return "★".repeat(RARITIES.indexOf(rarity) + 1)
}

// How many achievements of each rarity exist in the catalogue (collection
// totals for "Rare 1/3"). Counts are derived from ACHIEVEMENTS; `satisfies`
// fails the build if a rarity is added without a row here (no cast needed,
// unlike Object.fromEntries which forgets the key type).
const countInCatalogue = (rarity: Rarity): number =>
  ACHIEVEMENTS.filter((achievement) => achievement.rarity === rarity).length

export const CATALOGUE_COUNT_BY_RARITY = {
  common: countInCatalogue("common"),
  legendary: countInCatalogue("legendary"),
  mythic: countInCatalogue("mythic"),
  rare: countInCatalogue("rare"),
  uncommon: countInCatalogue("uncommon"),
} as const satisfies Record<Rarity, number>
