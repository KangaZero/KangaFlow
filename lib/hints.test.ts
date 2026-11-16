import { describe, expect, it } from "vitest"

import { HINT_ALPHABET, hintLabels } from "@/lib/hints"

describe("hintLabels", () => {
  it("returns exactly `count` labels", () => {
    for (const n of [0, 1, 3, 26, 27, 60, 700]) {
      expect(hintLabels(n)).toHaveLength(n)
    }
  })

  it("returns unique labels", () => {
    const labels = hintLabels(120)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("is prefix-free — no label is a prefix of another", () => {
    const labels = hintLabels(120)
    // One assertion over all pairs (14,400 expect() calls was slow enough to
    // time out under parallel CPU load); a failure lists the offending pairs.
    const prefixPairs = labels.flatMap((a) =>
      labels.filter((b) => a !== b && b.startsWith(a)).map((b) => `${a}→${b}`)
    )
    expect(prefixPairs).toEqual([])
  })

  it("uses single characters while they suffice", () => {
    const labels = hintLabels(5)
    expect(labels.every((label) => label.length === 1)).toBe(true)
  })

  it("only uses characters from the alphabet", () => {
    const allowed = new Set(HINT_ALPHABET)
    for (const label of hintLabels(120)) {
      for (const ch of label) expect(allowed.has(ch)).toBe(true)
    }
  })
})
