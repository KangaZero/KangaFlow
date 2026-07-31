// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { MOVE_STEP, snapDelta, vimWindowAction } from "@/lib/vim-window"

const mods = (o?: Partial<{ shift: boolean; alt: boolean }>) => ({
  alt: false,
  shift: false,
  ...o,
})

describe("vimWindowAction()", () => {
  it("moves with Shift+H/J/K/L", () => {
    expect(
      vimWindowAction("H", "KeyH", mods({ shift: true }), false).action
    ).toEqual({
      dx: -MOVE_STEP,
      dy: 0,
      type: "move",
    })
    expect(
      vimWindowAction("L", "KeyL", mods({ shift: true }), false).action
    ).toEqual({
      dx: MOVE_STEP,
      dy: 0,
      type: "move",
    })
    expect(
      vimWindowAction("K", "KeyK", mods({ shift: true }), false).action
    ).toEqual({
      dx: 0,
      dy: -MOVE_STEP,
      type: "move",
    })
    expect(
      vimWindowAction("J", "KeyJ", mods({ shift: true }), false).action
    ).toEqual({
      dx: 0,
      dy: MOVE_STEP,
      type: "move",
    })
  })

  it("does not move on plain h/j/k/l (needs Shift)", () => {
    expect(vimWindowAction("h", "KeyH", mods(), false).action).toBeNull()
  })

  it("moves with Shift+arrow keys too (accessibility)", () => {
    expect(
      vimWindowAction("ArrowLeft", "ArrowLeft", mods({ shift: true }), false)
        .action
    ).toEqual({ dx: -MOVE_STEP, dy: 0, type: "move" })
    expect(
      vimWindowAction("ArrowDown", "ArrowDown", mods({ shift: true }), false)
        .action
    ).toEqual({ dx: 0, dy: MOVE_STEP, type: "move" })
  })

  it("snaps: gg → top (two-key), G → bottom, 0 → left, $ → right", () => {
    const first = vimWindowAction("g", "KeyG", mods(), false)
    expect(first.action).toBeNull()
    expect(first.pendingG).toBe(true)
    expect(vimWindowAction("g", "KeyG", mods(), true).action).toEqual({
      edge: "top",
      type: "snap",
    })
    expect(
      vimWindowAction("G", "KeyG", mods({ shift: true }), false).action
    ).toEqual({
      edge: "bottom",
      type: "snap",
    })
    expect(vimWindowAction("0", "Digit0", mods(), false).action).toEqual({
      edge: "left",
      type: "snap",
    })
    expect(
      vimWindowAction("$", "Digit4", mods({ shift: true }), false).action
    ).toEqual({
      edge: "right",
      type: "snap",
    })
  })

  it("resizes off the physical code, independent of layout", () => {
    expect(
      vimWindowAction("-", "Minus", mods({ alt: true }), false).action
    ).toEqual({
      axis: "width",
      dir: -1,
      type: "resize",
    })
    expect(
      vimWindowAction("=", "Equal", mods({ alt: true }), false).action
    ).toEqual({
      axis: "width",
      dir: 1,
      type: "resize",
    })
    // Shifted symbols differ across keyboards ("_"/"+" here, or anything else) —
    // the code still resolves them to a height resize.
    expect(
      vimWindowAction("?", "Minus", mods({ alt: true, shift: true }), false)
        .action
    ).toEqual({ axis: "height", dir: -1, type: "resize" })
    expect(
      vimWindowAction("*", "Equal", mods({ alt: true, shift: true }), false)
        .action
    ).toEqual({ axis: "height", dir: 1, type: "resize" })
  })

  it("ignores unrelated keys and clears a pending g", () => {
    const r = vimWindowAction("a", "KeyA", mods(), true)
    expect(r.action).toBeNull()
    expect(r.pendingG).toBe(false)
  })
})

describe("snapDelta()", () => {
  const viewport = { height: 800, width: 1000 }
  const rect = { bottom: 400, left: 200, right: 500, top: 100 }

  it("computes the offset to each edge, minus padding", () => {
    expect(snapDelta(rect, viewport, "top", 8)).toEqual({
      dx: 0,
      dy: -(100 - 8),
    })
    expect(snapDelta(rect, viewport, "bottom", 8)).toEqual({
      dx: 0,
      dy: 800 - 400 - 8,
    })
    expect(snapDelta(rect, viewport, "left", 8)).toEqual({
      dx: -(200 - 8),
      dy: 0,
    })
    expect(snapDelta(rect, viewport, "right", 8)).toEqual({
      dx: 1000 - 500 - 8,
      dy: 0,
    })
  })
})
