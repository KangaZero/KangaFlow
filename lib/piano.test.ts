// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  BINDING_LABELS,
  clampOctave,
  detectChord,
  FIRST_KEY,
  frequency,
  intervalName,
  isBoundCode,
  LAST_KEY,
  musicalKey,
  noteName,
  octaveBase,
  PIANO_KEYS,
  WHITE_KEY_COUNT,
} from "@/lib/piano"

const read = (
  notes: number[],
  tonic: Parameters<typeof musicalKey>[0],
  mode: Parameters<typeof musicalKey>[1]
) => {
  const reading = detectChord(notes, musicalKey(tonic, mode))
  return reading ? `${reading.name} [${reading.roman ?? "outside"}]` : null
}

describe("keyboard", () => {
  it("has 88 keys from A0 to C8, 52 of them white", () => {
    expect(PIANO_KEYS).toHaveLength(88)
    expect(PIANO_KEYS[0]?.midi).toBe(FIRST_KEY)
    expect(PIANO_KEYS.at(-1)?.midi).toBe(LAST_KEY)
    expect(WHITE_KEY_COUNT).toBe(52)
  })

  it("tunes A4 to 440 Hz and an octave doubles", () => {
    expect(frequency(69)).toBe(440)
    expect(frequency(81)).toBeCloseTo(880)
  })

  it("places C4 at MIDI 60 and clamps the octave setting to 1–7", () => {
    expect(octaveBase(4)).toBe(60)
    expect(clampOctave(0)).toBe(1)
    expect(clampOctave(9)).toBe(7)
    expect(clampOctave(5)).toBe(5)
  })

  it("binds physical keys only", () => {
    expect(isBoundCode("KeyA")).toBe(true)
    expect(isBoundCode("toString")).toBe(false)
    expect(BINDING_LABELS.get(16)).toBe(";")
  })
})

describe("spelling", () => {
  it("follows the key signature", () => {
    expect(noteName(61, musicalKey(2, "major"))).toBe("C♯4") // D major
    expect(noteName(61, musicalKey(1, "major"))).toBe("D♭4") // D♭ major
    expect(noteName(70, musicalKey(2, "minor"))).toBe("B♭4") // D minor (F major signature)
  })
})

describe("detectChord", () => {
  it("names triads and sevenths with their function", () => {
    expect(read([60, 64, 67], 0, "major")).toBe("C [I]")
    expect(read([62, 65, 69], 0, "major")).toBe("Dm [ii]")
    expect(read([67, 71, 74, 77], 0, "major")).toBe("G7 [V7]")
    expect(read([71, 74, 77, 81], 0, "major")).toBe("Bm7♭5 [viiø7]")
  })

  it("reads inversions as slash chords and ignores octave doubling", () => {
    expect(read([64, 67, 72], 0, "major")).toBe("C/E [I]")
    expect(read([48, 60, 64, 67, 72], 0, "major")).toBe("C [I]")
  })

  it("lets the key settle ambiguous shapes", () => {
    expect(read([60, 64, 67, 69], 0, "major")).toBe("C6 [I6]")
    expect(read([60, 64, 67, 69], 9, "minor")).toBe("Am7/C [i7]")
  })

  it("flags chords outside the key, which the right mode brings back in", () => {
    expect(read([64, 68, 71], 9, "minor")).toBe("E [outside]")
    expect(read([64, 68, 71], 9, "harmonicMinor")).toBe("E [V]")
    expect(read([71, 74, 77, 80], 0, "harmonicMinor")).toBe("Bdim7 [vii°7]")
  })

  it("needs three distinct notes and a known shape", () => {
    expect(read([60, 67], 0, "major")).toBeNull()
    expect(read([60, 61, 62], 0, "major")).toBeNull()
  })
})

describe("intervalName", () => {
  it("names the span between two notes", () => {
    expect(intervalName(60, 67)).toBe("P5")
    expect(intervalName(60, 63)).toBe("m3")
    expect(intervalName(60, 72)).toBe("P8")
  })
})
