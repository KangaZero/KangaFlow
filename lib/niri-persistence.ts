// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Persistence for the niri desktop layout + per-window app content under the
// `kangaflow:niriWorkspaces` localStorage key. The saved blob is the full layout
// (workspaces → columns → windows) with each window's serializable content
// attached. On load the content is pushed back into the in-session cache
// (lib/niri-window-cache) and stripped off the reducer state.
//
// Terminal command OUTPUT/scrollback is never stored — only user input, history,
// cwd, running-command flags (cmatrix / editor overlay), and browser tab state.

import {
  initialNiriState,
  WORKSPACE_MAX,
  WORKSPACE_MIN,
} from "@/components/niri/engine"
import type {
  AppId,
  BrowserTab,
  BrowserWindowContent,
  NiriColumn,
  NiriState,
  NiriWindow,
  NiriWindowContent,
  NiriWorkspace,
  TerminalWindowContent,
} from "@/components/niri/types"
import {
  MAX_HEIGHT,
  MAX_WIDTH,
  MIN_HEIGHT,
  MIN_WIDTH,
} from "@/components/niri/types"
import {
  getWindowContent,
  pruneWindowContent,
  setWindowContent,
} from "@/lib/niri-window-cache"
import type { MatrixOptions } from "@/lib/terminal/cmatrix"

export const NIRI_WORKSPACES_STORAGE_KEY = "kangaflow:niriWorkspaces"

const APP_IDS: readonly AppId[] = ["about", "browser", "editor", "terminal"]
const DEFAULT_TITLES: Record<AppId, string> = {
  about: "About",
  browser: "Browser",
  editor: "Editor",
  terminal: "Terminal",
}
const MATRIX_THEMES = ["light", "dark", "terminal"] as const
const SPAWN_WIDTH = 1 / 2

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isAppId(value: unknown): value is AppId {
  return (
    typeof value === "string" && (APP_IDS as readonly string[]).includes(value)
  )
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function clampInt(value: unknown, min: number, max: number): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return min
  return clamp(Math.round(n), min, max)
}

function pickMatrixOptions(raw: unknown): MatrixOptions | null {
  if (!isRecord(raw)) return null
  const speed = Number(raw.speed)
  const density = Number(raw.density)
  if (!Number.isFinite(speed) || !Number.isFinite(density)) return null
  if (typeof raw.bold !== "boolean") return null
  if (
    typeof raw.theme !== "string" ||
    !(MATRIX_THEMES as readonly string[]).includes(raw.theme)
  ) {
    return null
  }
  return {
    bold: raw.bold,
    density,
    speed,
    theme: raw.theme as MatrixOptions["theme"],
  }
}

function pickTerminalContent(raw: unknown): TerminalWindowContent | null {
  const s = isRecord(raw) ? raw : {}
  const history = Array.isArray(s.history)
    ? s.history.filter((h): h is string => typeof h === "string")
    : []
  const matrixOptions = pickMatrixOptions(s.matrixOptions)
  const matrixRunning = s.matrixRunning === true && matrixOptions !== null
  const editorContent =
    typeof s.editorContent === "string" ? s.editorContent : null
  const editorOpen = s.editorOpen === true && editorContent !== null
  return {
    barMode: typeof s.barMode === "string" ? s.barMode : "NORMAL",
    barTab: typeof s.barTab === "string" ? s.barTab : "zsh",
    currentPage: typeof s.currentPage === "string" ? s.currentPage : "home",
    cwd: typeof s.cwd === "string" ? s.cwd : "/",
    editorContent,
    editorOpen,
    globalRunning: s.globalRunning === true,
    histIndex: clampInt(s.histIndex, 0, history.length),
    history,
    line: typeof s.line === "string" ? s.line : "",
    matrixOptions,
    matrixRunning,
    startedAt:
      typeof s.startedAt === "number" && Number.isFinite(s.startedAt)
        ? s.startedAt
        : Date.now(),
  }
}

function pickBrowserContent(raw: unknown): BrowserWindowContent | null {
  const s = isRecord(raw) ? raw : {}
  const tabs = (Array.isArray(s.tabs) ? s.tabs : [])
    .map((t): BrowserTab | null => {
      if (!isRecord(t)) return null
      const id = typeof t.id === "string" ? t.id : ""
      const history = Array.isArray(t.history)
        ? t.history.filter((u): u is string => typeof u === "string")
        : []
      if (id === "" || history.length === 0) return null
      return {
        history,
        id,
        index: clampInt(t.index, 0, history.length - 1),
        nonce:
          typeof t.nonce === "number" && Number.isFinite(t.nonce) ? t.nonce : 0,
      }
    })
    .filter((t): t is BrowserTab => t !== null)
  if (tabs.length === 0) return null
  const activeId =
    typeof s.activeId === "string" && tabs.some((t) => t.id === s.activeId)
      ? s.activeId
      : (tabs[0]?.id ?? "")
  const active = tabs.find((t) => t.id === activeId) ?? tabs[0]
  return {
    activeId,
    address:
      typeof s.address === "string"
        ? s.address
        : (active?.history[active.index] ?? ""),
    tabs,
  }
}

// Validate one window's content blob against its app's expected shape.
function pickWindowContent(
  app: unknown,
  raw: unknown
): NiriWindowContent | null {
  if (!isRecord(raw)) return null
  if (app === "terminal") {
    const state = pickTerminalContent(raw.state)
    return state === null ? null : { app: "terminal", state }
  }
  if (app === "browser") {
    const state = pickBrowserContent(raw.state)
    return state === null ? null : { app: "browser", state }
  }
  return null
}

