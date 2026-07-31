// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure keybind → action mapper for the niri-style scrollable-tiling environment.
// No React/DOM side effects: it inspects a KeyboardEvent and returns a NiriAction
// (or null when the key isn't a tiling bind, so the focused app keeps it). The
// compositor modifier is ALT; Shift selects the "move" variant of a directional.
// Only tiling binds live here — panel/launcher UI binds are handled elsewhere.

import type { NiriAction } from "@/components/niri/types"

type Direction = "left" | "right" | "up" | "down"

const FOCUS: Record<Direction, NiriAction> = {
  down: { type: "focusDown" },
  left: { type: "focusLeft" },
  right: { type: "focusRight" },
  up: { type: "focusUp" },
}

const MOVE: Record<Direction, NiriAction> = {
  down: { type: "moveDown" },
  left: { type: "moveLeft" },
  right: { type: "moveRight" },
  up: { type: "moveUp" },
}

// Arrow keys map directly; letters use the vim-style h/j/k/l home row.
function directionOf(key: string, lower: string): Direction | null {
  switch (key) {
    case "ArrowLeft":
      return "left"
    case "ArrowRight":
      return "right"
    case "ArrowUp":
      return "up"
    case "ArrowDown":
      return "down"
    default:
      break
  }
  switch (lower) {
    case "h":
      return "left"
    case "l":
      return "right"
    case "j":
      return "down"
    case "k":
      return "up"
    default:
      return null
  }
}

// Workspace 1..9. Prefer event.key ("1".."9"), but fall back to event.code
// ("Digit1".."Digit9") so Shift+number still resolves on layouts that report a
// shifted symbol (e.g. "!" for Shift+1).
function workspaceDigit(event: KeyboardEvent): number | null {
  const key = event.key
  if (key.length === 1 && key >= "1" && key <= "9") {
    return Number(key)
  }
  const code = event.code
  if (/^Digit[1-9]$/.test(code)) {
    return Number(code.slice(5))
  }
  return null
}

export function keyToAction(event: KeyboardEvent): NiriAction | null {
  // Ctrl/Meta belong to the browser/global shortcuts — never shadow them.
  if (event.ctrlKey || event.metaKey) {
    return null
  }
  // Every tiling bind is Alt-modified; without Alt the app owns the key.
  if (!event.altKey) {
    return null
  }

  const shift = event.shiftKey
  const key = event.key
  const lower = key.toLowerCase()

  if (key === "Enter") {
    return shift
      ? { app: "browser", type: "spawn" }
      : { app: "terminal", type: "spawn" }
  }

  const digit = workspaceDigit(event)
  if (digit !== null) {
    return shift
      ? { id: digit, type: "moveToWorkspace" }
      : { id: digit, type: "focusWorkspace" }
  }

  const direction = directionOf(key, lower)
  if (direction !== null) {
    return shift ? MOVE[direction] : FOCUS[direction]
  }

  switch (lower) {
    case "q":
      return shift ? { type: "close" } : null
    case "f":
      return shift ? { type: "cycleWidth" } : { type: "fullscreen" }
    case "t":
      return shift ? null : { type: "toggleFloat" }
    case "c":
      return shift ? { type: "centerColumn" } : null
    case "o":
      return shift ? { type: "toggleOverview" } : null
    case "r":
      return shift ? null : { type: "cycleWidth" }
    case "z":
      return shift ? null : { type: "toggleAlignment" }
    default:
      break
  }

  // Incremental column resize (no Shift variant).
  if (!shift) {
    if (key === "-") {
      return { delta: -0.1, type: "setWidth" }
    }
    if (key === "=") {
      return { delta: 0.1, type: "setWidth" }
    }
  }

  return null
}
