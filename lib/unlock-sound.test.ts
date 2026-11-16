// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it, vi } from "vitest"

import { RARITIES } from "@/lib/achievements"
import {
  type AudioLike,
  playUnlockSound,
  scheduleUnlockSound,
  unlockSoundPlan,
} from "@/lib/unlock-sound"

const kinds = (rarity: (typeof RARITIES)[number], reduced = false) =>
  unlockSoundPlan(rarity, reduced).map((e) => e.kind)

describe("unlockSoundPlan", () => {
  it("layers grow with rarity", () => {
    expect(kinds("common")).not.toContain("boom")
    expect(kinds("rare")).toContain("boom")
    const tones = (r: (typeof RARITIES)[number]) =>
      kinds(r).filter((k) => k === "tone").length
    expect(tones("mythic")).toBeGreaterThan(tones("legendary"))
    expect(tones("legendary")).toBeGreaterThan(tones("common"))
    expect(kinds("legendary").filter((k) => k === "crack")).toHaveLength(2) // double crack
  })

  it("plays riser → crack/pop → chime in timeline order", () => {
    const plan = unlockSoundPlan("rare", false)
    const at = (kind: string) =>
      plan.find((e) => e.kind === kind)?.at ?? Number.NaN
    expect(at("riser")).toBeLessThan(at("crack"))
    expect(at("crack")).toBeLessThanOrEqual(at("tone"))
  })

  it("keeps every level gentle", () => {
    for (const r of RARITIES)
      for (const e of unlockSoundPlan(r, false))
        expect(e.gain).toBeLessThanOrEqual(0.25)
  })

  it("under reduced motion keeps only the chime, starting immediately", () => {
    const plan = unlockSoundPlan("mythic", true)
    expect(
      plan.some(
        (e) => e.kind === "riser" || e.kind === "crack" || e.kind === "pop"
      )
    ).toBe(false)
    expect(Math.min(...plan.map((e) => e.at))).toBe(0)
  })
})

function fakeAudio() {
  const param = () => ({
    exponentialRampToValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    setValueAtTime: vi.fn(),
    value: 0,
  })
  const node = () => ({ connect: vi.fn((next: unknown) => next) })
  const created = {
    buffers: 0,
    filters: 0,
    gains: 0,
    oscillators: 0,
    sources: 0,
  }
  const audio = {
    createBiquadFilter: () => {
      created.filters++
      return { ...node(), frequency: param(), Q: param(), type: "" }
    },
    createBuffer: (_c: number, length: number) => {
      created.buffers++
      return { getChannelData: () => new Float32Array(length) }
    },
    createBufferSource: () => {
      created.sources++
      return { ...node(), buffer: null, start: vi.fn() }
    },
    createGain: () => {
      created.gains++
      return { ...node(), gain: param() }
    },
    createOscillator: () => {
      created.oscillators++
      return {
        ...node(),
        frequency: param(),
        start: vi.fn(),
        stop: vi.fn(),
        type: "",
      }
    },
    currentTime: 10,
    destination: {},
    sampleRate: 48000,
  }
  // A structural test double for the narrow AudioLike slice (jsdom has no Web Audio).
  return { audio: audio as unknown as AudioLike, created }
}

describe("scheduleUnlockSound / playUnlockSound", () => {
  it("builds the expected nodes for a legendary unlock", () => {
    const { audio, created } = fakeAudio()
    scheduleUnlockSound(audio, unlockSoundPlan("legendary", false))
    const plan = unlockSoundPlan("legendary", false)
    const count = (k: string) => plan.filter((e) => e.kind === k).length
    expect(created.sources).toBe(count("crack"))
    expect(created.buffers).toBe(count("crack"))
    expect(created.filters).toBe(count("crack"))
    expect(created.oscillators).toBe(
      count("tone") + count("riser") + count("pop") + count("boom")
    )
  })

  it("creates nothing (not even a context) when sound is off", () => {
    const getAudio = vi.fn((): AudioContext | null => null)
    expect(
      playUnlockSound({
        enabled: false,
        getAudio,
        rarity: "mythic",
        reduced: false,
      })
    ).toBe(false)
    expect(getAudio).not.toHaveBeenCalled()
  })

  it("degrades to silence when Web Audio is unavailable", () => {
    expect(
      playUnlockSound({
        enabled: true,
        getAudio: () => null,
        rarity: "rare",
        reduced: false,
      })
    ).toBe(false)
  })
})