function pickWindow(raw: unknown): NiriWindow | null {
  if (!isRecord(raw)) return null
  if (typeof raw.id !== "string" || raw.id === "") return null
  if (!isAppId(raw.app)) return null
  const height = Number(raw.height)
  return {
    app: raw.app,
    height: Number.isFinite(height) ? clamp(height, MIN_HEIGHT, MAX_HEIGHT) : 1,
    id: raw.id,
    title:
      typeof raw.title === "string" && raw.title !== ""
        ? raw.title
        : DEFAULT_TITLES[raw.app],
  }
}

function pickColumn(raw: unknown): NiriColumn | null {
  if (!isRecord(raw)) return null
  if (typeof raw.id !== "string" || raw.id === "") return null
  const windows = Array.isArray(raw.windows)
    ? raw.windows.map(pickWindow).filter((w): w is NiriWindow => w !== null)
    : []
  if (windows.length === 0) return null
  const width = Number(raw.width)
  return {
    floating: raw.floating === true,
    focused: clampInt(raw.focused, 0, windows.length - 1),
    id: raw.id,
    width: Number.isFinite(width)
      ? clamp(width, MIN_WIDTH, MAX_WIDTH)
      : SPAWN_WIDTH,
    windows,
  }
}

function pickWorkspace(raw: unknown): NiriWorkspace | null {
  if (!isRecord(raw)) return null
  const id = Number(raw.id)
  if (!Number.isInteger(id) || id < WORKSPACE_MIN || id > WORKSPACE_MAX)
    return null
  const columns = Array.isArray(raw.columns)
    ? raw.columns.map(pickColumn).filter((c): c is NiriColumn => c !== null)
    : []
  return {
    columns,
    focused: clampInt(raw.focused, 0, Math.max(0, columns.length - 1)),
    id,
  }
}

// Collect every window's validated content from the raw blob, keyed by window id.
function collectContent(stored: unknown[]): Map<string, NiriWindowContent> {
  const out = new Map<string, NiriWindowContent>()
  for (const rawWs of stored) {
    if (!isRecord(rawWs) || !Array.isArray(rawWs.columns)) continue
    for (const rawCol of rawWs.columns) {
      if (!isRecord(rawCol) || !Array.isArray(rawCol.windows)) continue
      for (const rawWin of rawCol.windows) {
        if (!isRecord(rawWin) || typeof rawWin.id !== "string") continue
        const content = pickWindowContent(rawWin.app, rawWin.content)
        if (content !== null) out.set(rawWin.id, content)
      }
    }
  }
  return out
}

function hasWindow(workspaces: NiriWorkspace[], id: string): boolean {
  return workspaces.some((ws) =>
    ws.columns.some((col) => col.windows.some((win) => win.id === id))
  )
}

/**
 * Load the persisted layout, push each window's content into the in-session
 * cache, and return a content-less `NiriState` for the reducer. Returns null
 * when nothing usable is stored (fresh desktop / corrupted data).
 */
export function loadNiriState(): NiriState | null {
  if (typeof window === "undefined") return null
  let raw: unknown
  try {
    raw = JSON.parse(
      window.localStorage.getItem(NIRI_WORKSPACES_STORAGE_KEY) ?? "null"
    )
  } catch {
    return null
  }
  if (!isRecord(raw)) return null
  const stored = Array.isArray(raw.workspaces) ? raw.workspaces : []
  if (stored.length === 0) return null

  // Overlay stored workspaces onto the pristine 1..3 skeleton so the bar's pips
  // and every workspace-shortcut keep working even if storage is partial.
  const base = initialNiriState()
  let hadWindows = false
  const workspaces = base.workspaces.map((defaultWs) => {
    const match = stored
      .map(pickWorkspace)
      .find((ws): ws is NiriWorkspace => ws !== null && ws.id === defaultWs.id)
    if (match) {
      if (match.columns.length > 0) hadWindows = true
      return match
    }
    return defaultWs
  })
  if (!hadWindows) return null

  // Re-hydrate the in-session cache so freshly mounted apps restore their
  // content without the reducer ever carrying it.
  for (const [id, content] of collectContent(stored)) {
    setWindowContent(id, content)
  }

  const activeRaw = Number(raw.active)
  const active =
    Number.isInteger(activeRaw) && workspaces.some((ws) => ws.id === activeRaw)
      ? activeRaw
      : (workspaces.find((ws) => ws.columns.length > 0)?.id ?? 1)
  const fullscreenWinId =
    typeof raw.fullscreenWinId === "string" &&
    hasWindow(workspaces, raw.fullscreenWinId)
      ? raw.fullscreenWinId
      : null

  return {
    active,
    fullscreenWinId,
    isCenterAligned: raw.isCenterAligned === true,
    overview: false,
    workspaces,
  }
}

/**
 * Persist the current layout, attaching each window's latest content from the
 * in-session cache. Orphaned cache entries (closed windows) are pruned.
 */
export function saveNiriState(state: NiriState): void {
  if (typeof window === "undefined") return
  const ids = new Set<string>()
  const workspaces = state.workspaces.map((ws) => ({
    ...ws,
    columns: ws.columns.map((col) => ({
      ...col,
      windows: col.windows.map((win) => {
        ids.add(win.id)
        const content = getWindowContent(win.id)
        return {
          ...win,
          content: content !== null && content.app === win.app ? content : null,
        }
      }),
    })),
  }))
  pruneWindowContent(ids)
  try {
    window.localStorage.setItem(
      NIRI_WORKSPACES_STORAGE_KEY,
      JSON.stringify({ ...state, workspaces })
    )
  } catch {
    // Quota / unavailable storage — the in-session cache still holds the data.
  }
}
