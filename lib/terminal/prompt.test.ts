import { describe, expect, it } from "vitest"
import { buildPrompt, type PromptCtx } from "@/lib/terminal/prompt"

const base: PromptCtx = {
  cols: 80,
  cores: 8,
  cwd: "~/timeline",
  now: new Date("2025-01-06T15:04:05"), // a Monday
  os: "nixos",
  ramGB: 8,
}

describe("buildPrompt", () => {
  it("includes the static repo, the cwd, and the box-drawing frame", () => {
    const { block } = buildPrompt(base)
    expect(block).toContain("KangaZero/KangaFlow")
    expect(block).toContain("~/timeline")
    expect(block).toContain("╭─")
    expect(block).toContain("╰─")
    expect(block).toContain("❯")
  })

  it("ends the input prefix with a colour reset", () => {
    const { inputPrefix } = buildPrompt(base)
    expect(inputPrefix.endsWith("\x1b[0m ")).toBe(true)
  })

  it("colours the ❯ red only on a non-zero exit", () => {
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
