import { describe, expect, it } from "vitest"
import {
  buildPrompt,
  buildTransientPrompt,
  type PromptCtx,
} from "@/lib/terminal/prompt"

const base: PromptCtx = {
  cols: 80,
  cores: 8,
  cwd: "~/timeline",
  now: new Date("2025-01-06T15:04:05"), // a Monday
  os: "nixos",
  ramGB: 8,
}

describe("buildPrompt", () => {
  it("includes the static repo, the cwd, and the » input marker", () => {
    const { block } = buildPrompt(base)
    expect(block).toContain("KangaZero/KangaFlow")
    expect(block).toContain("~/timeline")
    expect(block).toContain("»")
  })

  it("renders segments as colour blocks with no box/block/powerline glyphs", () => {
    const { block } = buildPrompt(base)
    // The DOM renderer draws glyphs from the latin font subset, which omits
    // box-drawing (╭ ╰ ─), block-element (▐ ▌) and powerline (E0B0/E0B2)
    // codepoints — those rendered at ~70% cell width. The prompt must build its
    // structure from background-coloured spaces only, never those glyphs.
    for (const cp of [0x2500, 0x256d, 0x2570, 0x2590, 0x258c, 0xe0b0, 0xe0b2]) {
      expect(block).not.toContain(String.fromCodePoint(cp))
    }
    // Segments are driven purely by 24-bit background colour (purple 189;147;249).
    expect(block).toContain("48;2;189;147;249")
  })

  it("ends the input prefix with a colour reset", () => {
    const { inputPrefix } = buildPrompt(base)
    expect(inputPrefix.endsWith("\x1b[0m ")).toBe(true)
  })

  it("colours the » marker red only on a non-zero exit", () => {
    const ok = buildPrompt(base)
    const failed = buildPrompt({ ...base, exitCode: 1 })
    expect(ok.inputPrefix).not.toContain("38;2;239;83;80")
    expect(failed.inputPrefix).toContain("38;2;239;83;80")
  })

  it("right-aligns the git block within cols (no negative padding)", () => {
    // A tiny width must not throw or produce a huge negative pad.
    const { block } = buildPrompt({ ...base, cols: 10 })
    expect(block).toContain("KangaZero/KangaFlow")
  })
})

describe("buildTransientPrompt", () => {
  it("is a compact single line with the cwd and » marker", () => {
    const line = buildTransientPrompt({ cwd: "~/timeline" })
    expect(line).toContain("~/timeline")
    expect(line).toContain("»")
    expect(line).not.toContain("\r\n") // single line, not the full block
    expect(line).not.toContain("KangaZero/KangaFlow") // no git/CPU segments
  })

  it("colours the » marker red only on a non-zero exit", () => {
    expect(buildTransientPrompt({ cwd: "~" })).not.toContain("38;2;239;83;80")
    expect(buildTransientPrompt({ cwd: "~", exitCode: 1 })).toContain(
      "38;2;239;83;80"
    )
  })
})
