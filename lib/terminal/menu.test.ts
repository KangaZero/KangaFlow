// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { MENU_MAX_ROWS, renderMenu } from "@/lib/terminal/menu"
import { hexToRgb, visibleLen } from "@/lib/terminal/prompt"
import { MOCHA } from "@/lib/terminal/theme"

const pages = ["home", "achievements", "timeline", "environment"]
const describe_ = (c: string): string => (c === "home" ? "~" : `~/${c}`)
const mauveBg = `48;2;${hexToRgb(MOCHA.mauve).join(";")}`

describe("renderMenu", () => {
  it("renders one aligned row per candidate with descriptions", () => {
    const rows = renderMenu(pages, 1, describe_, MOCHA)
    expect(rows).toHaveLength(pages.length)
    const widths = new Set(rows.map(visibleLen))
    expect(widths.size).toBe(1)
    expect(rows[1]).toContain("-- ~/achievements")
  })

  it("highlights only the selected row", () => {
    const rows = renderMenu(pages, 2, describe_, MOCHA)
    rows.forEach((row, i) => {
      expect(row.includes(mauveBg)).toBe(i === 2)
    })
  })

  it("omits the description column when nothing has one", () => {
    const rows = renderMenu(pages, 0, () => "", MOCHA)
    expect(rows.some((r) => r.includes("--"))).toBe(false)
  })

  it("falls back to a single line for long candidate lists", () => {
    const many = Array.from({ length: MENU_MAX_ROWS + 1 }, (_, i) => `c${i}`)
    const rows = renderMenu(many, 0, describe_, MOCHA)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toContain("c0  c1")
  })
})
