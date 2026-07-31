// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Shared contract for the niri-style scrollable-tiling environment. Pure data —
// no React/DOM — so the reducer, keymap, and view all agree on one model.

// Runnable "apps" that can occupy a window.
export type AppId = "terminal" | "editor" | "about" | "browser"

export type NiriWindow = {
  id: string
  app: AppId
  title: string
}

// A niri column is a vertical stack of windows on the horizontal strip. Width is
// a proportion of the working area (niri's preset column widths).
export type NiriColumn = {
  id: string
  windows: NiriWindow[]
  focused: number // index into `windows`
  width: number // 0..1 proportion of the strip viewport
  floating: boolean
}

export type NiriWorkspace = {
  id: number // 1..N, workspaces stack vertically
  columns: NiriColumn[]
  focused: number // index into `columns`
}

export type NiriState = {
  isCenterAligned: boolean
  workspaces: NiriWorkspace[]
  active: number // active workspace id
  overview: boolean
  fullscreenWinId: string | null
}

// Column-width presets cycled by `cycleWidth` (Alt+R), and the clamp bounds for
// incremental resize (Alt+Minus/Equal).
export const WIDTH_PRESETS = [1 / 3, 1 / 2, 2 / 3, 1] as const
export const MIN_WIDTH = 0.25
export const MAX_WIDTH = 1

export type NiriAction =
  | { type: "spawn"; app: AppId; title?: string }
  | { type: "close" }
  | { type: "focusLeft" }
  | { type: "focusRight" }
  | { type: "focusUp" }
  | { type: "focusDown" }
  | { type: "moveLeft" }
  | { type: "moveRight" }
  | { type: "moveUp" }
  | { type: "moveDown" }
  | { type: "focusWorkspace"; id: number }
  | { type: "moveToWorkspace"; id: number }
  | { type: "fullscreen" }
  | { type: "toggleFullscreen" }
  | { type: "toggleFloat" }
  | { type: "centerColumn" }
  | { type: "cycleWidth" }
  | { type: "setWidth"; delta: number }
  | { type: "toggleOverview" }
  | { type: "toggleAlignment" }
  // Click-to-focus a specific window (the view dispatches this on pointer down).
  | { type: "focusAt"; workspace: number; column: number; window: number }
