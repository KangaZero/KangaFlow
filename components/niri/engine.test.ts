// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  getActiveWorkspace,
  getFocusedColumn,
  getFocusedWindow,
  initialNiriState,
  niriReducer,
} from "@/components/niri/engine"

describe("initialNiriState", () => {
  it("has 3 empty workspaces, active 1, no overview, no fullscreen", () => {
    const state = initialNiriState()
    expect(state.workspaces).toHaveLength(3)
    expect(state.workspaces.map((ws) => ws.id)).toEqual([1, 2, 3])
    expect(state.workspaces.every((ws) => ws.columns.length === 0)).toBe(true)
    expect(state.active).toBe(1)
    expect(state.overview).toBe(false)
    expect(state.fullscreenWinId).toBeNull()
  })
})

describe("spawn", () => {
  it("adds a focused column with the spawned window", () => {
    const state = niriReducer(initialNiriState(), {
      app: "terminal",
      type: "spawn",
    })
    const ws = getActiveWorkspace(state)
    expect(ws.columns).toHaveLength(1)
    expect(ws.focused).toBe(0)
    const column = getFocusedColumn(state)
    expect(column?.windows).toHaveLength(1)
    expect(column?.floating).toBe(false)
    expect(column?.width).toBeCloseTo(0.5)
    const win = getFocusedWindow(state)
    expect(win?.app).toBe("terminal")
    expect(win?.title).toBe("Terminal")
  })

  it("uses an explicit title when provided", () => {
    const state = niriReducer(initialNiriState(), {
      app: "editor",
      title: "notes.md",
      type: "spawn",
    })
    expect(getFocusedWindow(state)?.title).toBe("notes.md")
  })

  it("inserts the new column immediately after the focused one", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    const firstColId = getFocusedColumn(state)?.id
    // Focus back to the first column, then spawn: new column lands at index 1.
    state = niriReducer(state, { app: "editor", type: "spawn" })
    state = niriReducer(state, { type: "focusLeft" })
    expect(getFocusedColumn(state)?.id).toBe(firstColId)
    state = niriReducer(state, { app: "browser", type: "spawn" })
    const ws = getActiveWorkspace(state)
    expect(ws.focused).toBe(1)
    expect(ws.columns[1]?.windows[0]?.app).toBe("browser")
  })
})

describe("focus movement", () => {
  it("focusRight / focusLeft move focus and clamp at the ends", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    state = niriReducer(state, { app: "editor", type: "spawn" })
    const ws = getActiveWorkspace(state)
    expect(ws.columns).toHaveLength(2)
    expect(ws.focused).toBe(1)
    state = niriReducer(state, { type: "focusLeft" })
    expect(getActiveWorkspace(state).focused).toBe(0)
    // Clamp: already leftmost, stays at 0.
    state = niriReducer(state, { type: "focusLeft" })
    expect(getActiveWorkspace(state).focused).toBe(0)
    state = niriReducer(state, { type: "focusRight" })
    expect(getActiveWorkspace(state).focused).toBe(1)
    // Clamp: already rightmost, stays at 1.
    state = niriReducer(state, { type: "focusRight" })
    expect(getActiveWorkspace(state).focused).toBe(1)
  })
})

describe("moveRight", () => {
  it("swaps the focused column with its right neighbour and keeps it focused", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    state = niriReducer(state, { app: "editor", type: "spawn" })
    // Focus the left (terminal) column, then move it right.
    state = niriReducer(state, { type: "focusLeft" })
    const movedId = getFocusedColumn(state)?.id
    state = niriReducer(state, { type: "moveRight" })
    const ws = getActiveWorkspace(state)
    expect(ws.focused).toBe(1)
    expect(ws.columns[1]?.id).toBe(movedId)
    expect(ws.columns[0]?.windows[0]?.app).toBe("editor")
    // Clamp: at the right end, moveRight is a no-op.
    const before = niriReducer(state, { type: "moveRight" })
    expect(before).toBe(state)
  })
})

