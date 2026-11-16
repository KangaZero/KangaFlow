// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure state for the environment lock screen: failed-attempt counting, the
// lockout window after too many failures, and the time-of-day greeting. No
// React/DOM so it is unit-testable. Lockout lives in memory only (a reload
// clears it) — this is a portfolio desktop, not a security boundary.

export const MAX_ATTEMPTS = 3
export const LOCKOUT_MS = 30_000

export type LockState = {
  /** Failed attempts since the last success / lockout expiry. */
  attempts: number
  /** Epoch ms when the lockout ends, or null when not locked out. */
  lockedUntil: number | null
}

export const INITIAL_LOCK: LockState = { attempts: 0, lockedUntil: null }

/** One more failed attempt; the MAX_ATTEMPTS-th starts the lockout. */
export function registerFailure(state: LockState, now: number): LockState {
  const attempts = state.attempts + 1
  return attempts >= MAX_ATTEMPTS
    ? { attempts, lockedUntil: now + LOCKOUT_MS }
    : { attempts, lockedUntil: null }
}

/** Remaining lockout in ms (0 when not locked out or already expired). */
export function lockRemainingMs(state: LockState, now: number): number {
  return state.lockedUntil === null ? 0 : Math.max(0, state.lockedUntil - now)
}

/** Back to a clean slate once an active lockout has run out. */
export function clearExpiredLock(state: LockState, now: number): LockState {
  return state.lockedUntil !== null && now >= state.lockedUntil
    ? INITIAL_LOCK
    : state
}

export const DAY_PARTS = ["morning", "afternoon", "evening"] as const
export type DayPart = (typeof DAY_PARTS)[number]

/** 05–10 morning, 11–16 afternoon, otherwise evening (local hour 0–23). */
export function dayPart(hour: number): DayPart {
  if (hour >= 5 && hour < 11) return "morning"
  if (hour >= 11 && hour < 17) return "afternoon"
  return "evening"
}
