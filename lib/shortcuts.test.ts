// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  bindingFromKeyboardEvent,
  DEFAULT_SHORTCUTS,
  formatShortcut,
  loadShortcuts,
  matchesShortcut,
  type Shortcut,
  saveShortcuts,
  shortcutProblem,
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

  it("matches a digit shortcut by physical code when the layout shifts the row", () => {
    const goHome: Shortcut = {
      action: "goHome",
      character: "1",
      hasAltOrOptionKey: false,
      hasMetaOrCtrlKey: false,
      hasShiftKey: false,
    }
    // AZERTY-style: the number-row key yields "&" unshifted, but code is Digit1.
    expect(
      matchesShortcut(
        new KeyboardEvent("keydown", { code: "Digit1", key: "&" }),
        goHome
      )
    ).toBe(true)
    // Plain US "1" still matches via the character.
    expect(
      matchesShortcut(
        new KeyboardEvent("keydown", { code: "Digit1", key: "1" }),
        goHome
      )
    ).toBe(true)
  })

  it("matches a punctuation shortcut by physical code too", () => {
    const settings: Shortcut = {
      action: "toggleSettings",
      character: ",",
      hasAltOrOptionKey: false,
      hasMetaOrCtrlKey: false,
      hasShiftKey: false,
    }
    // A layout where the Comma key prints something else unshifted.
    expect(
      matchesShortcut(
        new KeyboardEvent("keydown", { code: "Comma", key: "Ω" }),
        settings
      )
    ).toBe(true)
  })

  it("keeps letter shortcuts character-based (no physical-code match)", () => {
    // Dvorak: the physical "KeyT" position isn't where "t" is typed, so a
    // letter binding must NOT match by code — only by the produced character.
    const wrongPhysical = new KeyboardEvent("keydown", {
      code: "KeyX",
      key: "d",
    })
    expect(matchesShortcut(wrongPhysical, bareD)).toBe(true) // matched via key
    const rightPhysicalWrongChar = new KeyboardEvent("keydown", {
      code: "KeyD",
      key: "x",
    })
    expect(matchesShortcut(rightPhysicalWrongChar, bareD)).toBe(false)
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

describe("bindingFromKeyboardEvent", () => {
  const key = (
    k: string,
    code: string,
    mods: Partial<
      Record<"metaKey" | "ctrlKey" | "altKey" | "shiftKey", boolean>
    > = {}
  ) => ({
    altKey: false,
    code,
    ctrlKey: false,
    key: k,
    metaKey: false,
    shiftKey: false,
    ...mods,
  })

  it("waits while only a modifier is held", () => {
    expect(
      bindingFromKeyboardEvent(key("Shift", "ShiftLeft", { shiftKey: true }))
    ).toBeNull()
    expect(
      bindingFromKeyboardEvent(key("Control", "ControlLeft", { ctrlKey: true }))
    ).toBeNull()
  })

  it("reads the physical key, so an Option glyph still binds to its key", () => {
    // macOS: Option+1 produces "¡" in event.key.
    expect(
      bindingFromKeyboardEvent(key("¡", "Digit1", { altKey: true }))
    ).toEqual({
      character: "1",
      hasAltOrOptionKey: true,
      hasMetaOrCtrlKey: false,
      hasShiftKey: false,
    })
    expect(
      bindingFromKeyboardEvent(key("å", "KeyA", { altKey: true }))?.character
    ).toBe("a")
    expect(
      bindingFromKeyboardEvent(key(",", "Comma", { ctrlKey: true }))?.character
    ).toBe(",")
  })

  it("maps Ctrl to the meta-or-ctrl flag off macOS", () => {
    expect(
      bindingFromKeyboardEvent(key("k", "KeyK", { ctrlKey: true }))
        ?.hasMetaOrCtrlKey
    ).toBe(true)
  })
})

describe("shortcutProblem", () => {
  const all = [...DEFAULT_SHORTCUTS]
  const at = (action: Shortcut["action"]) =>
    all.find((s) => s.action === action)
  it("passes every default binding", () => {
    for (const s of all) expect(shortcutProblem(s, all)).toBeNull()
  })

  it("flags empty, bare and duplicate bindings", () => {
    const home = at("goHome")
    if (!home) throw new Error("missing default")
    expect(shortcutProblem({ ...home, character: "" }, all)).toBe("empty")
    expect(
      shortcutProblem(
        { ...home, hasAltOrOptionKey: false, hasMetaOrCtrlKey: false },
        all
      )
    ).toBe("noModifier")
    const clash = { ...home, character: "k", hasAltOrOptionKey: false }
    const withClash = all.map((s) => (s.action === "goHome" ? clash : s))
    expect(shortcutProblem(clash, withClash)).toBe("duplicate")
  })

  it("allows bare keys for actions that are bare by design", () => {
    const hints = at("toggleHints")
    if (!hints) throw new Error("missing default")
    expect(shortcutProblem(hints, all)).toBeNull()
  })
})
