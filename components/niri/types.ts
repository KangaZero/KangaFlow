// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Shared contract for the niri-style scrollable-tiling environment. Pure data —
// no React/DOM — so the reducer, keymap, and view all agree on one model.

import type { MatrixOptions } from "@/lib/terminal/cmatrix"

// Runnable "apps" that can occupy a window.
export type AppId = "terminal" | "editor" | "about" | "browser"

// Per-window content that survives workspace switches / unmounts and is stored
// under `kangaflow:niriWorkspaces`. Pure serializable data only — terminal
// output/scrollback is deliberately excluded (the xterm buffer is never part of
// state). Mirrors what terminal-body.tsx / browser-window.tsx read to restore.
export type TerminalWindowContent = {
  // Currently typed (unsubmitted) shell input.
  line: string
  // Submitted command history + the up-arrow cursor into it.
  history: string[]
  histIndex: number
  // Current VFS working directory + the page it maps to (`cd` drives both).
  cwd: string
  currentPage: string
  // zjstatus bar mirror (mode segment label + active tab text).
  barMode: string
  barTab: string
  // True while the nvim editor overlay owns the screen (+ its buffered content).
  editorOpen: boolean
  editorContent: string | null
  // True while the cmatrix screensaver runs (its overlay options).
  matrixRunning: boolean
  matrixOptions: MatrixOptions | null
  // True while THIS terminal runs the global desktop rain (`cmatrix -g`).
  globalRunning: boolean
  // Session birth time, so the fastfetch `ff` uptime survives unmounts.
  startedAt: number
}

// One browser tab's history stack + cursor; mirrors browser-window's Tab.
export type BrowserTab = {
  id: string
  history: string[]
  index: number
  nonce: number
}

export type BrowserWindowContent = {
  tabs: BrowserTab[]
  activeId: string
  // Current text in the address bar (may be an unsubmitted edit).
  address: string
}

export type NiriWindowContent =
  | { app: "terminal"; state: TerminalWindowContent }
  | { app: "browser"; state: BrowserWindowContent }

export type NiriWindow = {
  id: string
  app: AppId
  title: string
  // Vertical flex weight within its column's stack (1 = equal share). Adjusted
  // by the y-axis resize (Alt+Shift+-/=).
  height: number
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

// Bounds for a window's vertical flex weight (Alt+Shift+-/= resize).
export const MIN_HEIGHT = 0.4
export const MAX_HEIGHT = 3

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
  | { type: "setHeight"; delta: number }
  | { type: "toggleOverview" }
  | { type: "toggleAlignment" }
  // Click-to-focus a specific window (the view dispatches this on pointer down).
  | { type: "focusAt"; workspace: number; column: number; window: number }
  // Replace the whole layout after hydrating `kangaflow:niriWorkspaces` (the
  // persisted state was validated upstream in lib/niri-persistence).
  | { type: "restore"; state: NiriState }
