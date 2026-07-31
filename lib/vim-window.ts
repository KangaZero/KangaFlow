// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure vim-motion mapping for floating windows: translate a keypress into a
// move / snap / resize action. No DOM — the view supplies rects and applies the
// result — so this is unit-testable.

export type Edge = "top" | "bottom" | "left" | "right"

export type VimWindowAction =
  | { type: "move"; dx: number; dy: number }
  | { type: "snap"; edge: Edge }
  | { type: "resize"; axis: "width" | "height"; dir: 1 | -1 }

// Pixels per nudge (Shift+H/J/K/L) and per resize step (Alt+-/=, Alt+Shift+-/=).
export const MOVE_STEP = 24
export const RESIZE_STEP = 40

type Mods = { shift: boolean; alt: boolean }

// Map one keypress to an action. `key` is the produced character (vim motions
// are character-based); `code` is the layout-independent physical key, used for
// resize so `Alt+-/=` works regardless of keyboard layout (where the shifted
// symbol would otherwise differ). `prevG` carries the pending-`g` state for the
// two-key `gg` motion; the returned `pendingG` must be threaded back in.
//   Shift+H/J/K/L  move        gg  snap top      G  snap bottom
//   0  snap left    $  snap right
//   Alt+-/=  resize width      Alt+Shift+-/=  resize height
export function vimWindowAction(
  key: string,
  code: string,
  mods: Mods,
  prevG: boolean
): { action: VimWindowAction | null; pendingG: boolean } {
  const { shift, alt } = mods

  // Resize (Alt) — keyed off physical `code` ("Minus"/"Equal") so it's
  // layout-independent (the shifted symbol varies across keyboards).
  if (alt && (code === "Minus" || code === "Equal")) {
    const dir = code === "Equal" ? 1 : -1
    return {
      action: { axis: shift ? "height" : "width", dir, type: "resize" },
      pendingG: false,
    }
  }

  // Snap. `gg` needs a pending-g; the first plain "g" arms it.
  if (!alt && key === "g") {
    return prevG
      ? { action: { edge: "top", type: "snap" }, pendingG: false }
      : { action: null, pendingG: true }
  }
  if (!alt && key === "G") {
    return { action: { edge: "bottom", type: "snap" }, pendingG: false }
  }
  if (!alt && key === "0") {
    return { action: { edge: "left", type: "snap" }, pendingG: false }
  }
  if (!alt && key === "$") {
    return { action: { edge: "right", type: "snap" }, pendingG: false }
  }

  // Move (Shift + h/j/k/l, or Shift + arrow keys for accessibility — Shift makes
  // letters uppercase but leaves arrow key names unchanged).
  if (shift && !alt) {
    const lower = key.toLowerCase()
    if (lower === "h" || key === "ArrowLeft") {
      return {
        action: { dx: -MOVE_STEP, dy: 0, type: "move" },
        pendingG: false,
      }
    }
    if (lower === "l" || key === "ArrowRight") {
      return { action: { dx: MOVE_STEP, dy: 0, type: "move" }, pendingG: false }
    }
    if (lower === "k" || key === "ArrowUp") {
      return {
        action: { dx: 0, dy: -MOVE_STEP, type: "move" },
        pendingG: false,
      }
    }
    if (lower === "j" || key === "ArrowDown") {
      return { action: { dx: 0, dy: MOVE_STEP, type: "move" }, pendingG: false }
    }
  }

  // Any other key clears a pending `g`.
  return { action: null, pendingG: false }
}

type Rect = { top: number; left: number; right: number; bottom: number }
type Viewport = { width: number; height: number }

// The drag-offset delta that moves a window (currently at `rect`) flush to a
// viewport edge, leaving `pad` px of margin. Added to the window's x/y offset.
export function snapDelta(
  rect: Rect,
  viewport: Viewport,
  edge: Edge,
  pad: number
): { dx: number; dy: number } {
  switch (edge) {
    case "top":
      return { dx: 0, dy: -(rect.top - pad) }
    case "bottom":
      return { dx: 0, dy: viewport.height - rect.bottom - pad }
    case "left":
      return { dx: -(rect.left - pad), dy: 0 }
    case "right":
      return { dx: viewport.width - rect.right - pad, dy: 0 }
    default:
      return { dx: 0, dy: 0 }
  }
}
