// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  CORNE_KEYS,
  capsOf,
  charNameOf,
  isCharToken,
  keyById,
  keyForCode,
  LAYER_IDS,
  LAYERS,
  PHYSICAL_KEY_MAP,
  shiftOf,
  statusAt,
  THUMBS,
  tokenAt,
} from "@/lib/corne-layout"

const mustKey = (id: Parameters<typeof keyById>[0]) => {
  const key = keyById(id)
  if (key === undefined) throw new Error(`missing key ${id}`)
  return key
}

describe("geometry", () => {
  it("has 42 real keys (3x6 + 3 thumbs per half) plus 4 ghost extension keys", () => {
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

describe("layers", () => {
  it("encodes the Colemak-DH base alphas", () => {
    const row = (half: "L" | "R", r: 0 | 1 | 2) =>
      LAYERS.base[half][r].join(" ")
    expect(row("L", 0)).toBe("Tab q w f p b")
    expect(row("L", 1)).toBe("Ctrl a r s t g")
    expect(row("L", 2)).toBe("Shift z x c d v")
    expect(row("R", 0)).toBe("j l u y ; Bksp")
    expect(row("R", 1)).toBe("m n e i o '")
    expect(row("R", 2)).toBe("k h , . / Shift")
  })

  it("marks thumbs and the lower/raise/adjust layers as placeholders", () => {
    expect(THUMBS.placeholder).toBe(true)
    expect(LAYERS.base.placeholder).toBe(false)
    for (const layer of ["lower", "raise", "adjust"] as const) {
      expect(LAYERS[layer].placeholder).toBe(true)
    }
  })

  it("reports honesty status per key", () => {
    expect(statusAt("base", mustKey("L-1-1"))).toBe("verified")
    expect(statusAt("base", mustKey("L-1-0"))).toBe("conventional")
    expect(statusAt("base", mustKey("R-0-5"))).toBe("conventional")
    expect(statusAt("base", mustKey("LT-1"))).toBe("placeholder")
    expect(statusAt("lower", mustKey("L-1-1"))).toBe("placeholder")
    expect(statusAt("base", mustKey("LX-0"))).toBe("unverified")
  })

  it("resolves tokens per layer; extension keys never act", () => {
    expect(tokenAt("base", mustKey("R-1-2"))).toBe("e")
    expect(tokenAt("lower", mustKey("R-0-0"))).toBe("^")
    expect(tokenAt("raise", mustKey("R-1-1"))).toBe("Left")
    expect(tokenAt("adjust", mustKey("R-0-1"))).toBe("7")
    expect(tokenAt("base", mustKey("LT-1"))).toBe("Lower")
    for (const layer of LAYER_IDS) {
      expect(tokenAt(layer, mustKey("RX-1"))).toBe("NOOP")
    }
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

  it("tells characters from functions", () => {
    expect(isCharToken("q")).toBe(true)
    expect(isCharToken("Bksp")).toBe(false)
    expect(isCharToken("F5")).toBe(false)
  })
})

describe("keyForCode (physical mirroring)", () => {
  it("maps QWERTY positions to the Corne key in the same spot", () => {
    expect(keyForCode("KeyQ")).toBe("L-0-1")
    expect(keyForCode("KeyJ")).toBe("R-1-1")
    expect(keyForCode("Space")).toBe("LT-2")
    expect(keyForCode("ShiftRight")).toBe("R-2-5")
  })

  it("returns null for codes with no spot (and for prototype keys)", () => {
    expect(keyForCode("F5")).toBeNull()
    expect(keyForCode("toString")).toBeNull()
  })

  it("only points at keys that exist", () => {
    for (const id of Object.values(PHYSICAL_KEY_MAP)) {
      expect(keyById(id)).toBeDefined()
    }
  })
})
