import { describe, expect, it } from "vitest"
import {
  buildPrompt,
  buildTransientPrompt,
  DROP_ORDER,
  fitPromptLine,
  formatDuration,
  hexToRgb,
  PROMPT_LINES,
  type PromptCtx,
  visibleLen,
} from "@/lib/terminal/prompt"
import { LATTE, MOCHA } from "@/lib/terminal/theme"

const base: PromptCtx = {
  cols: 160,
  cores: 8,
  cwd: "~/timeline",
  execMs: 12,
  now: new Date("2025-01-06T15:04:05"), // a Monday
  os: "nixos",
  palette: MOCHA,
  ramGB: 16,
}

const rgb = (hex: string): string => hexToRgb(hex).join(";")
// Codepoints the symbols-nerd.woff2 subset actually contains.
const SUBSET = new Set([
  0xe0b0, 0xe0b2, 0xe266, 0xe5ff, 0xe62a, 0xe712, 0xe725, 0xf073, 0xf179,
  0xf17b, 0xf313, 0xf489,
])

describe("buildPrompt", () => {
  it("shows every info segment on a wide terminal", () => {
    const { block } = buildPrompt(base)
    for (const text of [
      "KangaZero",
      "zsh",
      "~/timeline",
      "KangaZero/KangaFlow",
      "main",
      "CPU 8",
      "RAM 16GB",
      "12ms",
      "3:04:05 PM | Monday",
      "»",
    ]) {
      expect(block).toContain(text)
    }
  })

  it("is PROMPT_LINES lines and the input line is the » prefix", () => {
    const { block, inputPrefix } = buildPrompt(base)
    expect(block.split("\r\n")).toHaveLength(PROMPT_LINES)
    expect(block.endsWith(inputPrefix)).toBe(true)
  })

  it("never emits box/block/powerline glyphs (only spaces + subset icons)", () => {
    const { block } = buildPrompt(base)
    // The DOM renderer draws glyphs from the latin font subset, which omits
    // box-drawing, block elements and powerline separators — those rendered at
    // ~70% cell width. Segments are background-coloured spaces only.
    for (const cp of [0x2500, 0x256d, 0x2570, 0x2590, 0x258c, 0xe0b0, 0xe0b2]) {
      expect(block).not.toContain(String.fromCodePoint(cp))
    }
    for (const ch of block) {
      const cp = ch.codePointAt(0) ?? 0
      if (cp >= 0xe000 && cp <= 0xf8ff) expect(SUBSET.has(cp)).toBe(true)
    }
  })

  it("chains square segments by colour change, from the theme palette", () => {
    const dark = buildPrompt(base).block
    const light = buildPrompt({ ...base, palette: LATTE }).block
    expect(dark).toContain(`48;2;${rgb(MOCHA.mauve)}`)
    expect(dark).toContain(`48;2;${rgb(MOCHA.lavender)}`)
    expect(light).toContain(`48;2;${rgb(LATTE.mauve)}`)
    expect(light).not.toContain(`48;2;${rgb(MOCHA.mauve)}`)
  })

  it("adds an exit-code segment and a red » only after a failure", () => {
    const ok = buildPrompt(base)
    const failed = buildPrompt({ ...base, exitCode: 127 })
    expect(ok.block).not.toContain(" x 127 ")
    expect(failed.block).toContain(" x 127 ")
    expect(ok.inputPrefix).not.toContain(`38;2;${rgb(MOCHA.red)}`)
    expect(failed.inputPrefix).toContain(`38;2;${rgb(MOCHA.red)}`)
  })

  it("line 1 never exceeds the terminal width", () => {
    for (const cols of [160, 120, 96, 80, 72, 60, 50, 44]) {
      const line1 = buildPrompt({ ...base, cols }).block.split("\r\n")[0] ?? ""
      expect(visibleLen(line1)).toBeLessThanOrEqual(cols)
    }
  })
})

describe("fitPromptLine", () => {
  it("drops nothing when everything fits", () => {
    expect(fitPromptLine(base).dropped).toEqual([])
  })

  it("drops segments in DROP_ORDER, least important first", () => {
    const narrower = [120, 96, 80, 72, 60, 50].map(
      (cols) => fitPromptLine({ ...base, cols }).dropped
    )
    for (const dropped of narrower) {
      // always a prefix of DROP_ORDER
      expect(dropped).toEqual(DROP_ORDER.slice(0, dropped.length))
    }
    // monotonic: narrower terminals drop at least as much
    for (let i = 1; i < narrower.length; i++) {
      expect(narrower[i]?.length ?? 0).toBeGreaterThanOrEqual(
        narrower[i - 1]?.length ?? 0
      )
    }
  })

  it("always keeps the user and path segments", () => {
    const { left } = fitPromptLine({ ...base, cols: 30 })
    expect(left.map((s) => s.id)).toEqual(
      expect.arrayContaining(["user", "path"])
    )
  })
})

describe("formatDuration", () => {
  it("formats ms, seconds and minutes", () => {
    expect(formatDuration(12.4)).toBe("12ms")
    expect(formatDuration(1400)).toBe("1.4s")
    expect(formatDuration(125_000)).toBe("2m 5s")
    expect(formatDuration(-5)).toBe("0ms")
  })
})

describe("buildTransientPrompt", () => {
  it("is a compact single line with the cwd and » marker", () => {
    const line = buildTransientPrompt({ cwd: "~/timeline", palette: MOCHA })
    expect(line).toContain("~/timeline")
    expect(line).toContain("»")
    expect(line).not.toContain("\r\n") // single line, not the full block
    expect(line).not.toContain("KangaZero/KangaFlow") // no git/CPU segments
  })

  it("colours the » marker red only on a non-zero exit", () => {
    const red = `38;2;${rgb(MOCHA.red)}`
    expect(buildTransientPrompt({ cwd: "~", palette: MOCHA })).not.toContain(
      red
    )
    expect(
      buildTransientPrompt({ cwd: "~", exitCode: 1, palette: MOCHA })
    ).toContain(red)
  })
})
