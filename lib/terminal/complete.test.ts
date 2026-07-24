import { describe, expect, it } from "vitest"

import { completeLine, suggestLine } from "@/lib/terminal/complete"

const FILES = ["app/page.tsx", "app/layout.tsx", "lib/themes.ts"]

describe("completeLine", () => {
  it("completes command names on the first token", () => {
    const result = completeLine("c", FILES)
    expect(result.candidates).toEqual(["cat", "clear", "code"])
    expect(result.commonPrefix).toBe("c")
    expect(result.word).toBe("c")
  })

  it("returns a single unique command match", () => {
    expect(completeLine("wh", FILES).candidates).toEqual(["whoami"])
  })

  it("completes file arguments for file commands", () => {
    const result = completeLine("nvim app/", FILES)
    expect(result.candidates).toEqual(["app/layout.tsx", "app/page.tsx"])
    expect(result.commonPrefix).toBe("app/")
    expect(result.wordStart).toBe("nvim ".length)
  })

  it("completes theme names for the theme command", () => {
    expect(completeLine("theme te", FILES).candidates).toEqual(["terminal"])
  })

  it("returns no candidates for commands without argument completion", () => {
    expect(completeLine("whoami ", FILES).candidates).toEqual([])
  })
})

describe("suggestLine", () => {
  it("suggests a unique command with a trailing space", () => {
    expect(suggestLine("wh", FILES, [])).toBe("whoami ")
  })

  it("returns null when the match is ambiguous with no shared extension", () => {
    // cat / clear / code all share only "c" (== the word) → nothing to suggest.
    expect(suggestLine("c", FILES, [])).toBeNull()
  })

  it("prefers a recent matching history entry", () => {
    expect(suggestLine("ca", FILES, ["ls", "cat app/page.tsx"])).toBe(
      "cat app/page.tsx"
    )
  })

  it("suggests a unique file argument", () => {
    expect(suggestLine("nvim lib/", FILES, [])).toBe("nvim lib/themes.ts ")
  })

  it("returns null for an empty line", () => {
    expect(suggestLine("", FILES, [])).toBeNull()
  })
})
