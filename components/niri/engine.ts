// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure state reducer for the niri-style scrollable-tiling window manager. No
// React / DOM / Node — just data in, new data out. The view renders this and
// the keymap dispatches into it; this module owns all layout mutation rules.

import type {
  AppId,
  NiriAction,
  NiriColumn,
  NiriState,
  NiriWindow,
  NiriWorkspace,
} from "@/components/niri/types"
import {
  MAX_HEIGHT,
  MAX_WIDTH,
  MIN_HEIGHT,
  MIN_WIDTH,
  WIDTH_PRESETS,
} from "@/components/niri/types"

// Deterministic id source. A module-local counter keeps ids stable and testable
// without pulling in crypto / Date (both banned here: this file is pure).
let seq = 0
const uid = (prefix: string): string => `${prefix}-${++seq}`

// Default window titles per app, so a bare `spawn` still gets a sensible label.
const DEFAULT_TITLES: Record<AppId, string> = {
  about: "About",
  browser: "Browser",
  editor: "Editor",
  terminal: "Terminal",
}

export const WORKSPACE_MIN = 1
export const WORKSPACE_MAX = 3
const SPAWN_WIDTH = 1 / 2
// Hard cap on total open windows across all workspaces.
const WINDOW_MAX = 20

function totalWindows(state: NiriState): number {
  return state.workspaces.reduce(
    (n, ws) => n + ws.columns.reduce((m, col) => m + col.windows.length, 0),
    0
  )
}

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

// Clamp an index into a list of `length` items; empty list collapses to 0.
function clampIndex(index: number, length: number): number {
  if (length <= 0) return 0
  return clamp(index, 0, length - 1)
}

// Replace the active workspace with `fn(workspace)`, leaving the rest untouched.
function mapActiveWorkspace(
  state: NiriState,
  fn: (workspace: NiriWorkspace) => NiriWorkspace
): NiriState {
  return {
    ...state,
    workspaces: state.workspaces.map((workspace) =>
      workspace.id === state.active ? fn(workspace) : workspace
    ),
  }
}

// Replace the column at `index` with `fn(column)` inside a workspace.
function mapColumn(
  workspace: NiriWorkspace,
  index: number,
  fn: (column: NiriColumn) => NiriColumn
): NiriWorkspace {
  return {
    ...workspace,
    columns: workspace.columns.map((column, i) =>
      i === index ? fn(column) : column
    ),
  }
}

// Next width in the preset cycle. Wraps at the end. If the current width is not
// itself a preset, snap up to the first preset >= it (else the first preset).
function nextWidth(current: number): number {
  const index = WIDTH_PRESETS.indexOf(current)
  if (index >= 0) {
    const next = (index + 1) % WIDTH_PRESETS.length
    return WIDTH_PRESETS[next] ?? WIDTH_PRESETS[0]
  }
  const bigger = WIDTH_PRESETS.find((preset) => preset >= current)
  return bigger ?? WIDTH_PRESETS[0]
}

// ---------------------------------------------------------------------------
// Public factory + selectors
// ---------------------------------------------------------------------------

export function initialNiriState(): NiriState {
  const workspaces: NiriWorkspace[] = Array.from(
    { length: WORKSPACE_MAX },
    (_, i) => ({ columns: [], focused: 0, id: i + 1 })
  )
  return {
    active: 1,
    fullscreenWinId: null,
    isCenterAligned: false,
    overview: false,
    workspaces,
  }
}

export function getActiveWorkspace(state: NiriState): NiriWorkspace {
  const found = state.workspaces.find(
    (workspace) => workspace.id === state.active
  )
  if (found) return found
  const first = state.workspaces[0]
  if (first) return first
  // Defensive: a state with no workspaces should never occur, but the selector
  // must still return a valid workspace rather than throw.
  return { columns: [], focused: 0, id: state.active }
}

export function getFocusedColumn(state: NiriState): NiriColumn | null {
  const workspace = getActiveWorkspace(state)
  return workspace.columns[workspace.focused] ?? null
}

export function getFocusedWindow(state: NiriState): NiriWindow | null {
  const column = getFocusedColumn(state)
  if (!column) return null
  return column.windows[column.focused] ?? null
}

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

