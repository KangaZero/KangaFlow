// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { RANSOM_KINDS, ransomLetters } from "@/lib/ransom-letters"

const glyphs = (label: string) =>
  ransomLetters(label).flatMap((token) =>
    token.type === "glyph" ? [token] : []
  )

describe("ransomLetters", () => {
  it("is deterministic per label", () => {
    expect(ransomLetters("Achievements")).toEqual(ransomLetters("Achievements"))
    expect(ransomLetters("Home")).not.toEqual(
      ransomLetters("Homes").slice(0, 4)
    )
  })

  it("splits graphemes, not UTF-16 code units", () => {
    expect(glyphs("日本語").map((g) => g.char)).toEqual(["日", "本", "語"])
    expect(glyphs("👩‍💻!").map((g) => g.char)).toEqual(["👩‍💻", "!"])
  })

  it("turns whitespace into spaces and indexes glyphs only", () => {
    const tokens = ransomLetters("Go home")
    expect(tokens.map((t) => t.type)).toEqual([
      "glyph",
      "glyph",
      "space",
      "glyph",
      "glyph",
      "glyph",
      "glyph",
    ])
    expect(glyphs("Go home").map((g) => g.index)).toEqual([0, 1, 2, 3, 4, 5])
  })

  it("keeps every style value in range with unique keys", () => {
    const tokens = ransomLetters("The quick brown fox jumps over the lazy dog")
    expect(new Set(tokens.map((t) => t.key)).size).toBe(tokens.length)
    for (const g of glyphs("The quick brown fox jumps over the lazy dog")) {
      expect(RANSOM_KINDS).toContain(g.kind)
      expect(Math.abs(g.rotate)).toBeLessThanOrEqual(8)
      expect(Math.abs(g.dy)).toBeLessThanOrEqual(1.5)
      expect(g.size).toBeGreaterThanOrEqual(12)
      expect(g.size).toBeLessThanOrEqual(17)
    }
  })
})
