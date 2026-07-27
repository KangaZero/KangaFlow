// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { keyToAction } from "@/components/niri/keymap"

type EventInit = {
  key: string
  altKey?: boolean
  shiftKey?: boolean
  ctrlKey?: boolean
  metaKey?: boolean
  code?: string
}

function press(init: EventInit): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    altKey: init.altKey ?? false,
    code: init.code ?? "",
    ctrlKey: init.ctrlKey ?? false,
    key: init.key,
    metaKey: init.metaKey ?? false,
    shiftKey: init.shiftKey ?? false,
  })
}

describe("keyToAction", () => {
  it("Alt+Enter spawns a terminal", () => {
    expect(keyToAction(press({ altKey: true, key: "Enter" }))).toEqual({
      app: "terminal",
      type: "spawn",
    })
  })

  it("Alt+Shift+Enter spawns a browser", () => {
    expect(
      keyToAction(press({ altKey: true, key: "Enter", shiftKey: true }))
    ).toEqual({ app: "browser", type: "spawn" })
  })

  it("Alt+Shift+Q closes the window", () => {
    expect(
      keyToAction(press({ altKey: true, key: "Q", shiftKey: true }))
    ).toEqual({ type: "close" })
  })

  it("Alt+L focuses right", () => {
    expect(keyToAction(press({ altKey: true, key: "l" }))).toEqual({
      type: "focusRight",
    })
  })

  it("Alt+Shift+L moves right", () => {
    expect(
      keyToAction(press({ altKey: true, key: "L", shiftKey: true }))
    ).toEqual({ type: "moveRight" })
  })

  it("Alt+ArrowLeft focuses left", () => {
    expect(keyToAction(press({ altKey: true, key: "ArrowLeft" }))).toEqual({
      type: "focusLeft",
    })
  })

  it("Alt+3 focuses workspace 3", () => {
    expect(keyToAction(press({ altKey: true, key: "3" }))).toEqual({
      id: 3,
      type: "focusWorkspace",
    })
  })

  it("Alt+Shift+3 moves to workspace 3 (via event.code fallback)", () => {
    expect(
      keyToAction(
        press({ altKey: true, code: "Digit3", key: "#", shiftKey: true })
      )
    ).toEqual({ id: 3, type: "moveToWorkspace" })
  })

  it("Alt+F toggles fullscreen", () => {
    expect(keyToAction(press({ altKey: true, key: "f" }))).toEqual({
      type: "fullscreen",
    })
  })

  it("Alt+Shift+F cycles column width (maximize ≈ widen)", () => {
    expect(
      keyToAction(press({ altKey: true, key: "F", shiftKey: true }))
    ).toEqual({ type: "cycleWidth" })
  })

  it("Alt+T toggles floating", () => {
    expect(keyToAction(press({ altKey: true, key: "t" }))).toEqual({
      type: "toggleFloat",
    })
  })

  it("Alt+Minus nudges width down", () => {
    expect(keyToAction(press({ altKey: true, key: "-" }))).toEqual({
      delta: -0.1,
      type: "setWidth",
    })
  })

  it("Alt+Equal nudges width up", () => {
    expect(keyToAction(press({ altKey: true, key: "=" }))).toEqual({
      delta: 0.1,
      type: "setWidth",
    })
  })

  it("returns null for a plain key with no Alt", () => {
    expect(keyToAction(press({ key: "a" }))).toBeNull()
  })

  it("returns null when Ctrl is held alongside Alt", () => {
    expect(
      keyToAction(press({ altKey: true, ctrlKey: true, key: "l" }))
    ).toBeNull()
  })
})
