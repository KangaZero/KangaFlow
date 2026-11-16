import { describe, expect, it } from "vitest"

import {
  type FastfetchInfo,
  LOGO_WIDTH,
  logoPixels,
  renderFastfetch,
} from "@/lib/terminal/fastfetch"

const info: FastfetchInfo = {
  browser: "Chrome",
  colors: 256,
  dark: true,
  locale: "en",
  resolution: "1920x1080",
  themeLabel: "terminal (Catppuccin)",
  uptime: "3 mins",
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: stripping ANSI ESC sequences is the intent.
const ANSI = /\x1b\[[0-9;]*m/g
const plain = (s: string): string => s.replace(ANSI, "")

describe("renderFastfetch", () => {
  it("returns a non-empty array of strings", () => {
    const lines = renderFastfetch(info)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every((line) => typeof line === "string")).toBe(true)
  })

  it("includes the user@host title and the info rows", () => {
    const text = renderFastfetch(info).map(plain).join("\n")
    expect(text).toContain("kangazero@kangaflow")
    expect(text).toContain("KangaFlow-Nix")
    expect(text).toMatch(/Theme\s+terminal \(Catppuccin\)/)
  })

  it("never writes block-element or box-drawing glyphs (DOM-renderer width bug)", () => {
    for (const line of renderFastfetch(info)) {
      for (const ch of line) {
        const cp = ch.codePointAt(0) ?? 0
        expect(cp >= 0x2500 && cp <= 0x259f).toBe(false)
      }
    }
  })

  it("keeps every logo row exactly LOGO_WIDTH cells, so the info column aligns", () => {
    const lines = renderFastfetch(info)
    const pixels = logoPixels()
    for (let i = 0; i < pixels.length; i++) {
      const visible = [...plain(lines[i] ?? "")]
      // the logo column is the first LOGO_WIDTH cells; anything after is the gap + info
      expect(visible.length).toBeGreaterThanOrEqual(LOGO_WIDTH)
      if (visible.length > LOGO_WIDTH) {
        expect(visible.slice(LOGO_WIDTH, LOGO_WIDTH + 4).join("")).toBe("    ")
      }
    }
  })

  it("picks different accent colours per flavour (Mocha vs Latte)", () => {
    const dark = renderFastfetch({ ...info, dark: true }).join("")
    const light = renderFastfetch({ ...info, dark: false }).join("")
    expect(dark).not.toBe(light)
  })
})

describe("logoPixels", () => {
  it("is a rectangular grid LOGO_WIDTH wide", () => {
    const grid = logoPixels()
    expect(grid.length).toBeGreaterThan(10)
    for (const row of grid) expect(row).toHaveLength(LOGO_WIDTH)
  })

  it("stamps KF (value 2) inside the centre hole, not over the snowflake", () => {
    const grid = logoPixels()
    const letterCells = grid.flat().filter((p) => p === 2).length
    // K and F are 3×5 pixel letters: 10 + 8 lit pixels
    expect(letterCells).toBe(18)
    const midRow = grid[Math.floor(grid.length / 2)] ?? []
    expect(midRow.includes(2)).toBe(true)
  })
})