export function niriReducer(state: NiriState, action: NiriAction): NiriState {
  switch (action.type) {
    case "spawn": {
      if (totalWindows(state) >= WINDOW_MAX) return state
      const window: NiriWindow = {
        app: action.app,
        height: 1,
        id: uid("win"),
        title: action.title ?? DEFAULT_TITLES[action.app],
      }
      const column: NiriColumn = {
        floating: false,
        focused: 0,
        id: uid("col"),
        width: SPAWN_WIDTH,
        windows: [window],
      }
      return mapActiveWorkspace(state, (workspace) => {
        const insertAt =
          workspace.columns.length === 0 ? 0 : workspace.focused + 1
        const columns = [
          ...workspace.columns.slice(0, insertAt),
          column,
          ...workspace.columns.slice(insertAt),
        ]
        return { ...workspace, columns, focused: insertAt }
      })
    }

    case "close": {
      const workspace = getActiveWorkspace(state)
      const column = workspace.columns[workspace.focused]
      if (!column) return state
      const focusedWin = column.windows[column.focused]
      if (!focusedWin) return state
      const clearedFullscreen =
        state.fullscreenWinId === focusedWin.id ? null : state.fullscreenWinId
      const windows = column.windows.filter((_, i) => i !== column.focused)
      if (windows.length === 0) {
        const columns = workspace.columns.filter(
          (_, i) => i !== workspace.focused
        )
        return mapActiveWorkspace(
          { ...state, fullscreenWinId: clearedFullscreen },
          (ws) => ({
            ...ws,
            columns,
            focused: clampIndex(ws.focused, columns.length),
          })
        )
      }
      return mapActiveWorkspace(
        { ...state, fullscreenWinId: clearedFullscreen },
        (ws) =>
          mapColumn(ws, ws.focused, (col) => ({
            ...col,
            focused: clampIndex(col.focused, windows.length),
            windows,
          }))
      )
    }

    case "focusLeft":
    case "focusRight": {
      const workspace = getActiveWorkspace(state)
      if (workspace.columns.length === 0) return state
      const dir = action.type === "focusLeft" ? -1 : 1
      const focused = clamp(
        workspace.focused + dir,
        0,
        workspace.columns.length - 1
      )
      if (focused === workspace.focused) return state
      return mapActiveWorkspace(state, (ws) => ({ ...ws, focused }))
    }

    case "focusUp":
    case "focusDown": {
      const dir = action.type === "focusUp" ? -1 : 1
      // In overview, up/down navigate between the vertically-stacked workspaces
      // BY POSITION (ids may not match order after rearranging); otherwise they
      // move within the focused column's window stack.
      if (state.overview) {
        const index = state.workspaces.findIndex((w) => w.id === state.active)
        const next =
          state.workspaces[clampIndex(index + dir, state.workspaces.length)]
        return next ? { ...state, active: next.id } : state
      }
      const column = getFocusedColumn(state)
      if (!column) return state
      const focused = clamp(column.focused + dir, 0, column.windows.length - 1)
      if (focused === column.focused) return state
      return mapActiveWorkspace(state, (ws) =>
        mapColumn(ws, ws.focused, (col) => ({ ...col, focused }))
      )
    }

    case "moveLeft":
    case "moveRight": {
      const workspace = getActiveWorkspace(state)
      const column = workspace.columns[workspace.focused]
      if (!column) return state
      const dir = action.type === "moveLeft" ? -1 : 1
      const target = workspace.focused + dir
      if (target < 0 || target >= workspace.columns.length) return state
      const other = workspace.columns[target]
      if (!other) return state
      const columns = workspace.columns.map((col, i) => {
        if (i === workspace.focused) return other
        if (i === target) return column
        return col
      })
      return mapActiveWorkspace(state, (ws) => ({
        ...ws,
        columns,
        focused: target,
      }))
    }

    case "moveUp":
    case "moveDown": {
      const dir = action.type === "moveUp" ? -1 : 1
      // In overview, rearrange the stack: swap the active workspace with its
      // neighbour. The active id follows it, so selection stays on it and the
      // view's `layout` animation flips the two tiles.
      if (state.overview) {
        const index = state.workspaces.findIndex((w) => w.id === state.active)
        const target = index + dir
        if (index < 0 || target < 0 || target >= state.workspaces.length) {
          return state
        }
        const a = state.workspaces[index]
        const b = state.workspaces[target]
        if (!(a && b)) return state
        const workspaces = state.workspaces.map((w, i) => {
          if (i === index) return b
          if (i === target) return a
          return w
        })
        return { ...state, workspaces }
      }
      const column = getFocusedColumn(state)
      if (!column) return state
      const target = column.focused + dir
      if (target < 0 || target >= column.windows.length) return state
      const current = column.windows[column.focused]
      const other = column.windows[target]
      if (!current || !other) return state
      const windows = column.windows.map((win, i) => {
        if (i === column.focused) return other
        if (i === target) return current
        return win
      })
      return mapActiveWorkspace(state, (ws) =>
        mapColumn(ws, ws.focused, (col) => ({
          ...col,
          focused: target,
          windows,
        }))
      )
    }

    case "focusWorkspace":
      return {
        ...state,
        active: clamp(action.id, WORKSPACE_MIN, WORKSPACE_MAX),
      }

    case "restore":
      // Layout already validated + sanitised by lib/niri-persistence's loader.
      return action.state

    case "moveToWorkspace": {
      const column = getFocusedColumn(state)
      if (!column) return state
      const targetId = clamp(action.id, WORKSPACE_MIN, WORKSPACE_MAX)
      if (targetId === state.active) return state
      if (!state.workspaces.some((ws) => ws.id === targetId)) return state
      const workspaces = state.workspaces.map((ws) => {
        if (ws.id === state.active) {
          const columns = ws.columns.filter((_, i) => i !== ws.focused)
          return {
            ...ws,
            columns,
            focused: clampIndex(ws.focused, columns.length),
          }
        }
        if (ws.id === targetId) {
          const columns = [...ws.columns, column]
          return { ...ws, columns, focused: columns.length - 1 }
        }
        return ws
      })
      return { ...state, active: targetId, workspaces }
    }

    case "fullscreen": {
      const workspace = getActiveWorkspace(state)
      const column = workspace.columns[workspace.focused]
      if (!column) return state
      const focusedWin = column.windows[column.focused]
      if (!focusedWin) return state
      // Read the toggle direction BEFORE flipping fullscreenWinId below.
      const isFullscreen = state.fullscreenWinId === focusedWin.id
      return mapActiveWorkspace(
        {
          ...state,
          fullscreenWinId: isFullscreen ? null : focusedWin.id,
        },
        (ws) =>
          mapColumn(ws, ws.focused, (col) => ({
            ...col,
            // Enter → full strip width; exit → back to the spawn half-width.
            width: isFullscreen ? SPAWN_WIDTH : 1,
          }))
      )
    }

    case "toggleFloat": {
      const workspace = getActiveWorkspace(state)
      if (!workspace.columns[workspace.focused]) return state
      return mapActiveWorkspace(state, (ws) =>
        mapColumn(ws, ws.focused, (col) => ({
          ...col,
          floating: !col.floating,
        }))
      )
    }

    case "centerColumn":
      // Centering is a view concern (scroll offset), not layout state.
      return state

    case "cycleWidth": {
      const workspace = getActiveWorkspace(state)
      const column = workspace.columns[workspace.focused]
      if (!column) return state
      const width = nextWidth(column.width)
      return mapActiveWorkspace(state, (ws) =>
        mapColumn(ws, ws.focused, (col) => ({ ...col, width }))
      )
    }
    case "setWidth": {
      const workspace = getActiveWorkspace(state)
      const column = workspace.columns[workspace.focused]
      if (!column) return state
      const width = clamp(column.width + action.delta, MIN_WIDTH, MAX_WIDTH)
      return mapActiveWorkspace(state, (ws) =>
        mapColumn(ws, ws.focused, (col) => ({ ...col, width }))
      )
    }

    // Resize the focused window's vertical share within its column's stack.
    case "setHeight": {
      const workspace = getActiveWorkspace(state)
      const column = workspace.columns[workspace.focused]
      if (!column) return state
      const win = column.windows[column.focused]
      if (!win) return state
      const height = clamp(win.height + action.delta, MIN_HEIGHT, MAX_HEIGHT)
      return mapActiveWorkspace(state, (ws) =>
        mapColumn(ws, ws.focused, (col) => ({
          ...col,
          windows: col.windows.map((w, i) =>
            i === col.focused ? { ...w, height } : w
          ),
        }))
      )
    }

    case "toggleOverview":
      return { ...state, overview: !state.overview }

    case "toggleAlignment":
      return { ...state, isCenterAligned: !state.isCenterAligned }

    case "focusAt": {
      const active = clamp(action.workspace, WORKSPACE_MIN, WORKSPACE_MAX)
      return {
        ...state,
        active,
        workspaces: state.workspaces.map((ws) => {
          if (ws.id !== active) return ws
          if (ws.columns.length === 0) return { ...ws, focused: 0 }
          const focused = clamp(action.column, 0, ws.columns.length - 1)
          return {
            ...ws,
            columns: ws.columns.map((col, i) => {
              if (i !== focused || col.windows.length === 0) return col
              return {
                ...col,
                focused: clamp(action.window, 0, col.windows.length - 1),
              }
            }),
            focused,
          }
        }),
      }
    }

    default:
      return state
  }
}
