// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { DEFAULT_THEME, isTheme, nextTheme, THEMES } from "@/lib/themes"

describe("themes", () => {
  it("cycles light -> dark -> terminal -> light", () => {
    expect(nextTheme("light")).toBe("dark")
    expect(nextTheme("dark")).toBe("terminal")
    expect(nextTheme("terminal")).toBe("light")
  })

  it("narrows known themes and rejects others", () => {
    expect(isTheme("dark")).toBe(true)
    expect(isTheme("solarized")).toBe(false)
    expect(isTheme(undefined)).toBe(false)
  })

  it("uses a default within the theme set", () => {
    expect(THEMES).toContain(DEFAULT_THEME)
  })
})
