import type { Shortcut } from "@/lib/shortcuts"

// Achievements grid density — lifted to global state so the "toggle columns"
// keyboard shortcut can cycle it and the choice persists (localStorage).
export const COLUMN_OPTIONS = [1, 2, 3] as const
export type ColumnCount = (typeof COLUMN_OPTIONS)[number]

export type GlobalStatesContextValue = {
  isCommandPaletteOpen: boolean
  setIsCommandPaletteOpen: (state: boolean) => void
  isHelloEffectAnimationComplete: boolean
  setIsHelloEffectAnimationComplete: (state: boolean) => void
  isJavascriptFlipTechIconFlipped: boolean
  setIsJavascriptFlipTechIconFlipped: (state: boolean) => void
  // Settings dialog open state (ephemeral — not persisted).
  isSettingsOpen: boolean
  setIsSettingsOpen: (state: boolean) => void
  // Persisted settings (localStorage).
  shortcuts: Shortcut[]
  setShortcuts: (shortcuts: Shortcut[]) => void
  columnCount: ColumnCount
  setColumnCount: (columns: ColumnCount) => void
}
