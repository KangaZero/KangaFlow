// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  activeLayer,
  DOUBLE_TAP_MS,
  type EditAction,
  type EngineEvent,
  type EngineState,
  INITIAL_ENGINE_STATE,
  isHoldPending,
  isShiftActive,
  nearestKey,
  resolveLayer,
  shiftAfterTap,
  step,
} from "@/lib/corne-engine"
import { type KeyId, TAPPING_TERM_MS } from "@/lib/corne-layout"

// Run a script of events, collecting every edit action produced.
function run(events: EngineEvent[], from: EngineState = INITIAL_ENGINE_STATE) {
  let state = from
  const actions: EditAction[] = []
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

// Key ids (screen order: L outer→inner, R inner→outer).
const Q = "L-0-1" // q / hold Esc
const E = "R-1-2"
const SEMI = "R-0-4" // ; / hold Bksp
const SPACE = "LT-2" // Space / hold Ctrl
const LOWER = "LT-1"
const RAISE = "RT-1"
const ADJUST = "RT-0" // MO(3)
const SHIFT = "RT-2"
const CTRL = "L-2-0"

describe("resolveLayer (tri-layer)", () => {
  it("is base with nothing held or locked", () => {
    expect(resolveLayer([], null)).toBe("base")
  })
  it("follows a held or locked layer key", () => {
    expect(resolveLayer(["lower"], null)).toBe("lower")
    expect(resolveLayer([], "raise")).toBe("raise")
  })
  it("is adjust with Lower + Raise in any mix, or with MO(3) alone", () => {
    expect(resolveLayer(["lower", "raise"], null)).toBe("adjust")
    expect(resolveLayer(["raise"], "lower")).toBe("adjust")
    expect(resolveLayer(["adjust"], null)).toBe("adjust")
    expect(resolveLayer([], "adjust")).toBe("adjust")
  })
})

describe("layer keys", () => {
  it("hold = momentary: the layer applies only while held", () => {
    const held = run([{ at: 0, key: LOWER, type: "press" }])
    expect(activeLayer(held.state)).toBe("lower")
    // R-0-0 is "6" on Lower.
    const typed = run(
      [...tap("R-0-0", 50), { at: 400, key: LOWER, type: "release" }],
      held.state
    )
    expect(typed.actions).toEqual([{ text: "6", type: "insert" }])
    expect(activeLayer(typed.state)).toBe("base")
    expect(typed.state.locked).toBeNull()
  })

  it("tap = lock, tap again = unlock", () => {
    const locked = run(tap(RAISE, 0))
    expect(locked.state.locked).toBe("raise")
    expect(activeLayer(locked.state)).toBe("raise")
    const unlocked = run(tap(RAISE, 1000), locked.state)
    expect(unlocked.state.locked).toBeNull()
  })

  it("a press past the tapping term is a hold, not a tap", () => {
    const slow = run([
      { at: 0, key: LOWER, type: "press" },
      { at: TAPPING_TERM_MS + 1, key: LOWER, type: "release" },
    ])
    expect(slow.state.locked).toBeNull()
  })

  it("Lower + Raise held together gives Adjust", () => {
    const both = run([
      { at: 0, key: LOWER, type: "press" },
      { at: 5, key: RAISE, type: "press" },
    ])
    expect(activeLayer(both.state)).toBe("adjust")
    // R-0-2 is Up on Adjust.
    expect(run(tap("R-0-2", 20), both.state).actions).toEqual([
      { move: "up", type: "move" },
    ])
  })

  it("MO(3) goes straight to Adjust", () => {
    const held = run([{ at: 0, key: ADJUST, type: "press" }])
    expect(activeLayer(held.state)).toBe("adjust")
    // R-0-0 is Enter on Adjust.
    expect(run(tap("R-0-0", 20), held.state).actions).toEqual([
      { type: "enter" },
    ])
    const released = run(
      [{ at: 400, key: ADJUST, type: "release" }],
      held.state
    )
    expect(activeLayer(released.state)).toBe("base")
  })

  it("tabs lock a layer; base unlocks", () => {
    const tabbed = run([{ layer: "adjust", type: "selectLayer" }])
    expect(activeLayer(tabbed.state)).toBe("adjust")
    const back = run([{ layer: "base", type: "selectLayer" }], tabbed.state)
    expect(back.state.locked).toBeNull()
  })
})

describe("hold-tap (tap dances)", () => {
  it("a quick tap types the tap action on release", () => {
    const pressed = run([{ at: 0, key: Q, type: "press" }])
    expect(pressed.actions).toEqual([])
    expect(isHoldPending(pressed.state, Q)).toBe(true)
    const released = run([{ at: 50, key: Q, type: "release" }], pressed.state)
    expect(released.actions).toEqual([{ text: "q", type: "insert" }])
    expect(released.state.down.size).toBe(0)
  })

  it("holding past the term fires the hold action once, via the timer", () => {
    const pressed = run([{ at: 100, key: Q, type: "press" }])
    const timed = step(pressed.state, {
      key: Q,
      pressedAt: 100,
      type: "holdTimeout",
    })
    expect(timed.actions).toEqual([{ type: "escape" }])
    expect(isHoldPending(timed.state, Q)).toBe(false)
    const released = run(
      [{ at: 100 + TAPPING_TERM_MS + 300, key: Q, type: "release" }],
      timed.state
    )
    expect(released.actions).toEqual([])
  })

  it("a release past the term (timer not yet run) is still the hold", () => {
    const result = run([
      { at: 0, key: Q, type: "press" },
      { at: TAPPING_TERM_MS, key: Q, type: "release" },
    ])
    expect(result.actions).toEqual([{ type: "escape" }])
  })

  it("ignores a stale timer from an earlier press", () => {
    const result = run([
      ...tap(Q, 0),
      { at: 500, key: Q, type: "press" },
      { key: Q, pressedAt: 0, type: "holdTimeout" },
    ])
    expect(result.actions).toEqual([{ text: "q", type: "insert" }])
    expect(isHoldPending(result.state, Q)).toBe(true)
  })

  it("a held Backspace hold repeats", () => {
    const pressed = run([{ at: 0, key: SEMI, type: "press" }])
    const timed = step(pressed.state, {
      key: SEMI,
      pressedAt: 0,
      type: "holdTimeout",
    })
    expect(timed.actions).toEqual([{ type: "deleteBackward" }])
    expect(timed.repeat).toBe(true)
    expect(step(timed.state, { key: SEMI, type: "repeat" }).actions).toEqual([
      { type: "deleteBackward" },
    ])
  })

  it("a modifier hold acts as held Ctrl when another key lands", () => {
    const result = run([
      { at: 0, key: SPACE, type: "press" },
      ...tap("L-2-3", 40), // c
      { at: 90, key: SPACE, type: "release" },
      ...tap("L-2-3", 200),
    ])
    expect(result.actions).toEqual([
      { char: "c", type: "ctrl" },
      { text: "c", type: "insert" },
    ])
    expect(result.state.ctrlHeld).toBe(0)
    expect(result.state.ctrlOneShot).toBe(false)
  })

  it("a non-modifier hold-tap rolls into its tap when another key lands", () => {
    const result = run([
      { at: 0, key: Q, type: "press" },
      { at: 30, key: E, type: "press" },
      { at: 60, key: Q, type: "release" },
      { at: 70, key: E, type: "release" },
    ])
    expect(result.actions).toEqual([
      { text: "q", type: "insert" },
      { text: "e", type: "insert" },
    ])
  })

  it("tapping the space hold-tap types a space", () => {
    expect(run(tap(SPACE, 0)).actions).toEqual([{ text: " ", type: "insert" }])
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
    const result = run([...tap(SHIFT, 0), ...tap(E, 100), ...tap(E, 200)])
    expect(result.actions).toEqual([
      { text: "E", type: "insert" },
      { text: "e", type: "insert" },
    ])
    expect(result.state.shiftMode).toBe("off")
  })

  it("double tap = caps: letters stay upper, punctuation unshifted", () => {
    const result = run([
      ...tap(SHIFT, 0),
      ...tap(SHIFT, 100),
      ...tap(E, 600),
      ...tap(SEMI, 700),
    ])
    expect(result.state.shiftMode).toBe("caps")
    expect(result.actions).toEqual([
      { text: "E", type: "insert" },
      { text: ";", type: "insert" },
    ])
  })

  it("held shift is a normal shift and does not arm one-shot", () => {
    const result = run([
      { at: 0, key: SHIFT, type: "press" },
      ...tap(SEMI, 20), // ; → :
      { at: 50, key: SHIFT, type: "release" },
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
      ...tap(CTRL, 0),
      ...tap("L-1-1", 100),
      ...tap("L-1-1", 200),
    ])
    expect(result.actions).toEqual([
      { char: "a", type: "ctrl" },
      { text: "a", type: "insert" },
    ])
  })

  it("maps named keys to edit actions", () => {
    expect(run(tap("L-0-0", 0)).actions).toEqual([{ type: "escape" }])
    const raise = run(tap(RAISE, 0)).state
    expect(run(tap("L-1-1", 100), raise).actions).toEqual([{ type: "tab" }])
    const lower = run(tap(LOWER, 0)).state
    expect(run(tap("R-1-3", 100), lower).actions).toEqual([
      { move: "docStart", type: "move" },
    ])
  })

  it("inert and unbound keys do nothing at all", () => {
    expect(run(tap("LT-0", 0))).toEqual({
      actions: [],
      state: INITIAL_ENGINE_STATE,
    }) // Alt
    expect(run(tap("R-0-5", 0)).state).toBe(INITIAL_ENGINE_STATE) // KC_NO
    expect(run(tap("LX-0", 0)).state).toBe(INITIAL_ENGINE_STATE) // ext
    const adjust = run(tap(ADJUST, 0)).state
    // L-0-1 is RGB toggle, L-1-1 mouse left on Adjust.
    const inert = run([...tap("L-0-1", 100), ...tap("L-1-1", 200)], adjust)
    expect(inert.actions).toEqual([])
    expect(inert.state).toBe(adjust)
  })

  it("an inert key does not decide a pending hold-tap", () => {
    const result = run([
      { at: 0, key: Q, type: "press" },
      ...tap("LT-0", 20), // Alt
    ])
    expect(result.actions).toEqual([])
    expect(isHoldPending(result.state, Q)).toBe(true)
  })

  it("characters do not repeat", () => {
    const char = step(INITIAL_ENGINE_STATE, { at: 0, key: E, type: "press" })
    expect(char.repeat).toBe(false)
    expect(step(char.state, { key: E, type: "repeat" }).actions).toEqual([])
  })

  it("reset drops held keys and one-shots but keeps a lock and caps", () => {
    const busy = run([
      ...tap(RAISE, 0), // lock raise
      { at: 100, key: CTRL, type: "press" },
      { type: "reset" },
    ])
    expect(busy.state.locked).toBe("raise")
    expect(busy.state.ctrlHeld).toBe(0)
    expect(busy.state.down.size).toBe(0)
  })
})

describe("nearestKey", () => {
  const all = () => true
  const noExt = (key: { kind: string }) => key.kind !== "ext"
  it("moves along rows and between halves", () => {
    expect(nearestKey("L-0-1", "right", noExt)).toBe("L-0-2")
    expect(nearestKey("L-0-1", "down", noExt)).toBe("L-1-1")
    expect(nearestKey("L-0-5", "right", noExt)).toBe("R-0-0")
  })
  it("stops at the edge and skips keys the predicate rejects", () => {
    expect(nearestKey("L-0-0", "left", noExt)).toBeNull()
    expect(nearestKey("L-0-5", "right", all)).toBe("LX-0")
  })
})
