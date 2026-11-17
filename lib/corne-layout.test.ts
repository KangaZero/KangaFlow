// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  actionOf,
  type Binding,
  bindingAt,
  CORNE_KEYS,
  capsOf,
  charNameOf,
  holdOf,
  isCharToken,
  isInertBinding,
  type KeyId,
  keyById,
  keyForCode,
  LAYER_IDS,
  type LayerId,
  shiftOf,
  tapOf,
} from "@/lib/corne-layout"

const mustKey = (id: KeyId) => {
  const key = keyById(id)
  if (key === undefined) throw new Error(`missing key ${id}`)
  return key
}

const at = (layer: LayerId, id: KeyId): Binding => bindingAt(layer, mustKey(id))

// A row in screen order, hold-taps written "tap/hold".
const row = (layer: LayerId, half: "L" | "R", r: 0 | 1 | 2): string =>
  ([0, 1, 2, 3, 4, 5] as const)
    .map((c) => {
      const binding = at(layer, `${half}-${r}-${c}`)
      const hold = holdOf(binding)
      return hold === null ? tapOf(binding) : `${tapOf(binding)}/${hold}`
    })
    .join(" ")

describe("geometry", () => {
  it("has 42 matrix + thumb keys plus 4 v4 extension keys", () => {
    expect(CORNE_KEYS.filter((k) => k.kind !== "ext")).toHaveLength(42)
    expect(CORNE_KEYS.filter((k) => k.kind === "ext")).toHaveLength(4)
    expect(new Set(CORNE_KEYS.map((k) => k.id)).size).toBe(CORNE_KEYS.length)
  })

  it("staggers columns (middle finger highest) and mirrors the right half", () => {
    const pinky = mustKey("L-0-1")
    const middle = mustKey("L-0-3")
    expect(middle.y).toBeLessThan(pinky.y)
    expect(mustKey("R-0-2").y).toBe(middle.y)
    expect(mustKey("LT-2").rotate).toBe(-mustKey("RT-0").rotate)
  })
})

describe("keymap (owner's Vial export)", () => {
  it("encodes the Colemak-DH base with its tap dances", () => {
    expect(row("base", "L", 0)).toBe("Esc q/Esc w f p b")
    expect(row("base", "L", 1)).toBe("Gui a r s t g")
    expect(row("base", "L", 2)).toBe("Ctrl z x c d v")
    expect(row("base", "R", 0)).toBe("j l u y ;/Bksp None")
    expect(row("base", "R", 1)).toBe("m n e i o None")
    expect(row("base", "R", 2)).toBe("k h , . //Enter None")
  })

  it("puts the layer keys and the space/ctrl hold-tap on the thumbs", () => {
    expect(at("base", "LT-0")).toBe("Alt")
    expect(at("base", "LT-1")).toBe("Lower")
    expect(at("base", "LT-2")).toEqual({ hold: "Ctrl", tap: "Space" })
    expect(at("base", "RT-0")).toBe("Adjust")
    expect(at("base", "RT-1")).toBe("Raise")
    expect(at("base", "RT-2")).toBe("Shift")
  })

  it("encodes Lower (numbers, F-keys), Raise (symbols) and Adjust (nav)", () => {
    expect(row("lower", "L", 0)).toBe("Esc 1 2 3 4 5")
    expect(row("lower", "R", 1)).toBe("F11 F12 None PgUp PgDn None")
    expect(row("raise", "L", 0)).toBe("Esc ! @ # $ %")
    expect(row("raise", "R", 2)).toBe("_ + { } | None")
    expect(row("adjust", "R", 0)).toBe("Enter Btn1 Up Btn2 Bksp None")
    expect(row("adjust", "R", 1)).toBe("Btn3 Left Down Right Gui None")
  })

  it("leaves the extension keys unbound on every shown layer", () => {
    for (const layer of LAYER_IDS) {
      for (const id of ["LX-0", "LX-1", "RX-0", "RX-1"] as const) {
        expect(at(layer, id)).toBe("None")
      }
    }
  })
})

