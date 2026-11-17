// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Persisted layout of the on-screen keyboard widget: dock state, the floating
// offset (stored as `position`, the same field DraggableWindow uses, so the
// settings' "apply current position" works unchanged), each half's own drag
// offset and the extension-key toggle. Stored JSON is `unknown` until this
// guard has checked it field by field.

import type { Half } from "@/lib/corne-layout"

export const DOCK_MODES = ["bottom", "float"] as const
export type DockMode = (typeof DOCK_MODES)[number]

export type Offset = { x: number; y: number }

export type KeyboardPrefs = {
  dock: DockMode
  position: Offset | null
  halves: Record<Half, Offset>
  showExt: boolean
}

export const DEFAULT_KEYBOARD_PREFS: KeyboardPrefs = {
  dock: "bottom",
  halves: { L: { x: 0, y: 0 }, R: { x: 0, y: 0 } },
  position: null,
  showExt: false,
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
}

function asOffset(value: unknown): Offset | null {
  if (!isRecord(value)) return null
  const { x, y } = value
  return typeof x === "number" &&
    typeof y === "number" &&
    Number.isFinite(x) &&
    Number.isFinite(y)
    ? { x, y }
    : null
}

function isDockMode(value: unknown): value is DockMode {
  return (DOCK_MODES as readonly unknown[]).includes(value)
}

/** Validate stored prefs, falling back per field so junk never breaks the UI. */
export function parseKeyboardPrefs(raw: unknown): KeyboardPrefs {
  if (!isRecord(raw)) return DEFAULT_KEYBOARD_PREFS
  const halvesRaw: Record<string, unknown> = isRecord(raw.halves)
    ? raw.halves
    : {}
  const halfOffset = (half: Half): Offset =>
    asOffset(halvesRaw[half]) ?? DEFAULT_KEYBOARD_PREFS.halves[half]
  // A Record<Half, …> literal: adding a half to HALVES fails the build here.
  const halves: Record<Half, Offset> = {
    L: halfOffset("L"),
    R: halfOffset("R"),
  }
  return {
    dock: isDockMode(raw.dock) ? raw.dock : DEFAULT_KEYBOARD_PREFS.dock,
    halves,
    position: asOffset(raw.position),
    showExt:
      typeof raw.showExt === "boolean"
        ? raw.showExt
        : DEFAULT_KEYBOARD_PREFS.showExt,
  }
}
