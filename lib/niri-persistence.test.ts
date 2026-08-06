// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  getActiveWorkspace,
  getFocusedWindow,
  initialNiriState,
  niriReducer,
} from "@/components/niri/engine"
import {
  loadNiriState,
  NIRI_WORKSPACES_STORAGE_KEY,
  saveNiriState,
} from "@/lib/niri-persistence"
import {
  getWindowContent,
  pruneWindowContent,
  setWindowContent,
} from "@/lib/niri-window-cache"

// The per-window cache is module-level, so a "fresh session" in a test means a
// cleared cache + cleared storage (the loader re-hydrates the cache from the
// stored blob exactly as a page reload would).
// jsdom here ships no localStorage — provide a minimal in-memory one.
beforeEach(() => {
  const store = new Map<string, string>()
  const mock: Storage = {
    clear: () => store.clear(),
    getItem: (k) => store.get(k) ?? null,
    key: (i) => [...store.keys()][i] ?? null,
    get length() {
      return store.size
    },
    removeItem: (k) => store.delete(k),
    setItem: (k, v) => store.set(k, v),
  }
  vi.stubGlobal("localStorage", mock)
  pruneWindowContent(new Set())
})

afterEach(() => {
  vi.unstubAllGlobals()
  pruneWindowContent(new Set())
})

describe("niri workspace persistence", () => {
  it("round-trips layout + terminal content through the storage key", () => {
    const state = niriReducer(initialNiriState(), {
      app: "terminal",
      type: "spawn",
    })
    const win = getFocusedWindow(state)
    expect(win).not.toBeNull()
    if (!win) return

    setWindowContent(win.id, {
      app: "terminal",
      state: {
        barMode: "NORMAL",
        barTab: "zsh",
        currentPage: "timeline",
        cwd: "/timeline",
        editorContent: null,
        editorOpen: false,
        globalRunning: false,
        histIndex: 2,
        history: ["cd timeline", "ff"],
        line: "ls -la",
        matrixOptions: null,
        matrixRunning: false,
        startedAt: 12345,
      },
    })
    saveNiriState(state)

    const raw = window.localStorage.getItem(NIRI_WORKSPACES_STORAGE_KEY)
    expect(raw).not.toBeNull()

    // Simulate a reload: the cache is empty again; the loader must restore it.
    pruneWindowContent(new Set())
    const restored = loadNiriState()
    expect(restored).not.toBeNull()
    expect(
      restored?.workspaces.find((ws) => ws.id === 1)?.columns
    ).toHaveLength(1)

    const cached = getWindowContent(win.id)
    expect(cached?.app).toBe("terminal")
    if (cached?.app === "terminal") {
      expect(cached.state.line).toBe("ls -la")
      expect(cached.state.history).toEqual(["cd timeline", "ff"])
      expect(cached.state.cwd).toBe("/timeline")
      expect(cached.state.startedAt).toBe(12345)
    }
  })

  it("round-trips browser tabs + address", () => {
    const state = niriReducer(initialNiriState(), {
      app: "browser",
      type: "spawn",
    })
    const win = getFocusedWindow(state)
    if (!win) return

    setWindowContent(win.id, {
      app: "browser",
      state: {
        activeId: "tab-2",
        address: "https://example.com/wiki",
        tabs: [
          {
            history: ["https://kangazero.github.io/KangaFlow/"],
            id: "tab-1",
            index: 0,
            nonce: 0,
          },
          {
            history: ["https://example.com", "https://example.com/wiki"],
            id: "tab-2",
            index: 1,
            nonce: 3,
          },
        ],
      },
    })
    saveNiriState(state)

    pruneWindowContent(new Set())
    const restored = loadNiriState()
    expect(restored).not.toBeNull()

    const cached = getWindowContent(win.id)
    expect(cached?.app).toBe("browser")
    if (cached?.app === "browser") {
      expect(cached.state.activeId).toBe("tab-2")
      expect(cached.state.address).toBe("https://example.com/wiki")
      expect(cached.state.tabs).toHaveLength(2)
    }
  })

  it("returns null when nothing usable is stored", () => {
    expect(loadNiriState()).toBeNull()
  })

  it("returns null for corrupted JSON", () => {
    window.localStorage.setItem(NIRI_WORKSPACES_STORAGE_KEY, "{ not json")
    expect(loadNiriState()).toBeNull()
  })

  it("ignores a stored layout with no windows", () => {
    saveNiriState(initialNiriState())
    expect(loadNiriState()).toBeNull()
  })

  it("drops orphaned cache entries (closed windows) when saving", () => {
    const state = niriReducer(initialNiriState(), {
      app: "terminal",
      type: "spawn",
    })
    const win = getFocusedWindow(state)
    if (!win) return
    setWindowContent(win.id, {
      app: "terminal",
      state: {
        barMode: "NORMAL",
        barTab: "zsh",
        currentPage: "home",
        cwd: "/",
        editorContent: null,
        editorOpen: false,
        globalRunning: false,
        histIndex: 0,
        history: [],
        line: "",
        matrixOptions: null,
        matrixRunning: false,
        startedAt: 1,
      },
    })
    // A second window that never enters the saved layout.
    setWindowContent("ghost-win", {
      app: "browser",
      state: {
        activeId: "t",
        address: "https://example.com",
        tabs: [
          { history: ["https://example.com"], id: "t", index: 0, nonce: 0 },
        ],
      },
    })
    saveNiriState(state)
    expect(getWindowContent("ghost-win")).toBeNull()
  })

  it("merges a partial stored layout into the default 3-workspace skeleton", () => {
    let state = initialNiriState()
    state = niriReducer(state, { app: "terminal", type: "spawn" })
    const ws1 = getActiveWorkspace(state)
    saveNiriState(state)
    expect(ws1.id).toBe(1)

    pruneWindowContent(new Set())
    const restored = loadNiriState()
    expect(restored?.workspaces).toHaveLength(3)
    expect(restored?.workspaces.map((ws) => ws.id)).toEqual([1, 2, 3])
  })
})
