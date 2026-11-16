// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { afterEach, describe, expect, it } from "vitest"

import {
  AVATAR_PEAK_WINDOW_MS,
  avatarEnteredAtTime,
  boopLabel,
  clearAvatarEntered,
  leadDelayMs,
  markAvatarEntered,
} from "@/lib/hero-interaction"

describe("leadDelayMs", () => {
  it("is 0 when the avatar is not active", () => {
    expect(leadDelayMs(null, 1000)).toBe(0)
  })

  it("waits out the rest of the avatar's peak window", () => {
    expect(leadDelayMs(1000, 1000)).toBe(AVATAR_PEAK_WINDOW_MS)
    expect(leadDelayMs(1000, 1100)).toBe(AVATAR_PEAK_WINDOW_MS - 100)
  })

  it("is 0 once the window has passed (or the clock went backwards)", () => {
    expect(leadDelayMs(1000, 1000 + AVATAR_PEAK_WINDOW_MS)).toBe(0)
    expect(leadDelayMs(1000, 5000)).toBe(0)
    expect(leadDelayMs(1000, 900)).toBe(0)
  })

  it("respects a custom window and rounds to whole ms", () => {
    expect(leadDelayMs(0, 10.4, 100)).toBe(90)
  })
})

describe("boopLabel", () => {
  it("formats the counter with the localized word", () => {
    expect(boopLabel("BOOP", 3)).toBe("BOOP ×3")
    expect(boopLabel("ツン", 1)).toBe("ツン ×1")
  })

  it("never shows zero, negatives or fractions", () => {
    expect(boopLabel("BOOP", 0)).toBe("BOOP ×1")
    expect(boopLabel("BOOP", 2.7)).toBe("BOOP ×2")
  })
})

describe("avatar entered clock", () => {
  afterEach(clearAvatarEntered)

  it("records and clears the entrance time", () => {
    expect(avatarEnteredAtTime()).toBeNull()
    markAvatarEntered(1234)
    expect(avatarEnteredAtTime()).toBe(1234)
    clearAvatarEntered()
    expect(avatarEnteredAtTime()).toBeNull()
  })
})
