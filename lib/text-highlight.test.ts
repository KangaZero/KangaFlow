// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { splitAround } from "@/lib/text-highlight"

describe("splitAround", () => {
  it("splits around the first match", () => {
    expect(splitAround("Working at Accenture", "Accenture")).toEqual({
      after: "",
      before: "Working at ",
      match: "Accenture",
    })
    expect(splitAround("a-b-a", "a")).toEqual({
      after: "-b-a",
      before: "",
      match: "a",
    })
  })

  it("returns null when the term is absent or empty", () => {
    expect(splitAround("アクセンチュアに在職中", "Accenture")).toBeNull()
    expect(splitAround("anything", "")).toBeNull()
  })
})
