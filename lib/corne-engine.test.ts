// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  activeLayer,
  DOUBLE_TAP_MS,
  type EngineEvent,
  type EngineState,
  INITIAL_ENGINE_STATE,
  isShiftActive,
  nearestKey,
  resolveLayer,
  shiftAfterTap,
  step,
  TAP_MS,
} from "@/lib/corne-engine"
import type { KeyId } from "@/lib/corne-layout"

// Run a script of events, collecting every edit action produced.
function run(events: EngineEvent[], from: EngineState = INITIAL_ENGINE_STATE) {
  let state = from
  const actions = []
  for (const event of events) {
    const result = step(state, event)
    state = result.state
    actions.push(...result.actions)
  }
  return { actions, state }
}

const tap = (key: KeyId, at: number): EngineEvent[] => [
  { at, key, type: "press" },
  { at: at + 10, key, type: "release" },
]

describe("resolveLayer", () => {
  it("is base with nothing held or locked", () => {
    expect(resolveLayer([], null)).toBe("base")
  })
  it("follows a held or locked layer key", () => {
    expect(resolveLayer(["lower"], null)).toBe("lower")
    expect(resolveLayer([], "raise")).toBe("raise")
  })
  it("is adjust with both layer keys, in any mix of held and locked", () => {
    expect(resolveLayer(["lower", "raise"], null)).toBe("adjust")
    expect(resolveLayer(["raise"], "lower")).toBe("adjust")
    expect(resolveLayer([], "adjust")).toBe("adjust")
  })
})

describe("layer keys", () => {
  it("hold = momentary: the layer applies only while held", () => {
    const held = run([{ at: 0, key: "LT-1", type: "press" }])
    expect(activeLayer(held.state)).toBe("lower")
    // R-0-0 is "^" on the (placeholder) symbol layer.
    const typed = run(
      [
        { at: 50, key: "R-0-0", type: "press" },
        { at: 60, key: "R-0-0", type: "release" },
        { at: 400, key: "LT-1", type: "release" },
      ],
      held.state
    )
    expect(typed.actions).toEqual([{ text: "^", type: "insert" }])
    expect(activeLayer(typed.state)).toBe("base")
    expect(typed.state.locked).toBeNull()
  })

  it("tap = lock, tap again = unlock", () => {
    const locked = run(tap("RT-1", 0))
    expect(locked.state.locked).toBe("raise")
    expect(activeLayer(locked.state)).toBe("raise")
    const unlocked = run(tap("RT-1", 1000), locked.state)
    expect(unlocked.state.locked).toBeNull()
  })

  it("a slow press is a hold, not a tap", () => {
    const slow = run([
      { at: 0, key: "LT-1", type: "press" },
      { at: TAP_MS + 1, key: "LT-1", type: "release" },
    ])
    expect(slow.state.locked).toBeNull()
  })

  it("holding both layer keys gives adjust", () => {
    const both = run([
      { at: 0, key: "LT-1", type: "press" },
      { at: 5, key: "RT-1", type: "press" },
    ])
    expect(activeLayer(both.state)).toBe("adjust")
    // R-0-1 is "7" on adjust.
    const typed = run(tap("R-0-1", 20), both.state)
    expect(typed.actions).toEqual([{ text: "7", type: "insert" }])
  })

  it("tabs lock a layer; base unlocks", () => {
    const tabbed = run([{ layer: "adjust", type: "selectLayer" }])
    expect(activeLayer(tabbed.state)).toBe("adjust")
    const back = run([{ layer: "base", type: "selectLayer" }], tabbed.state)
    expect(back.state.locked).toBeNull()
  })
})

