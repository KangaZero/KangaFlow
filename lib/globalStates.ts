import type { EnvSettings } from "@/components/niri/settings"
import type { Locale } from "@/lib/i18n"
import type { Shortcut } from "@/lib/shortcuts"

// Achievements grid density — lifted to global state so the "toggle columns"
// keyboard shortcut can cycle it and the choice persists (localStorage).
export const COLUMN_OPTIONS = [1, 2, 3] as const
export type ColumnCount = (typeof COLUMN_OPTIONS)[number]

type Pages = "achievements/" | "" | "timeline/" | "environment/"
export type AppPath = `/${Locale}/${Pages}`

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
  // Media-player floating panel open state (ephemeral — not persisted).
  isMediaPlayerOpen: boolean
  setIsMediaPlayerOpen: (state: boolean) => void
  // Terminal dialog open state + the file to open in `nvim` (null = plain shell).
  // Ephemeral; only reachable under the terminal theme.
  isTerminalOpen: boolean
  setIsTerminalOpen: (state: boolean) => void
  terminalFile: string | null
  setTerminalFile: (file: string | null) => void
  // Persisted settings (localStorage).
  shortcuts: Shortcut[]
  setShortcuts: (shortcuts: Shortcut[]) => void
  columnCount: ColumnCount
  setColumnCount: (columns: ColumnCount) => void
  // Whether the site header/footer stay visible on the /environment page.
  // Persisted; defaults to false (chrome hidden for the immersive desktop).
  showChromeInEnvironment: boolean
  setShowChromeInEnvironment: (show: boolean) => void
  // Animation preference (persisted). "system" follows prefers-reduced-motion
  // (the default), "on" forces animations, "off" disables them.
  animationPref: AnimationPref
  setAnimationPref: (pref: AnimationPref) => void
  // Niri environment desktop settings (wallpaper, accent, transparency, bar,
  // font, UI scale). Persisted so the whole site — including the media player's
  // glass surface — can share the chosen look.
  envSettings: EnvSettings
  setEnvSettings: (settings: EnvSettings) => void
}

export const ANIMATION_PREFS = ["system", "on", "off"] as const
export type AnimationPref = (typeof ANIMATION_PREFS)[number]
