// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Web Storage is not guaranteed to exist. Three failure modes matter here and a
// `typeof window` guard catches none of them:
//   1. Firefox with `dom.storage.enabled=false` throws SecurityError on the
//      `window.localStorage` *property access*, before any method is called.
//   2. A cross-origin iframe with third-party storage blocked (Chrome/Safari)
//      throws the same way.
//   3. Storage exists but `setItem` throws QuotaExceededError (Safari Lockdown
//      Mode, a full origin quota, or a large niri layout blob).
// So availability is probed once with a real write/read/remove round-trip and
// every access stays wrapped. When the native store is missing or a write is
// rejected we degrade to an in-memory Map: the app keeps working for the
// lifetime of the tab, it just stops surviving a reload.

type StorageKind = "local" | "session"

/**
 * Storage facade that never throws. Falls back to a per-tab in-memory map when
 * the native store is unavailable or a write is rejected.
 */
export type SafeStorage = {
  /** JSON read: parses, validates, and falls back on any failure. */
  getJson: <T>(
    key: string,
    fallback: T,
    validate: (raw: unknown) => T | null
  ) => T
  getItem: (key: string) => string | null
  /** False when values live in memory only (no native store, or a write failed). */
  isPersistent: () => boolean
  removeItem: (key: string) => void
  setItem: (key: string, value: string) => void
  /** JSON write: serialises and swallows circular-structure/quota failures. */
  setJson: (key: string, value: unknown) => void
  /** Fires on every mutation and on the transition to degraded mode. */
  subscribe: (listener: () => void) => () => void
}

// A real round-trip is the only reliable check: Safari's quota-0 private mode
// used to expose a working-looking `Storage` whose `setItem` always threw.
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API#testing_for_availability
const PROBE_KEY = "kangaflow:__storage_probe__"

function roundTripSucceeds(storage: Storage): boolean {
  storage.setItem(PROBE_KEY, PROBE_KEY)
  const echoed = storage.getItem(PROBE_KEY)
  storage.removeItem(PROBE_KEY)
  return echoed === PROBE_KEY
}

function createSafeStorage(kind: StorageKind): SafeStorage {
  const memory = new Map<string, string>()
  const listeners = new Set<() => void>()
  // null = not probed yet. Only the verdict is memoised, never the `Storage`
  // object itself — tests swap the global between cases, and a cached reference
  // would keep pointing at a stale store.
  let available: boolean | null = null
  let degraded = false

  const emit = (): void => {
    for (const listener of listeners) listener()
  }

  const nativeStorage = (): Storage | null => {
    // SSR / build-time render: absent, but never memoised — the same module
    // instance is not reused on the client.
    if (typeof window === "undefined") return null
    if (available === false) return null
    try {
      const storage =
        kind === "local" ? window.localStorage : window.sessionStorage
      if (available === null) available = roundTripSucceeds(storage)
      return available ? storage : null
    } catch {
      available = false
      return null
    }
  }

  const degrade = (): void => {
    if (degraded) return
    degraded = true
    emit()
  }

  // `memory` is an overlay, not a mirror: it only holds keys the native store
  // could not take, so it must win over a stale native value for the same key.
  const getItem = (key: string): string | null => {
    const overlaid = memory.get(key)
    if (overlaid !== undefined) return overlaid
    try {
      return nativeStorage()?.getItem(key) ?? null
    } catch {
      return null
    }
  }

  const setItem = (key: string, value: string): void => {
    const storage = nativeStorage()
    if (storage !== null) {
      try {
        storage.setItem(key, value)
        memory.delete(key)
        emit()
        return
      } catch {
        // Quota exceeded, or storage revoked mid-session.
        degrade()
      }
    }
    memory.set(key, value)
    emit()
  }

  const removeItem = (key: string): void => {
    memory.delete(key)
    try {
      nativeStorage()?.removeItem(key)
    } catch {
      degrade()
    }
    emit()
  }

  return {
    getItem,
    getJson: <T>(
      key: string,
      fallback: T,
      validate: (raw: unknown) => T | null
    ): T => {
      const raw = getItem(key)
      if (raw === null) return fallback
      try {
        return validate(JSON.parse(raw) as unknown) ?? fallback
      } catch {
        // Corrupt JSON — treat it as absent rather than propagating.
        return fallback
      }
    },
    isPersistent: () => nativeStorage() !== null && !degraded,
    removeItem,
    setItem,
    setJson: (key: string, value: unknown): void => {
      try {
        setItem(key, JSON.stringify(value))
      } catch {
        // Circular structure / BigInt — persisting is best-effort.
      }
    },
    subscribe: (listener: () => void): (() => void) => {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}

export const safeLocalStorage: SafeStorage = createSafeStorage("local")
export const safeSessionStorage: SafeStorage = createSafeStorage("session")

/** Validator for `getJson` when the stored value is a homogeneous array. */
export function asArrayOf<T>(
  isItem: (item: unknown) => item is T
): (raw: unknown) => T[] | null {
  return (raw) =>
    Array.isArray(raw) && raw.every(isItem) ? (raw as T[]) : null
}

export function isString(value: unknown): value is string {
  return typeof value === "string"
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number"
}
