// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { afterEach, describe, expect, it, vi } from "vitest"

import type { SafeStorage } from "@/lib/safe-storage"

// The availability verdict is memoised per module instance, so each scenario
// needs a fresh import after the global has been swapped.
async function freshLocalStorage(): Promise<SafeStorage> {
  vi.resetModules()
  const mod = await import("@/lib/safe-storage")
  return mod.safeLocalStorage
}

function memoryBackedStorage(overrides: Partial<Storage> = {}): Storage {
  const store = new Map<string, string>()
  return {
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
    removeItem: (k) => store.delete(k),
    setItem: (k, v) => store.set(k, v),
    ...overrides,
  }
}

// Firefox with storage disabled, and blocked third-party iframes, throw here —
// on the property access, not on a method call.
function throwOnAccess(): void {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get() {
      throw new DOMException("access denied", "SecurityError")
    },
  })
}

afterEach(() => {
  vi.unstubAllGlobals()
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: memoryBackedStorage(),
    writable: true,
  })
})

describe("safeLocalStorage with a working native store", () => {
  it("round-trips strings and JSON", async () => {
    vi.stubGlobal("localStorage", memoryBackedStorage())
    const storage = await freshLocalStorage()

    storage.setItem("a", "1")
    expect(storage.getItem("a")).toBe("1")

    storage.setJson("b", [1, 2, 3])
    expect(
      storage.getJson<number[]>("b", [], (raw) =>
        Array.isArray(raw) ? (raw as number[]) : null
      )
    ).toEqual([1, 2, 3])

    expect(storage.isPersistent()).toBe(true)
  })

  it("removes from the native store", async () => {
    vi.stubGlobal("localStorage", memoryBackedStorage())
    const storage = await freshLocalStorage()

    storage.setItem("a", "1")
    storage.removeItem("a")
    expect(storage.getItem("a")).toBeNull()
  })

  it("falls back when the stored JSON is corrupt", async () => {
    vi.stubGlobal("localStorage", memoryBackedStorage())
    const storage = await freshLocalStorage()

    storage.setItem("a", "{ not json")
    expect(storage.getJson("a", "fallback", () => "parsed")).toBe("fallback")
  })

  it("falls back when the validator rejects the shape", async () => {
    vi.stubGlobal("localStorage", memoryBackedStorage())
    const storage = await freshLocalStorage()

    storage.setJson("a", { unexpected: true })
    expect(storage.getJson("a", "fallback", () => null)).toBe("fallback")
  })

  it("notifies subscribers on every mutation", async () => {
    vi.stubGlobal("localStorage", memoryBackedStorage())
    const storage = await freshLocalStorage()
    const listener = vi.fn()

    const unsubscribe = storage.subscribe(listener)
    storage.setItem("a", "1")
    storage.removeItem("a")
    expect(listener).toHaveBeenCalledTimes(2)

    unsubscribe()
    storage.setItem("a", "2")
    expect(listener).toHaveBeenCalledTimes(2)
  })
})

describe("safeLocalStorage when the native store is unavailable", () => {
  it("keeps working in memory when the property access throws", async () => {
    throwOnAccess()
    const storage = await freshLocalStorage()

    expect(storage.isPersistent()).toBe(false)
    expect(storage.getItem("missing")).toBeNull()

    storage.setJson("a", { hello: "world" })
    expect(
      storage.getJson<{ hello: string } | null>("a", null, (raw) =>
        raw && typeof raw === "object" ? (raw as { hello: string }) : null
      )
    ).toEqual({ hello: "world" })
  })

  it("treats a store that fails its write probe as unavailable", async () => {
    // Safari's historic quota-0 private mode: looks like a Storage, never writes.
    vi.stubGlobal(
      "localStorage",
      memoryBackedStorage({
        setItem: () => {
          throw new DOMException("quota", "QuotaExceededError")
        },
      })
    )
    const storage = await freshLocalStorage()

    expect(storage.isPersistent()).toBe(false)
    storage.setItem("a", "1")
    expect(storage.getItem("a")).toBe("1")
  })

  it("degrades to memory when a write is rejected mid-session", async () => {
    let acceptWrites = true
    const backing = memoryBackedStorage()
    vi.stubGlobal(
      "localStorage",
      memoryBackedStorage({
        getItem: (k) => backing.getItem(k),
        removeItem: (k) => backing.removeItem(k),
        setItem: (k, v) => {
          if (!acceptWrites)
            throw new DOMException("quota", "QuotaExceededError")
          backing.setItem(k, v)
        },
      })
    )
    const storage = await freshLocalStorage()

    storage.setItem("a", "native")
    expect(storage.isPersistent()).toBe(true)

    acceptWrites = false
    storage.setItem("a", "overlay")

    // The overlay wins over the now-stale native value, and the store reports
    // that nothing further will survive a reload.
    expect(storage.getItem("a")).toBe("overlay")
    expect(storage.isPersistent()).toBe(false)
  })
})
