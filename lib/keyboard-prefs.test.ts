// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  DEFAULT_KEYBOARD_OPTIONS,
  DEFAULT_KEYBOARD_PREFS,
  parseKeyboardOptions,
  parseKeyboardPrefs,
} from "@/lib/keyboard-prefs"

describe("parseKeyboardPrefs", () => {
  it("falls back to defaults for junk", () => {
    expect(parseKeyboardPrefs(null)).toEqual(DEFAULT_KEYBOARD_PREFS)
    expect(parseKeyboardPrefs("nope")).toEqual(DEFAULT_KEYBOARD_PREFS)
  })

  it("keeps valid fields and repairs invalid ones individually", () => {
    expect(
      parseKeyboardPrefs({
        dock: "float",
        halves: { L: { x: 10, y: -4 }, R: { x: "1", y: 2 } },
        position: { x: 5, y: Number.NaN },
        showExt: true,
      })
    ).toEqual({
      dock: "float",
      halves: { L: { x: 10, y: -4 }, R: { x: 0, y: 0 } },
      position: null,
      showExt: true,
    })
    expect(parseKeyboardPrefs({ dock: "side" }).dock).toBe("bottom")
  })
})

describe("parseKeyboardOptions", () => {
  it("defaults to QWERTY mapping ON for missing or junk values", () => {
    expect(DEFAULT_KEYBOARD_OPTIONS.qwertyMapping).toBe(true)
    expect(parseKeyboardOptions(undefined)).toEqual(DEFAULT_KEYBOARD_OPTIONS)
    expect(parseKeyboardOptions([])).toEqual(DEFAULT_KEYBOARD_OPTIONS)
    expect(parseKeyboardOptions({ qwertyMapping: "false" })).toEqual(
      DEFAULT_KEYBOARD_OPTIONS
    )
  })

  it("keeps a stored boolean", () => {
    expect(parseKeyboardOptions({ qwertyMapping: false })).toEqual({
      qwertyMapping: false,
    })
    expect(parseKeyboardOptions({ extra: 1, qwertyMapping: true })).toEqual({
      qwertyMapping: true,
    })
  })
})
