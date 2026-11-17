// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { DECRYPT_GLYPHS, decryptFrame, randomGlyph } from "@/lib/decrypt-text"
import { mulberry32 } from "@/lib/seeded-random"

describe("randomGlyph", () => {
  it("maps the random range onto the glyph set", () => {
    expect(randomGlyph(() => 0)).toBe(DECRYPT_GLYPHS.charAt(0))
    expect(randomGlyph(() => 0.999_999)).toBe(DECRYPT_GLYPHS.at(-1))
  })
})

describe("decryptFrame", () => {
  const random = mulberry32(1)

  it("returns the source untouched at progress 0 and below", () => {
    expect(decryptFrame("Frontend", "Backend", 0, random)).toBe("Frontend")
    expect(decryptFrame("Frontend", "Backend", -1, random)).toBe("Frontend")
  })

  it("returns exactly the target at progress 1 and above", () => {
    expect(decryptFrame("Frontend", "Backend", 1, random)).toBe("Backend")
    expect(decryptFrame("Frontend", "Backend", 2, random)).toBe("Backend")
  })

  it("reveals the target prefix and fills the rest with glyphs", () => {
    // n = 8 ("Frontend"), progress 0.5 → 4 characters revealed.
    const frame = decryptFrame("Frontend", "Backend", 0.5, random)
    expect(frame).toHaveLength(8)
    expect(frame.slice(0, 4)).toBe("Back")
    for (const char of frame.slice(4)) {
      expect(DECRYPT_GLYPHS).toContain(char)
    }
  })

  it("sheds the tail of a longer source once the reveal passes it", () => {
    // n = 8, progress 0.95 → 7 revealed: all of "Backend" plus one noise glyph.
    const frame = decryptFrame("Frontend", "Backend", 0.95, random)
    expect(frame.startsWith("Backend")).toBe(true)
    expect(frame).toHaveLength(8)
  })
})
