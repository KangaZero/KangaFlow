// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { useCallback, useMemo, useSyncExternalStore } from "react"

import {
  parseRevealed,
  REVEALED_STORAGE_KEY,
  type RevealedMap,
  withRevealed,
} from "@/lib/achievement-reveal"
import type { Achievement } from "@/lib/achievements"
import { safeLocalStorage } from "@/lib/safe-storage"

// The snapshot is the raw stored string: a primitive, so React's Object.is
// check is stable without caching parsed objects. The server (prerender)
// sees nothing revealed; the client snapshot takes over after hydration.
const readRaw = (): string | null =>
  safeLocalStorage.getItem(REVEALED_STORAGE_KEY)
const readServer = (): string | null => null

function parseRaw(raw: string | null): RevealedMap {
  if (raw === null) return {}
  try {
    return parseRevealed(JSON.parse(raw))
  } catch {
    return {}
  }
}

/**
 * Which unlocks the visitor has flipped face-up (lib/achievement-reveal),
 * backed by localStorage through useSyncExternalStore, so every card and tab
 * reads the same value with no effect-driven copy.
 */
export function useRevealedAchievements(): {
  revealed: RevealedMap
  reveal: (achievement: Achievement) => void
} {
  const raw = useSyncExternalStore(
    safeLocalStorage.subscribe,
    readRaw,
    readServer
  )
  const revealed = useMemo(() => parseRaw(raw), [raw])
  const reveal = useCallback((achievement: Achievement) => {
    // Read storage, not the render's copy: two reveals in one frame must not
    // overwrite each other.
    safeLocalStorage.setJson(
      REVEALED_STORAGE_KEY,
      withRevealed(parseRaw(readRaw()), achievement)
    )
  }, [])
  return { reveal, revealed }
}