describe("close", () => {
  it("removes the focused window and drops the now-empty column", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    state = niriReducer(state, { app: "editor", type: "spawn" })
    expect(getActiveWorkspace(state).columns).toHaveLength(2)
    state = niriReducer(state, { type: "close" })
    const ws = getActiveWorkspace(state)
    expect(ws.columns).toHaveLength(1)
    expect(ws.focused).toBe(0)
    expect(ws.columns[0]?.windows[0]?.app).toBe("terminal")
  })

  it("clears fullscreen when the fullscreen window is closed", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    state = niriReducer(state, { type: "fullscreen" })
    expect(state.fullscreenWinId).not.toBeNull()
    state = niriReducer(state, { type: "close" })
    expect(state.fullscreenWinId).toBeNull()
  })

  it("is a no-op on an empty workspace", () => {
    const state = initialNiriState()
    expect(niriReducer(state, { type: "close" })).toBe(state)
  })
})

describe("workspaces", () => {
  it("focusWorkspace switches the active workspace and clamps to 1..3", () => {
    let state = initialNiriState()
    state = niriReducer(state, { id: 2, type: "focusWorkspace" })
    expect(state.active).toBe(2)
    state = niriReducer(state, { id: 99, type: "focusWorkspace" })
    expect(state.active).toBe(3)
    state = niriReducer(state, { id: -3, type: "focusWorkspace" })
    expect(state.active).toBe(1)
  })

  it("moveToWorkspace detaches the focused column and follows it", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    const movedId = getFocusedColumn(state)?.id
    state = niriReducer(state, { id: 3, type: "moveToWorkspace" })
    expect(state.active).toBe(3)
    expect(state.workspaces[0]?.columns).toHaveLength(0)
    const target = getActiveWorkspace(state)
    expect(target.id).toBe(3)
    expect(target.columns).toHaveLength(1)
    expect(target.columns[0]?.id).toBe(movedId)
    expect(target.focused).toBe(0)
  })

  it("moveToWorkspace is a no-op for the current workspace or when empty", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    expect(niriReducer(state, { id: 1, type: "moveToWorkspace" })).toBe(state)
    const empty = initialNiriState()
    expect(niriReducer(empty, { id: 4, type: "moveToWorkspace" })).toBe(empty)
  })
})

describe("fullscreen", () => {
  it("toggles the fullscreen window id on and off", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    const winId = getFocusedWindow(state)?.id
    state = niriReducer(state, { type: "fullscreen" })
    expect(state.fullscreenWinId).toBe(winId)
    state = niriReducer(state, { type: "fullscreen" })
    expect(state.fullscreenWinId).toBeNull()
  })

  it("widens the focused column to full width and restores on toggle off", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    expect(getFocusedColumn(state)?.width).toBe(1 / 2)
    state = niriReducer(state, { type: "fullscreen" })
    expect(getFocusedColumn(state)?.width).toBe(1)
    state = niriReducer(state, { type: "fullscreen" })
    expect(getFocusedColumn(state)?.width).toBe(1 / 2)
  })

  it("preserves every workspace and window while toggling", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    state = niriReducer(state, { app: "editor", type: "spawn" })
    state = niriReducer(state, { type: "fullscreen" })
    expect(state.workspaces).toHaveLength(3)
    expect(getActiveWorkspace(state).columns).toHaveLength(2)
  })
})

