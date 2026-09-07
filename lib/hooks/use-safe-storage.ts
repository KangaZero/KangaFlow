// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Read Web Storage from render without either of the two usual hazards: a
// throwing property access (see `lib/safe-storage`) and an SSR/hydration
// mismatch. `useSyncExternalStore`'s server snapshot is always `null`, matching
// the statically exported HTML; React re-reads the client snapshot after
// hydration and re-renders if it differs. `safeLocalStorage` notifies on every
// mutation, so two components sharing a key stay in sync within the tab.

import { useCallback, useSyncExternalStore } from "react"

import { type SafeStorage, safeLocalStorage } from "@/lib/safe-storage"

const serverSnapshot = (): null => null

/**
 * Live value of a storage key, or null when absent, unavailable, or on the
 * server. Never throws.
 */
export function useStoredString(
  key: string,
  storage: SafeStorage = safeLocalStorage
): string | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => storage.subscribe(onStoreChange),
    [storage]
  )
  const getSnapshot = useCallback(() => storage.getItem(key), [storage, key])

  return useSyncExternalStore(subscribe, getSnapshot, serverSnapshot)
}

/**
 * Whether writes actually survive a reload. False in private/blocked-storage
 * browsers and after a quota failure — useful for warning that settings are
 * session-only.
 */
export function useStorageIsPersistent(
  storage: SafeStorage = safeLocalStorage
): boolean {
  const subscribe = useCallback(
    (onStoreChange: () => void) => storage.subscribe(onStoreChange),
    [storage]
  )

  return useSyncExternalStore(
    subscribe,
    () => storage.isPersistent(),
    () => true
  )
}
