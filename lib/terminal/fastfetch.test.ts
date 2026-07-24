import { describe, expect, it } from "vitest"

import { type FastfetchInfo, renderFastfetch } from "@/lib/terminal/fastfetch"

const info: FastfetchInfo = {
  browser: "Chrome",
  colors: 256,
  locale: "en",
  resolution: "1920x1080",
  themeLabel: "terminal (Catppuccin)",
  uptime: "3 mins",
}

describe("renderFastfetch", () => {
  it("returns a non-empty array of strings", () => {
    const lines = renderFastfetch(info)
    expect(Array.isArray(lines)).toBe(true)
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every((line) => typeof line === "string")).toBe(true)
  })

  it("includes the KangaFlow mark", () => {
    const lines = renderFastfetch(info)
    expect(lines.some((line) => line.includes("KangaFlow"))).toBe(true)
  })

  it("renders a Theme row", () => {
    const lines = renderFastfetch(info)
    expect(lines.some((line) => line.includes("Theme:"))).toBe(true)
  })
})