describe("overview", () => {
  it("toggles, and j/k (focusDown/Up) navigate workspaces while it's open", () => {
    let state = initialNiriState()
    state = niriReducer(state, { type: "toggleOverview" })
    expect(state.overview).toBe(true)
    state = niriReducer(state, { type: "focusDown" })
    expect(state.active).toBe(2)
    state = niriReducer(state, { type: "focusDown" })
    state = niriReducer(state, { type: "focusDown" })
    expect(state.active).toBe(3) // clamped to WORKSPACE_MAX
    state = niriReducer(state, { type: "focusUp" })
    expect(state.active).toBe(2)
  })

  it("focusDown moves windows, not workspaces, when overview is off", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    state = niriReducer(state, { type: "focusDown" })
    expect(state.active).toBe(1)
  })

  it("Alt+Shift+J/K rearrange workspaces in overview (active follows)", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    state = niriReducer(state, { type: "toggleOverview" })
    // Order starts [1,2,3], active 1 at index 0; moveDown swaps 1 with 2.
    state = niriReducer(state, { type: "moveDown" })
    expect(state.workspaces.map((w) => w.id)).toEqual([2, 1, 3])
    expect(state.active).toBe(1)
    // The active workspace kept its window through the swap.
    expect(state.workspaces.find((w) => w.id === 1)?.columns).toHaveLength(1)
    // moveUp puts it back.
    state = niriReducer(state, { type: "moveUp" })
    expect(state.workspaces.map((w) => w.id)).toEqual([1, 2, 3])
  })

  it("moveDown does not reorder workspaces when overview is off", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    state = niriReducer(state, { type: "moveDown" })
    expect(state.workspaces.map((w) => w.id)).toEqual([1, 2, 3])
  })
})

describe("cycleWidth", () => {
  it("advances through the presets and wraps", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    // Spawn width is 1/2 (a preset) -> next is 2/3.
    state = niriReducer(state, { type: "cycleWidth" })
    expect(getFocusedColumn(state)?.width).toBeCloseTo(2 / 3)
    state = niriReducer(state, { type: "cycleWidth" })
    expect(getFocusedColumn(state)?.width).toBeCloseTo(1)
    // Wrap back to the first preset.
    state = niriReducer(state, { type: "cycleWidth" })
    expect(getFocusedColumn(state)?.width).toBeCloseTo(1 / 3)
  })
})

describe("setWidth", () => {
  it("clamps within [MIN_WIDTH, MAX_WIDTH]", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    state = niriReducer(state, { delta: 1, type: "setWidth" })
    expect(getFocusedColumn(state)?.width).toBeCloseTo(1)
    state = niriReducer(state, { delta: -5, type: "setWidth" })
    expect(getFocusedColumn(state)?.width).toBeCloseTo(0.25)
  })
})

describe("setHeight", () => {
  it("resizes the focused window's height, clamped to [MIN_HEIGHT, MAX_HEIGHT]", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    expect(getFocusedWindow(state)?.height).toBeCloseTo(1)
    state = niriReducer(state, { delta: 0.4, type: "setHeight" })
    expect(getFocusedWindow(state)?.height).toBeCloseTo(1.4)
    state = niriReducer(state, { delta: 10, type: "setHeight" })
    expect(getFocusedWindow(state)?.height).toBeCloseTo(3) // MAX_HEIGHT
    state = niriReducer(state, { delta: -10, type: "setHeight" })
    expect(getFocusedWindow(state)?.height).toBeCloseTo(0.4) // MIN_HEIGHT
  })
})

describe("toggleOverview", () => {
  it("flips the overview flag", () => {
    let state = initialNiriState()
    expect(state.overview).toBe(false)
    state = niriReducer(state, { type: "toggleOverview" })
    expect(state.overview).toBe(true)
    state = niriReducer(state, { type: "toggleOverview" })
    expect(state.overview).toBe(false)
  })
})

describe("immutability", () => {
  it("never mutates the input state", () => {
    const state = initialNiriState()
    const snapshot = structuredClone(state)
    const next = niriReducer(state, { app: "terminal", type: "spawn" })
    expect(next).not.toBe(state)
    // Original object graph is untouched.
    expect(state).toEqual(snapshot)
    expect(state.workspaces[0]?.columns).toHaveLength(0)
  })
})
