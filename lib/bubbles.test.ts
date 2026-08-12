// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  bubbleBackground,
  hashString,
  makeBubbles,
  mulberry32,
} from "@/lib/bubbles"

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

describe("makeBubbles", () => {
  it("honours an explicit count", () => {
    expect(makeBubbles(7, 5)).toHaveLength(5)
  })

  it("keeps percentage fields within their ranges", () => {
    for (const b of makeBubbles(42, 20)) {
      expect(b.leftPct).toBeGreaterThanOrEqual(0)
      expect(b.leftPct).toBeLessThanOrEqual(100)
      expect(b.bottomPct).toBeGreaterThanOrEqual(0)
      expect(b.bottomPct).toBeLessThanOrEqual(100)
    }
  })
})

describe("hashString", () => {
  it("is stable and unsigned for a given input", () => {
    expect(hashString("/en")).toBe(hashString("/en"))
    expect(hashString("/en")).toBeGreaterThanOrEqual(0)
  })
})

describe("bubbleBackground", () => {
  it("embeds the accent colour in the rim gradient", () => {
    expect(bubbleBackground("#39e6cf")).toContain("#39e6cf")
  })
})
