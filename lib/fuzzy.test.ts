// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { fuzzyScore } from "@/lib/fuzzy"

describe("fuzzyScore", () => {
  it("matches a contiguous substring", () => {
    expect(fuzzyScore("dark", "Dark Mode")).not.toBeNull()
  })

  it("matches a non-contiguous subsequence in order", () => {
    expect(fuzzyScore("drkmd", "Dark Mode")).not.toBeNull()
  })

  it("rejects characters that appear out of order", () => {
    // 'm' then 'd': after 'm' in "mode" only "ode" remains, so no 'd'.
    expect(fuzzyScore("dm", "mode")).toBeNull()
  })

  it("rejects a query with characters the target lacks", () => {
    expect(fuzzyScore("xyz", "Dark Mode")).toBeNull()
  })

  it("is case-insensitive", () => {
    expect(fuzzyScore("DARK", "dark mode")).not.toBeNull()
  })

  it("treats an empty query as matching everything", () => {
    expect(fuzzyScore("", "anything")).toBe(0)
    expect(fuzzyScore("   ", "anything")).toBe(0)
  })

  it("ranks a tighter/earlier match above a looser one", () => {
    // Contiguous, at the start → beats a scattered later match.
    const tight = fuzzyScore("dark", "Dark Mode")
    const loose = fuzzyScore("dark", "Draw a spark")
    expect(tight).not.toBeNull()
    expect(loose).not.toBeNull()
    expect((tight ?? 0) > (loose ?? 0)).toBe(true)
  })

  it("rewards a word-boundary start", () => {
    const boundary = fuzzyScore("m", "Dark Mode") // 'm' starts a word
    const midword = fuzzyScore("m", "Camera") // 'm' mid-word
    expect((boundary ?? 0) > (midword ?? 0)).toBe(true)
  })
})
