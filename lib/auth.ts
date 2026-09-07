import { safeLocalStorage } from "@/lib/safe-storage"

const STORAGE_KEY = "kangaflow:auth-hash"

async function sha256(str: string): Promise<string> {
  const bytes = new TextEncoder().encode(str)
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export async function setStoredPassword(pwd: string): Promise<void> {
  if (!pwd) {
    safeLocalStorage.removeItem(STORAGE_KEY)
    return
  }
  const hash = await sha256(pwd)
  safeLocalStorage.setItem(STORAGE_KEY, hash)
}

// No stored hash means no lock was ever set, so an empty input passes. With
// storage unavailable the hash lives in memory for the tab and is gone on
// reload — the desktop unlocks rather than locking the user out of a demo.
export async function verifyPassword(input: string): Promise<boolean> {
  const stored = safeLocalStorage.getItem(STORAGE_KEY)
  if (!stored) return true
  if (!input) return false
  const hash = await sha256(input)
  return hash === stored
}

export function hasStoredPassword(): boolean {
  return safeLocalStorage.getItem(STORAGE_KEY) !== null
}

export function clearStoredPassword(): void {
  safeLocalStorage.removeItem(STORAGE_KEY)
}