describe("shift", () => {
  it("off → one-shot → caps on a quick double tap; slow second tap turns off", () => {
    expect(shiftAfterTap("off", null, 0)).toBe("oneshot")
    expect(shiftAfterTap("oneshot", 0, DOUBLE_TAP_MS - 1)).toBe("caps")
    expect(shiftAfterTap("oneshot", 0, DOUBLE_TAP_MS + 1)).toBe("off")
    expect(shiftAfterTap("caps", 0, 10)).toBe("off")
  })

  it("one-shot shifts exactly the next character", () => {
    const result = run([
      ...tap("L-2-0", 0),
      ...tap("R-1-2", 100), // e
      ...tap("R-1-2", 200),
    ])
    expect(result.actions).toEqual([
      { text: "E", type: "insert" },
      { text: "e", type: "insert" },
    ])
    expect(result.state.shiftMode).toBe("off")
  })

  it("double tap = caps: letters stay upper, punctuation unshifted", () => {
    const result = run([
      ...tap("L-2-0", 0),
      ...tap("L-2-0", 100),
      ...tap("R-1-2", 600), // e
      ...tap("R-0-4", 700), // ;
    ])
    expect(result.state.shiftMode).toBe("caps")
    expect(result.actions).toEqual([
      { text: "E", type: "insert" },
      { text: ";", type: "insert" },
    ])
  })

  it("held shift is a normal shift and does not arm one-shot", () => {
    const result = run([
      { at: 0, key: "L-2-0", type: "press" },
      ...tap("R-0-4", 20), // ; → :
      { at: 50, key: "L-2-0", type: "release" },
    ])
    expect(result.actions).toEqual([{ text: ":", type: "insert" }])
    expect(result.state.shiftMode).toBe("off")
  })

  it("physical shift counts as shift", () => {
    const result = run([{ down: true, type: "physicalShift" }])
    expect(isShiftActive(result.state)).toBe(true)
  })
})

describe("ctrl and edits", () => {
  it("one-shot ctrl turns the next character into a ctrl chord", () => {
    const result = run([
      ...tap("L-1-0", 0),
      ...tap("L-1-1", 100),
      ...tap("L-1-1", 200),
    ])
    expect(result.actions).toEqual([
      { char: "a", type: "ctrl" },
      { text: "a", type: "insert" },
    ])
  })

  it("maps functions to edit actions", () => {
    expect(run(tap("R-0-5", 0)).actions).toEqual([{ type: "deleteBackward" }])
    expect(run(tap("LT-2", 0)).actions).toEqual([{ text: " ", type: "insert" }])
    expect(run(tap("RT-0", 0)).actions).toEqual([{ type: "enter" }])
    expect(run(tap("L-0-0", 0)).actions).toEqual([{ type: "tab" }])
  })

  it("inert keys and ghost keys produce nothing", () => {
    expect(run(tap("LT-0", 0)).actions).toEqual([]) // Gui
    expect(run(tap("LX-0", 0)).actions).toEqual([])
  })

  it("repeat re-fires backspace while held, but not characters", () => {
    const held = step(INITIAL_ENGINE_STATE, {
      at: 0,
      key: "R-0-5",
      type: "press",
    })
    expect(held.repeat).toBe(true)
    expect(step(held.state, { key: "R-0-5", type: "repeat" }).actions).toEqual([
      { type: "deleteBackward" },
    ])
    const char = step(INITIAL_ENGINE_STATE, {
      at: 0,
      key: "L-0-1",
      type: "press",
    })
    expect(char.repeat).toBe(false)
    expect(step(char.state, { key: "L-0-1", type: "repeat" }).actions).toEqual(
      []
    )
  })

  it("reset drops held keys and one-shots but keeps a lock and caps", () => {
    const busy = run([
      ...tap("RT-1", 0), // lock raise
      { at: 100, key: "L-1-0", type: "press" }, // hold ctrl
      { type: "reset" },
    ])
    expect(busy.state.locked).toBe("raise")
    expect(busy.state.ctrlHeld).toBe(0)
    expect(busy.state.down.size).toBe(0)
  })
})

describe("nearestKey", () => {
  it("moves along rows and between halves", () => {
    expect(nearestKey("L-0-1", "right", false)).toBe("L-0-2")
    expect(nearestKey("L-0-1", "down", false)).toBe("L-1-1")
    expect(nearestKey("L-0-5", "right", false)).toBe("R-0-0")
  })
  it("stops at the edge and skips hidden extension keys", () => {
    expect(nearestKey("L-0-0", "left", false)).toBeNull()
    expect(nearestKey("L-0-5", "right", true)).toBe("LX-0")
  })
})
