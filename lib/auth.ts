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
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  const hash = await sha256(pwd)
  localStorage.setItem(STORAGE_KEY, hash)
}

export async function verifyPassword(input: string): Promise<boolean> {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) return true
  if (!input) return false
  const hash = await sha256(input)
  return hash === stored
}

export function hasStoredPassword(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== null
}

export function clearStoredPassword(): void {
  localStorage.removeItem(STORAGE_KEY)
}
