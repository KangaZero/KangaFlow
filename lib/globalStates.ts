import type { Dispatch, SetStateAction } from "react"
import type { EnvSettings } from "@/components/niri/settings"
import type { Locale } from "@/lib/i18n"
import type { Shortcut } from "@/lib/shortcuts"
import type { Theme } from "@/lib/themes"

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
  // Media-player playback state — lifted so the bar mini-pill can read/control
  // without prop-drilling. Setters support functional-update form.
  isMediaPlayerPlaying: boolean
  setIsMediaPlayerPlaying: Dispatch<SetStateAction<boolean>>
  mediaCurrentIndex: number
  setMediaCurrentIndex: Dispatch<SetStateAction<number>>
  isTrackListOpen: boolean
  setIsTrackListOpen: Dispatch<SetStateAction<boolean>>
  // Widget floating panels — notes, alarm, calendar (ephemeral).
  isNotesOpen: boolean
  setIsNotesOpen: (state: boolean) => void
  isAlarmOpen: boolean
  setIsAlarmOpen: (state: boolean) => void
  isCalendarOpen: boolean
  setIsCalendarOpen: (state: boolean) => void
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
  // Whether native inputs get modal vim keybindings (persisted; default off).
  // Read by <VimInput>/useVimInput to arm modal editing on text fields.
  vimMode: boolean
  setVimMode: (on: boolean) => void
  // Note-editor line-number gutter (persisted): off, absolute, or vim-style
  // relative (distance from the caret line).
  noteLineNumbers: NoteLineNumbers
  setNoteLineNumbers: (mode: NoteLineNumbers) => void
  isLoggedIn: boolean
  setIsLoggedIn: (state: boolean) => void
  // Niri environment desktop settings (wallpaper, accent, transparency, bar,
  // font, UI scale). Persisted so the whole site — including the media player's
  // glass surface — can share the chosen look.
  envSettings: EnvSettings
  setEnvSettings: Dispatch<SetStateAction<EnvSettings>>
  // Active site theme (resolved from next-themes) and the animated toggle
  // function. Centralised here so any consumer avoids duplicating the
  // useTheme + useThemeTransition pairing.
  theme: Theme
  toggleTheme: (theme: Theme, duration?: number) => Promise<void>
}

export const ANIMATION_PREFS = ["system", "on", "off"] as const
export type AnimationPref = (typeof ANIMATION_PREFS)[number]

// Vim-style line-number gutter modes for the note editor. "absolute" = 1..N,
// "relative" = distance from the caret line (like :set relativenumber).
export const NOTE_LINE_NUMBER_MODES = ["off", "absolute", "relative"] as const
export type NoteLineNumbers = (typeof NOTE_LINE_NUMBER_MODES)[number]