describe("key actions", () => {
  it("types each token as a discriminated action", () => {
    expect(actionOf("q")).toEqual({ char: "q", kind: "char" })
    expect(actionOf("Bksp")).toEqual({ key: "Bksp", kind: "named" })
    expect(actionOf("Ctrl")).toEqual({ kind: "mod", mod: "Ctrl" })
    expect(actionOf("Adjust")).toEqual({ kind: "layer", layer: "adjust" })
    expect(actionOf("MsUp")).toEqual({ kind: "inert", token: "MsUp" })
    expect(actionOf("F5")).toEqual({ kind: "inert", token: "F5" })
    expect(actionOf("None")).toEqual({ kind: "none" })
  })

  it("flags inert bindings (no tap or hold can act)", () => {
    expect(isInertBinding("RgbTog")).toBe(true)
    expect(isInertBinding("None")).toBe(true)
    expect(isInertBinding("Gui")).toBe(true)
    expect(isInertBinding({ hold: "Esc", tap: "q" })).toBe(false)
    expect(isInertBinding("Shift")).toBe(false)
  })
})

describe("characters", () => {
  it("shifts letters and US symbols; caps only touches letters", () => {
    expect(shiftOf("a")).toBe("A")
    expect(shiftOf(";")).toBe(":")
    expect(shiftOf("1")).toBe("!")
    expect(shiftOf("!")).toBe("!")
    expect(capsOf("a")).toBe("A")
    expect(capsOf(";")).toBe(";")
  })

  it("names punctuation for screen readers", () => {
    expect(charNameOf(";")).toBe("semicolon")
    expect(charNameOf("q")).toBeNull()
  })

  it("tells characters from everything else", () => {
    expect(isCharToken("q")).toBe(true)
    expect(isCharToken("Bksp")).toBe(false)
    expect(isCharToken("F5")).toBe(false)
    expect(isCharToken("None")).toBe(false)
    expect(isCharToken("MsUp")).toBe(false)
  })
})

describe("keyForCode (physical mirroring)", () => {
  it("QWERTY mapping ON: lights the Corne key at the same QWERTY position", () => {
    expect(keyForCode("KeyE", true)).toBe("L-0-3") // Colemak-DH "f"
    expect(keyForCode("KeyQ", true)).toBe("L-0-1")
    expect(keyForCode("KeyJ", true)).toBe("R-1-1") // "n"
    expect(keyForCode("Space", true)).toBe("LT-2")
    expect(keyForCode("ShiftRight", true)).toBe("R-2-5")
  })

  it("QWERTY mapping OFF: lights the base key with the same legend", () => {
    expect(keyForCode("KeyF", false)).toBe("L-0-3")
    expect(keyForCode("KeyE", false)).toBe("R-1-2")
    expect(keyForCode("KeyQ", false)).toBe("L-0-1")
    expect(keyForCode("Semicolon", false)).toBe("R-0-4")
    expect(keyForCode("Slash", false)).toBe("R-2-4")
  })

  it("OFF: named keys light their key; taps win over holds", () => {
    expect(keyForCode("Escape", false)).toBe("L-0-0") // not q's hold
    expect(keyForCode("Backspace", false)).toBe("R-0-4") // ; / hold Bksp
    expect(keyForCode("Enter", false)).toBe("R-2-4") // / / hold Enter
    expect(keyForCode("Space", false)).toBe("LT-2")
    expect(keyForCode("ShiftLeft", false)).toBe("RT-2")
    expect(keyForCode("ControlLeft", false)).toBe("L-2-0")
    expect(keyForCode("MetaLeft", false)).toBe("L-1-0")
  })

  it("returns null for codes with no key (and prototype names)", () => {
    expect(keyForCode("F5", true)).toBeNull()
    expect(keyForCode("toString", true)).toBeNull()
    expect(keyForCode("Digit1", false)).toBeNull() // only on Lower
    expect(keyForCode("Tab", false)).toBeNull() // only on Raise
    expect(keyForCode("toString", false)).toBeNull()
  })

  it("only points at keys that exist", () => {
    for (const mode of [true, false]) {
      for (const code of ["KeyA", "KeyZ", "Comma", "Period", "AltLeft"]) {
        const id = keyForCode(code, mode)
        if (id !== null) expect(keyById(id)).toBeDefined()
      }
    }
  })
})
