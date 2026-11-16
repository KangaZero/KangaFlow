// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { passedCount, stepIndex } from "@/lib/timeline"

describe("stepIndex", () => {
  it("steps within range", () => {
    expect(stepIndex(2, 1, 5)).toBe(3)
    expect(stepIndex(2, -1, 5)).toBe(1)
  })

  it("does not wrap past either end", () => {
    expect(stepIndex(0, -1, 5)).toBeNull()
    expect(stepIndex(4, 1, 5)).toBeNull()
  })
})

describe("passedCount", () => {
  const starts = [0, 0.22, 0.45, 0.67, 0.88]

  it("counts entries the spine has reached", () => {
    expect(passedCount(starts, 0)).toBe(1)
    expect(passedCount(starts, 0.5)).toBe(3)
    expect(passedCount(starts, 1)).toBe(5)
  })

  it("treats an exact boundary as reached", () => {
    expect(passedCount(starts, 0.45)).toBe(3)
  })

  it("handles an empty list", () => {
    expect(passedCount([], 0.7)).toBe(0)
  })
})
