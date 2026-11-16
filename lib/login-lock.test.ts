// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  clearExpiredLock,
  dayPart,
  INITIAL_LOCK,
  LOCKOUT_MS,
  lockRemainingMs,
  MAX_ATTEMPTS,
  registerFailure,
} from "@/lib/login-lock"

describe("lock screen attempts", () => {
  it("counts failures without locking until the last allowed attempt", () => {
    let s = INITIAL_LOCK
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      s = registerFailure(s, 1000)
      expect(s).toEqual({ attempts: i, lockedUntil: null })
    }
  })

  it("locks out on the MAX_ATTEMPTS-th failure for LOCKOUT_MS", () => {
    let s = INITIAL_LOCK
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerFailure(s, 5000)
    expect(s.lockedUntil).toBe(5000 + LOCKOUT_MS)
    expect(lockRemainingMs(s, 5000)).toBe(LOCKOUT_MS)
    expect(lockRemainingMs(s, 5000 + LOCKOUT_MS / 2)).toBe(LOCKOUT_MS / 2)
    expect(lockRemainingMs(s, 5000 + LOCKOUT_MS + 1)).toBe(0)
  })

  it("clears only once an active lockout has expired", () => {
    let s = INITIAL_LOCK
    for (let i = 0; i < MAX_ATTEMPTS; i++) s = registerFailure(s, 0)
    expect(clearExpiredLock(s, LOCKOUT_MS - 1)).toBe(s)
    expect(clearExpiredLock(s, LOCKOUT_MS)).toEqual(INITIAL_LOCK)
    const partial = registerFailure(INITIAL_LOCK, 0)
    expect(clearExpiredLock(partial, 10 ** 9)).toBe(partial)
  })

  it("reports no lockout time when not locked", () => {
    expect(lockRemainingMs(INITIAL_LOCK, 123)).toBe(0)
  })
})

describe("dayPart", () => {
  it("splits the day at 5, 11 and 17", () => {
    expect(dayPart(4)).toBe("evening")
    expect(dayPart(5)).toBe("morning")
    expect(dayPart(10)).toBe("morning")
    expect(dayPart(11)).toBe("afternoon")
    expect(dayPart(16)).toBe("afternoon")
    expect(dayPart(17)).toBe("evening")
    expect(dayPart(23)).toBe("evening")
    expect(dayPart(0)).toBe("evening")
  })
})
