// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { hashString, mulberry32 } from "@/lib/seeded-random"

describe("mulberry32", () => {
  it("produces values in [0, 1)", () => {
    const rand = mulberry32(123)
    for (let i = 0; i < 1000; i++) {
      const n = rand()
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThan(1)
    }
  })

  it("is deterministic — same seed reproduces the sequence, different seeds diverge", () => {
    const pull = (seed: number): number[] => {
      const rand = mulberry32(seed)
      return Array.from({ length: 5 }, () => rand())
    }

    expect(pull(99)).toEqual(pull(99))
    expect(pull(99)).not.toEqual(pull(100))
  })
})

describe("hashString", () => {
  it("is stable and unsigned for a given input", () => {
    expect(hashString("/en")).toBe(hashString("/en"))
    expect(hashString("/en")).toBeGreaterThanOrEqual(0)
  })
})
