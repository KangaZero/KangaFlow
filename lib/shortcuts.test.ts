// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  DEFAULT_SHORTCUTS,
  formatShortcut,
  loadShortcuts,
  matchesShortcut,
  type Shortcut,
  saveShortcuts,
  shortcutSignature,
} from "@/lib/shortcuts"

// jsdom's userAgent has no "Mac", so IS_MAC is false here → spelled-out modifiers.
describe("formatShortcut", () => {
  it("spells out modifiers on non-mac and upper-cases the key", () => {
    const openMenu = DEFAULT_SHORTCUTS.find(
      (s) => s.action === "openCommandMenu"
    )
    expect(openMenu && formatShortcut(openMenu)).toEqual(["Ctrl", "K"])
  })

  it("renders a bare key with no modifiers", () => {
    const theme = DEFAULT_SHORTCUTS.find((s) => s.action === "cycleTheme")
    expect(theme && formatShortcut(theme)).toEqual(["Ctrl", "Alt", "T"])
  })
})

describe("shortcutSignature", () => {
  it("collides for identical bindings regardless of action", () => {
    const a = shortcutSignature({
      action: "toggleLanguage",
      character: "K",
      hasAltOrOptionKey: false,
      hasMetaOrCtrlKey: true,
      hasShiftKey: false,
    })
    const b = shortcutSignature({
      action: "openCommandMenu",
      character: "k",
      hasAltOrOptionKey: false,
      hasMetaOrCtrlKey: true,
      hasShiftKey: false,
    })
    expect(a).toBe(b)
  })
})

describe("matchesShortcut", () => {
  // IS_MAC is false under jsdom, so the meta-or-ctrl flag maps to ctrlKey.
  const ctrlK: Shortcut = {
    action: "openCommandMenu",
    character: "k",
    hasAltOrOptionKey: false,
    hasMetaOrCtrlKey: true,
    hasShiftKey: false,
  }
  const bareD: Shortcut = {
    action: "cycleTheme",
    character: "d",
    hasAltOrOptionKey: false,
    hasMetaOrCtrlKey: false,
    hasShiftKey: false,
  }

  it("matches key + exact modifiers", () => {
    const e = new KeyboardEvent("keydown", { ctrlKey: true, key: "k" })
    expect(matchesShortcut(e, ctrlK)).toBe(true)
  })

  it("rejects an extra held modifier", () => {
    const e = new KeyboardEvent("keydown", {
      ctrlKey: true,
      key: "k",
      shiftKey: true,
    })
    expect(matchesShortcut(e, ctrlK)).toBe(false)
  })

  it("rejects the key without its required modifier", () => {
    const e = new KeyboardEvent("keydown", { key: "k" })
    expect(matchesShortcut(e, ctrlK)).toBe(false)
  })

  it("matches a bare key and rejects it with a modifier held", () => {
    expect(
      matchesShortcut(new KeyboardEvent("keydown", { key: "d" }), bareD)
    ).toBe(true)
    expect(
      matchesShortcut(
        new KeyboardEvent("keydown", { ctrlKey: true, key: "d" }),
        bareD
      )
    ).toBe(false)
  })

  it("never matches a disabled (empty-character) binding", () => {
    const e = new KeyboardEvent("keydown", { key: "" })
    expect(matchesShortcut(e, { ...bareD, character: "" })).toBe(false)
  })
})

describe("loadShortcuts / saveShortcuts", () => {
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
  })
  afterEach(() => vi.unstubAllGlobals())

  it("returns the defaults when nothing is stored", () => {
    expect(loadShortcuts()).toEqual([...DEFAULT_SHORTCUTS])
  })

  it("round-trips a saved override and merges onto defaults", () => {
    const edited = DEFAULT_SHORTCUTS.map((s) =>
      s.action === "cycleTheme" ? { ...s, character: "t" } : s
    )
    saveShortcuts(edited)
    const loaded = loadShortcuts()
    expect(loaded).toHaveLength(DEFAULT_SHORTCUTS.length)
    expect(loaded.find((s) => s.action === "cycleTheme")?.character).toBe("t")
  })

  it("falls back to defaults on corrupt storage", () => {
    window.localStorage.setItem("kangaflow:shortcuts", "{ not json")
    expect(loadShortcuts()).toEqual([...DEFAULT_SHORTCUTS])
  })
})
