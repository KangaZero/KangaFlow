// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// Keyboard-shortcut model + persistence. One source of truth for the editable
// shortcuts shown in the Settings dialog and dispatched globally. Bindings are
// user-overridable and persisted to localStorage; unknown/corrupt storage falls
// back to DEFAULT_SHORTCUTS.

// Every action a shortcut can trigger. Adding one here forces a matching entry
// in DEFAULT_SHORTCUTS (exhaustive Record) and a case in the dispatcher.
export type ShortcutAction =
  | "goHome"
  | "goAchievements"
  | "cycleTheme"
  | "openCommandMenu"
  | "toggleLanguage"
  | "toggleColumns"
  | "toggleSettings"

export type Shortcut = {
  action: ShortcutAction
  // "Meta or Ctrl": ⌘ on macOS, Ctrl elsewhere — one flag, platform-resolved.
  hasMetaOrCtrlKey: boolean
  hasAltOrOptionKey: boolean
  hasShiftKey: boolean
  // Single grapheme (e.g. "k"); "" disables the binding.
  character: string
}

// True on Apple platforms — decides ⌘ vs Ctrl for both display and matching.
// (Consolidated here from command-menu.tsx per its "move to a global lib" TODO.)
export const IS_MAC =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.userAgent)

export const DEFAULT_SHORTCUTS: readonly Shortcut[] = [
  {
    action: "goHome",
    character: "1",
    hasAltOrOptionKey: true,
    hasMetaOrCtrlKey: true,
    hasShiftKey: false,
  },
  {
    action: "goAchievements",
    character: "2",
    hasAltOrOptionKey: true,
    hasMetaOrCtrlKey: true,
    hasShiftKey: false,
  },
  {
    action: "cycleTheme",
    character: "d",
    hasAltOrOptionKey: false,
    hasMetaOrCtrlKey: false,
    hasShiftKey: false,
  },
  {
    action: "openCommandMenu",
    character: "k",
    hasAltOrOptionKey: false,
    hasMetaOrCtrlKey: true,
    hasShiftKey: false,
  },
  {
    action: "toggleLanguage",
    character: "l",
    hasAltOrOptionKey: false,
    hasMetaOrCtrlKey: true,
    hasShiftKey: false,
  },
  {
    action: "toggleColumns",
    character: "g",
    hasAltOrOptionKey: false,
    hasMetaOrCtrlKey: true,
    hasShiftKey: false,
  },
  {
    action: "toggleSettings",
    character: ",",
    hasAltOrOptionKey: false,
    hasMetaOrCtrlKey: true,
    hasShiftKey: false,
  },
]

// Display tokens for a shortcut, ready to render one-per-<Kbd>. macOS uses glyph
// stacking (⌘⇧K); other platforms use spelled-out names (Ctrl + Shift + K).
export function formatShortcut(shortcut: Shortcut): string[] {
  const parts: string[] = []
  if (shortcut.hasMetaOrCtrlKey) parts.push(IS_MAC ? "⌘" : "Ctrl")
  if (shortcut.hasAltOrOptionKey) parts.push(IS_MAC ? "⌥" : "Alt")
  if (shortcut.hasShiftKey) parts.push(IS_MAC ? "⇧" : "Shift")
  if (shortcut.character) parts.push(shortcut.character.toUpperCase())
  return parts
}

// Canonical string for a binding (ignoring which action owns it) — used to
// detect two shortcuts that would fire on the same key press.
export function shortcutSignature(shortcut: Shortcut): string {
  const mods =
    (shortcut.hasMetaOrCtrlKey ? "m" : "") +
    (shortcut.hasAltOrOptionKey ? "a" : "") +
    (shortcut.hasShiftKey ? "s" : "")
  return `${mods}:${shortcut.character.toLowerCase()}`
}

/**
 * Does a keyboard event fire the given shortcut? Requires an exact match of the
 * key AND every modifier — a binding with `shift:false` must not fire while
 * Shift is held. The meta-or-ctrl flag resolves per platform: ⌘ on macOS, Ctrl
 * elsewhere, with the *other* of the two required to be up.
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: Shortcut
): boolean {
  if (!shortcut.character) return false
  if (event.key.toLowerCase() !== shortcut.character.toLowerCase()) return false

  const metaOrCtrl = IS_MAC ? event.metaKey : event.ctrlKey
  const otherModifier = IS_MAC ? event.ctrlKey : event.metaKey

  return (
    metaOrCtrl === shortcut.hasMetaOrCtrlKey &&
    !otherModifier &&
    event.altKey === shortcut.hasAltOrOptionKey &&
    event.shiftKey === shortcut.hasShiftKey
  )
}

const STORAGE_KEY = "kangaflow:shortcuts"

function isShortcutAction(value: unknown): value is ShortcutAction {
  return DEFAULT_SHORTCUTS.some((s) => s.action === value)
}

// Merge stored overrides onto the defaults: iterate the defaults (source of
// truth for which actions exist) and adopt a stored binding only when it's
// shape-valid. Drops unknown actions; new actions inherit their default.
export function loadShortcuts(): Shortcut[] {
  if (typeof window === "undefined") return [...DEFAULT_SHORTCUTS]
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...DEFAULT_SHORTCUTS]
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...DEFAULT_SHORTCUTS]

    const stored = new Map<ShortcutAction, Shortcut>()
    for (const entry of parsed) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        "action" in entry &&
        isShortcutAction(entry.action) &&
        "character" in entry &&
        typeof entry.character === "string" &&
        "hasMetaOrCtrlKey" in entry &&
        typeof entry.hasMetaOrCtrlKey === "boolean" &&
        "hasAltOrOptionKey" in entry &&
        typeof entry.hasAltOrOptionKey === "boolean" &&
        "hasShiftKey" in entry &&
        typeof entry.hasShiftKey === "boolean"
      ) {
        stored.set(entry.action, {
          action: entry.action,
          character: entry.character.slice(0, 1).toLowerCase(),
          hasAltOrOptionKey: entry.hasAltOrOptionKey,
          hasMetaOrCtrlKey: entry.hasMetaOrCtrlKey,
          hasShiftKey: entry.hasShiftKey,
        })
      }
    }

    return DEFAULT_SHORTCUTS.map((def) => stored.get(def.action) ?? { ...def })
  } catch {
    // Corrupt or unavailable storage → defaults.
    return [...DEFAULT_SHORTCUTS]
  }
}

export function saveShortcuts(shortcuts: Shortcut[]): void {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(shortcuts))
  } catch {
    // Storage full / disabled — a non-persisted session is acceptable.
  }
}
