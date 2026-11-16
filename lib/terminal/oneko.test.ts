// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { ONEKO_VERSION } from "@/lib/oneko"
import { completeLine } from "@/lib/terminal/complete"
import {
  applyOnekoCommand,
  isOnekoCommand,
  ONEKO_COMMANDS,
  ONEKO_HOME_PAGE,
  type OnekoState,
  renderOnekoOutput,
} from "@/lib/terminal/oneko"

const ON_FOLLOW: OnekoState = { enabled: true, followCursor: true }
const OFF_ROAM: OnekoState = { enabled: false, followCursor: false }

// Strip ANSI SGR sequences so assertions read the visible text only.
// biome-ignore lint/suspicious/noControlCharactersInRegex: matching ESC is the point.
const plain = (text: string): string => text.replace(/\x1b\[[0-9;]*m/g, "")

describe("isOnekoCommand", () => {
  it("accepts every declared subcommand", () => {
    for (const cmd of ONEKO_COMMANDS) {
      expect(isOnekoCommand(cmd)).toBe(true)
    }
  })

  it("rejects anything else, including near-misses", () => {
    for (const value of ["", "Toggle", "toggle ", "kill", "follow"]) {
      expect(isOnekoCommand(value)).toBe(false)
    }
  })
})

describe("applyOnekoCommand", () => {
  it("prints help for an empty argument or `help` without touching state", () => {
    for (const arg of ["", "   ", "help"]) {
      const result = applyOnekoCommand(ON_FOLLOW, arg)
      expect(result.output).toEqual({ kind: "help" })
      expect(result.next).toBe(ON_FOLLOW)
      expect(result.exitCode).toBe(0)
      expect(result.unlock).toBeNull()
    }
  })

  it("fails an unknown subcommand with exit 1 and no state change", () => {
    const result = applyOnekoCommand(ON_FOLLOW, "  meow ")
    expect(result.output).toEqual({ input: "meow", kind: "unknown" })
    expect(result.next).toBe(ON_FOLLOW)
    expect(result.exitCode).toBe(1)
    expect(result.unlock).toBeNull()
  })

  it("dismissing oneko-sama disables her and unlocks Psychopath", () => {
    const result = applyOnekoCommand(ON_FOLLOW, "toggle")
    expect(result.next).toEqual({ enabled: false, followCursor: true })
    expect(result.output).toEqual({ kind: "dismissed" })
    expect(result.unlock).toBe("psychopath")
  })

  it("summoning oneko-sama re-enables her without an unlock", () => {
    const result = applyOnekoCommand(OFF_ROAM, "toggle")
    expect(result.next).toEqual({ enabled: true, followCursor: false })
    expect(result.output).toEqual({ kind: "summoned" })
    expect(result.unlock).toBeNull()
  })

  it("sets follow-cursor and reports whether it changed", () => {
    expect(applyOnekoCommand(OFF_ROAM, "follow-cursor")).toMatchObject({
      next: { enabled: false, followCursor: true },
      output: { changed: true, kind: "follow-cursor" },
    })
    expect(applyOnekoCommand(ON_FOLLOW, "follow-cursor")).toMatchObject({
      next: ON_FOLLOW,
      output: { changed: false, kind: "follow-cursor" },
    })
  })

  it("sets no-follow-cursor and reports whether it changed", () => {
    expect(applyOnekoCommand(ON_FOLLOW, "no-follow-cursor")).toMatchObject({
      next: { enabled: true, followCursor: false },
      output: { changed: true, kind: "no-follow-cursor" },
    })
    expect(applyOnekoCommand(OFF_ROAM, "no-follow-cursor")).toMatchObject({
      next: OFF_ROAM,
      output: { changed: false, kind: "no-follow-cursor" },
    })
  })

  it("cat, dog and version are read-only", () => {
    for (const cmd of ["cat", "dog", "version"] as const) {
      const result = applyOnekoCommand(ON_FOLLOW, cmd)
      expect(result.output).toEqual({ kind: cmd })
      expect(result.next).toBe(ON_FOLLOW)
      expect(result.exitCode).toBe(0)
    }
  })
})

describe("renderOnekoOutput", () => {
  it("points to the cat's page only when summoned elsewhere", () => {
    const hint = `awaits you on /${ONEKO_HOME_PAGE}`
    expect(plain(renderOnekoOutput({ kind: "summoned" }, false))).toContain(
      hint
    )
    expect(plain(renderOnekoOutput({ kind: "summoned" }, true))).not.toContain(
      hint
    )
  })

  it("says the line when dismissed", () => {
    expect(plain(renderOnekoOutput({ kind: "dismissed" }, true))).toContain(
      "How could you!"
    )
  })

  it("prints the version from the single ONEKO_VERSION source", () => {
    expect(plain(renderOnekoOutput({ kind: "version" }, true))).toBe(
      `\r\noneko ${ONEKO_VERSION}`
    )
  })

  it("echoes an unknown subcommand followed by the help table", () => {
    const text = plain(
      renderOnekoOutput({ input: "meow", kind: "unknown" }, true)
    )
    expect(text).toContain("unknown subcommand: meow")
    expect(text).toContain("usage: oneko <subcmd>")
  })

  it("keeps the cat 1-cell-safe printable ASCII", () => {
    const text = plain(renderOnekoOutput({ kind: "cat" }, true))
    expect(text.replace(/\r\n/g, "")).toMatch(/^[\x20-\x7e]+$/)
  })
})

describe("oneko completion", () => {
  it("completes subcommands after `oneko `", () => {
    expect(completeLine("oneko f", []).candidates).toEqual(["follow-cursor"])
  })
})
