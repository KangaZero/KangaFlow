// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  AMBIENCE_INTENSITY,
  ambienceForTheme,
  planAmbience,
  stopAmbience,
  syncAmbience,
} from "@/lib/sfx/ambience"
import {
  LOGIN_SFX,
  lydian,
  peakEventGain,
  SFX_META,
  SFX_NAMES,
  SFX_RECIPES,
  type SfxEvent,
} from "@/lib/sfx/catalog"
import {
  createRateLimiter,
  playSfx,
  setSfxGate,
  sfxAllowed,
} from "@/lib/sfx/play"

const ON = { enabled: true, gestured: true, reducedMotion: false }

const firstFrequency = (event: SfxEvent | undefined): number =>
  event !== undefined && "f" in event ? event.f : Number.NaN

describe("catalog", () => {
  it("names are unique", () => {
    expect(new Set(SFX_NAMES).size).toBe(SFX_NAMES.length)
  })

  it.each(SFX_NAMES)("%s has a gentle, well-formed plan", (name) => {
    const plan = SFX_RECIPES[name]({})
    expect(plan.events.length).toBeGreaterThan(0)
    expect(plan.wet).toBeGreaterThanOrEqual(0)
    expect(plan.wet).toBeLessThanOrEqual(1)
    expect(peakEventGain(plan)).toBeLessThanOrEqual(0.15)
    for (const event of plan.events) expect(event.at).toBeGreaterThanOrEqual(0)
    expect(SFX_META[name].minIntervalMs).toBeGreaterThan(0)
  })

  it("login sounds exist in the catalog (exported for the login port)", () => {
    for (const name of LOGIN_SFX) expect(SFX_NAMES).toContain(name)
  })

  it("ws-switch rises with the workspace number and clamps", () => {
    const f = (step: number) =>
      firstFrequency(SFX_RECIPES["ws-switch"]({ step }).events[0])
    expect(f(2)).toBeGreaterThan(f(1))
    expect(f(9)).toBeGreaterThan(f(5))
    expect(f(50)).toBe(f(9))
    expect(f(0)).toBe(f(1))
  })

  it("boop climbs with the boop count", () => {
    const f = (step: number) =>
      firstFrequency(SFX_RECIPES.boop({ step }).events[0])
    expect(f(1)).toBe(lydian(4))
    expect(f(3)).toBeGreaterThan(f(2))
    expect(f(100)).toBe(f(11))
  })
})

describe("sfxAllowed", () => {
  it("is silent when disabled or before a gesture", () => {
    expect(sfxAllowed("copy", { ...ON, enabled: false })).toBe(false)
    expect(sfxAllowed("copy", { ...ON, gestured: false })).toBe(false)
    expect(sfxAllowed("copy", ON)).toBe(true)
  })

  it("reduced motion drops only motion-accompanying sounds", () => {
    const reduced = { ...ON, reducedMotion: true }
    for (const name of SFX_NAMES) {
      expect(sfxAllowed(name, reduced)).toBe(!SFX_META[name].motion)
    }
    expect(sfxAllowed("overview-in", reduced)).toBe(false)
    expect(sfxAllowed("toggle-on", reduced)).toBe(true)
  })
})

describe("playSfx", () => {
  afterEach(() => {
    setSfxGate({ enabled: false, gestured: false, reducedMotion: false })
  })

  it("never touches audio while the setting is off", () => {
    const getAudio = vi.fn((): AudioContext | null => null)
    setSfxGate({ enabled: false, gestured: true })
    expect(playSfx("toast-in", {}, getAudio)).toBe(false)
    expect(getAudio).not.toHaveBeenCalled()
  })

  it("never touches audio before the first gesture", () => {
    const getAudio = vi.fn((): AudioContext | null => null)
    setSfxGate({ enabled: true, gestured: false })
    expect(playSfx("copy", {}, getAudio)).toBe(false)
    expect(getAudio).not.toHaveBeenCalled()
  })

  it("stays silent when Web Audio is unavailable", () => {
    const getAudio = vi.fn((): AudioContext | null => null)
    setSfxGate(ON)
    expect(playSfx("error-soft", {}, getAudio)).toBe(false)
    expect(getAudio).toHaveBeenCalledOnce()
  })
})

describe("createRateLimiter", () => {
  it("throttles repeats of one sound within its interval", () => {
    let t = 0
    const allow = createRateLimiter(() => t)
    expect(allow("toggle-on")).toBe(true)
    t += SFX_META["toggle-on"].minIntervalMs - 1
    expect(allow("toggle-on")).toBe(false)
    t += 1
    expect(allow("toggle-on")).toBe(true)
  })

  it("keys sounds independently", () => {
    const allow = createRateLimiter(() => 0)
    expect(allow("toggle-on")).toBe(true)
    expect(allow("copy")).toBe(true)
  })

  it("shares a window across a group (toast + notify never double-play)", () => {
    let t = 0
    const allow = createRateLimiter(() => t)
    expect(allow("toast-in")).toBe(true)
    expect(allow("notify")).toBe(false)
    t += SFX_META.notify.minIntervalMs
    expect(allow("notify")).toBe(true)
  })
})

describe("ambience", () => {
  afterEach(() => stopAmbience())

  const input = { enabled: true, hidden: false, theme: "dark" }

  it("maps only the dark theme to the deep sea", () => {
    expect(ambienceForTheme("dark")).toBe("deepSea")
    expect(ambienceForTheme("light")).toBeNull()
    expect(ambienceForTheme(undefined)).toBeNull()
  })

  it("starts, holds, and stops", () => {
    expect(planAmbience(null, input)).toEqual({ start: "deepSea", stop: false })
    expect(planAmbience("deepSea", input)).toEqual({ start: null, stop: false })
    expect(planAmbience("deepSea", { ...input, enabled: false })).toEqual({
      start: null,
      stop: true,
    })
  })

  it("pauses while hidden and leaves on a theme without a bed", () => {
    expect(planAmbience("deepSea", { ...input, hidden: true })).toEqual({
      start: null,
      stop: true,
    })
    expect(planAmbience("deepSea", { ...input, theme: "light" })).toEqual({
      start: null,
      stop: true,
    })
    expect(planAmbience(null, { ...input, hidden: true })).toEqual({
      start: null,
      stop: false,
    })
  })

  it("does not create audio when disabled", () => {
    const getAudio = vi.fn((): AudioContext | null => null)
    syncAmbience({ ...input, enabled: false }, getAudio)
    expect(getAudio).not.toHaveBeenCalled()
  })

  it("defaults to a low intensity", () => {
    expect(AMBIENCE_INTENSITY).toBeGreaterThan(0)
    expect(AMBIENCE_INTENSITY).toBeLessThanOrEqual(0.4)
  })
})
