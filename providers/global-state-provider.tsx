"use client"

import { MotionConfig } from "motion/react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import {
  ACCENTS,
  BAR_OPACITIES,
  BAR_POSITIONS,
  BORDER_RADIUS_MAX,
  BORDER_RADIUS_MIN,
  DEFAULT_ENV_SETTINGS,
  ENV_FONTS,
  type EnvSettings,
  GLASS_LEVELS,
  TOAST_DURATIONS,
  TOAST_MAX_STACKS,
  TOAST_POSITIONS,
  UI_SCALES,
  WALLPAPERS,
  WIDGET_ANCHORS,
  WIDGET_IDS,
  type WidgetId,
} from "@/components/niri/settings"
import type { TrackSrc } from "@/components/widgets/tracks"
import { PLAYLIST } from "@/components/widgets/tracks"
import {
  ANIMATION_PREFS,
  type AnimationPref,
  type AppPath,
  COLUMN_OPTIONS,
  type ColumnCount,
  type GlobalStatesContextValue,
  NOTE_LINE_NUMBER_MODES,
  type NoteLineNumbers,
} from "@/lib/globalStates"
import {
  DEFAULT_SHORTCUTS,
  loadShortcuts,
  type Shortcut,
  saveShortcuts,
} from "@/lib/shortcuts"
import { useThemeTransition } from "@/lib/theme-transition"
import { DEFAULT_THEME, isTheme } from "@/lib/themes"

const DEFAULT_COLUMN_COUNT: ColumnCount = 3
const COLUMN_STORAGE_KEY = "kangaflow:columnCount"
const ENV_CHROME_STORAGE_KEY = "kangaflow:envChrome"

function loadEnvChrome(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(ENV_CHROME_STORAGE_KEY) === "true"
}

const VIM_MODE_STORAGE_KEY = "kangaflow:vimMode"

function loadVimMode(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(VIM_MODE_STORAGE_KEY) === "true"
}

const NOTE_LINE_NUMBERS_STORAGE_KEY = "kangaflow:noteLineNumbers"

function loadNoteLineNumbers(): NoteLineNumbers {
  if (typeof window === "undefined") return "off"
  const raw = window.localStorage.getItem(NOTE_LINE_NUMBERS_STORAGE_KEY)
  return (NOTE_LINE_NUMBER_MODES as readonly string[]).includes(raw ?? "")
    ? (raw as NoteLineNumbers)
    : "off"
}

const ANIMATION_STORAGE_KEY = "kangaflow:animations"

function isAnimationPref(value: string | null): value is AnimationPref {
  return value != null && (ANIMATION_PREFS as readonly string[]).includes(value)
}

function loadAnimationPref(): AnimationPref {
  if (typeof window === "undefined") return "system"
  const raw = window.localStorage.getItem(ANIMATION_STORAGE_KEY)
  return isAnimationPref(raw) ? raw : "system"
}

// Motion's reducedMotion mode from the preference: "user" follows the OS,
// "never" forces animation on, "always" reduces. Also drives useReducedMotion().
function reducedMotionMode(pref: AnimationPref): "user" | "always" | "never" {
  if (pref === "on") return "never"
  if (pref === "off") return "always"
  return "user"
}

const ENV_SETTINGS_STORAGE_KEY = "kangaflow:envSettings"

// Keep a stored literal only if it's still a valid option, else fall back — so
// old/garbage values can never break a control or the glass surface.
function pickLiteral<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(value)
    ? (value as T)
    : fallback
}

function clampRadius(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n)
    ? Math.min(BORDER_RADIUS_MAX, Math.max(BORDER_RADIUS_MIN, Math.round(n)))
    : fallback
}

function isOffset(value: unknown): value is { x: number; y: number } {
  if (value == null || typeof value !== "object") return false
  const o = value as Record<string, unknown>
  return typeof o.x === "number" && typeof o.y === "number"
}

// Validate the per-widget startup map, falling back field-by-field so a partial
// or garbage stored object can never break a widget's anchor/visibility.
function pickWidgetDefaults(value: unknown): EnvSettings["widgetDefaults"] {
  const src = (value && typeof value === "object" ? value : {}) as Record<
    string,
    unknown
  >

  function pickBase(id: WidgetId) {
    const def = DEFAULT_ENV_SETTINGS.widgetDefaults[id]
    const w = (src[id] && typeof src[id] === "object" ? src[id] : {}) as Record<
      string,
      unknown
    >
    return {
      anchor: pickLiteral(w.anchor, WIDGET_ANCHORS, def.anchor),
      offset: isOffset(w.offset) ? w.offset : def.offset,
      show: typeof w.show === "boolean" ? w.show : def.show,
    }
  }

  const mediaDef = DEFAULT_ENV_SETTINGS.widgetDefaults.media
  const mw = (
    src.media && typeof src.media === "object" ? src.media : {}
  ) as Record<string, unknown>
  const opts = (
    mw.options && typeof mw.options === "object" ? mw.options : {}
  ) as Record<string, unknown>
  const rawTrack = opts.currentTrack
  const track: TrackSrc =
    typeof rawTrack === "string" &&
    rawTrack.startsWith("/tracks/") &&
    rawTrack.endsWith(".mp3")
      ? (rawTrack as TrackSrc)
      : mediaDef.options.currentTrack

  return {
    alarm: pickBase("alarm"),
    calendar: pickBase("calendar"),
    media: {
      ...pickBase("media"),
      options: {
        currentDuration:
          typeof opts.currentDuration === "number"
            ? opts.currentDuration
            : mediaDef.options.currentDuration,
        currentTrack: track,
        currentVolume:
          typeof opts.currentVolume === "number"
            ? opts.currentVolume
            : mediaDef.options.currentVolume,
        isLooping:
          typeof opts.isLooping === "boolean"
            ? opts.isLooping
            : mediaDef.options.isLooping,
      },
    },
    notes: pickBase("notes"),
  }
}

function loadEnvSettings(): EnvSettings {
  if (typeof window === "undefined") return DEFAULT_ENV_SETTINGS
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(ENV_SETTINGS_STORAGE_KEY) ?? "{}"
    )
    const o = (raw && typeof raw === "object" ? raw : {}) as Record<
      string,
      unknown
    >

    return {
      accent: pickLiteral(o.accent, ACCENTS, DEFAULT_ENV_SETTINGS.accent),
      autoHideBar:
        typeof o.autoHideBar === "boolean"
          ? o.autoHideBar
          : DEFAULT_ENV_SETTINGS.autoHideBar,
      barOpacity: pickLiteral(
        o.barOpacity,
        BAR_OPACITIES,
        DEFAULT_ENV_SETTINGS.barOpacity
      ),
      barPosition: pickLiteral(
        o.barPosition,
        BAR_POSITIONS,
        DEFAULT_ENV_SETTINGS.barPosition
      ),
      barRadius: clampRadius(o.barRadius, DEFAULT_ENV_SETTINGS.barRadius),
      font: pickLiteral(o.font, ENV_FONTS, DEFAULT_ENV_SETTINGS.font),
      glass: pickLiteral(o.glass, GLASS_LEVELS, DEFAULT_ENV_SETTINGS.glass),
      launcherRadius: clampRadius(
        o.launcherRadius,
        DEFAULT_ENV_SETTINGS.launcherRadius
      ),
      showStartingHint:
        typeof o.showStartingHint === "boolean"
          ? o.showStartingHint
          : DEFAULT_ENV_SETTINGS.showStartingHint,
      showSystemMonitor:
        typeof o.showSystemMonitor === "boolean"
          ? o.showSystemMonitor
          : DEFAULT_ENV_SETTINGS.showSystemMonitor,
      toastDuration: pickLiteral(
        o.toastDuration,
        TOAST_DURATIONS,
        DEFAULT_ENV_SETTINGS.toastDuration
      ),
      toastMaxStack: pickLiteral(
        o.toastMaxStack,
        TOAST_MAX_STACKS,
        DEFAULT_ENV_SETTINGS.toastMaxStack
      ),
      toastPosition: pickLiteral(
        o.toastPosition,
        TOAST_POSITIONS,
        DEFAULT_ENV_SETTINGS.toastPosition
      ),
      uiScale: pickLiteral(o.uiScale, UI_SCALES, DEFAULT_ENV_SETTINGS.uiScale),
      wallpaper: pickLiteral(
        o.wallpaper,
        WALLPAPERS,
        DEFAULT_ENV_SETTINGS.wallpaper
      ),
      widgetDefaults: pickWidgetDefaults(o.widgetDefaults),
      windowRadius: clampRadius(
        o.windowRadius,
        DEFAULT_ENV_SETTINGS.windowRadius
      ),
    }
  } catch {
    return DEFAULT_ENV_SETTINGS
  }
}

const DEFAULT_GLOBAL_STATES: GlobalStatesContextValue = {
  animationPref: "system",
  columnCount: DEFAULT_COLUMN_COUNT,
  envSettings: DEFAULT_ENV_SETTINGS,
  isAlarmOpen: false,
  isCalendarOpen: false,
  isCommandPaletteOpen: false,
  isHelloEffectAnimationComplete: false,
  isJavascriptFlipTechIconFlipped: false,
  isLoggedIn: false,
  isMediaPlayerOpen: false,
  isMediaPlayerPlaying: false,
  isNotesOpen: false,
  isSettingsOpen: false,
  isTerminalOpen: false,
  isTrackListOpen: false,
  mediaCurrentIndex: 0,
  noteLineNumbers: "off",
  setAnimationPref: () => {},
  setColumnCount: () => {},
  setEnvSettings: () => {},
  setIsAlarmOpen: () => {},
  setIsCalendarOpen: () => {},
  setIsCommandPaletteOpen: () => {},
  setIsHelloEffectAnimationComplete: () => {},
  setIsJavascriptFlipTechIconFlipped: () => {},
  setIsLoggedIn: () => {},
  setIsMediaPlayerOpen: () => {},
  setIsMediaPlayerPlaying: () => {},
  setIsNotesOpen: () => {},
  setIsSettingsOpen: () => {},
  setIsTerminalOpen: () => {},
  setIsTrackListOpen: () => {},
  setMediaCurrentIndex: () => {},
  setNoteLineNumbers: () => {},
  setShortcuts: () => {},
  setShowChromeInEnvironment: () => {},
  setTerminalFile: () => {},
  setVimMode: () => {},
  shortcuts: [...DEFAULT_SHORTCUTS],
  showChromeInEnvironment: false,
  terminalFile: null,
  theme: DEFAULT_THEME,
  toggleTheme: async () => {},
  vimMode: false,
}

const GlobalStatesContext = createContext<GlobalStatesContextValue>(
  DEFAULT_GLOBAL_STATES
)

function isColumnCount(value: number): value is ColumnCount {
  return (COLUMN_OPTIONS as readonly number[]).includes(value)
}

function loadColumnCount(): ColumnCount {
  if (typeof window === "undefined") return DEFAULT_COLUMN_COUNT
  const raw = window.localStorage.getItem(COLUMN_STORAGE_KEY)
  const parsed = Number(raw)
  return isColumnCount(parsed) ? parsed : DEFAULT_COLUMN_COUNT
}

function GlobalStatesProvider({ children }: { children: ReactNode }) {
  const { resolvedTheme, setTheme } = useTheme()
  const theme = isTheme(resolvedTheme) ? resolvedTheme : DEFAULT_THEME
  const toggleTheme = useThemeTransition(setTheme)

  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isHelloEffectAnimationComplete, setIsHelloEffectAnimationComplete] =
    useState(false)
  const [isJavascriptFlipTechIconFlipped, setIsJavascriptFlipTechIconFlipped] =
    useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMediaPlayerOpen, setIsMediaPlayerOpen] = useState(false)
  const [isMediaPlayerPlaying, setIsMediaPlayerPlaying] = useState(false)
  const [mediaCurrentIndex, setMediaCurrentIndex] = useState(0)
  const [isTrackListOpen, setIsTrackListOpen] = useState(false)
  const [isNotesOpen, setIsNotesOpen] = useState(false)
  const [isAlarmOpen, setIsAlarmOpen] = useState(false)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  const [terminalFile, setTerminalFile] = useState<string | null>(null)
  const currentPath = usePathname() as AppPath

  useEffect(() => {
    const rest = currentPath
      .replace(/^\/(?:en|ja)(?=\/|$)/, "")
      .replace(/\/$/, "")
    const isHome = rest === ""
    if (!isHome) return setIsHelloEffectAnimationComplete(true)
  }, [currentPath])
  // Persisted settings start at their SSR-safe defaults, then hydrate from
  // localStorage after mount (reading storage during render would mismatch the
  // server-rendered HTML). `hydrated` gates the persist effects so the initial
  // default doesn't clobber stored values before hydration runs.
  const hydrated = useRef(false)
  const [shortcuts, setShortcuts] = useState<Shortcut[]>(() => [
    ...DEFAULT_SHORTCUTS,
  ])
  const [columnCount, setColumnCount] =
    useState<ColumnCount>(DEFAULT_COLUMN_COUNT)
  const [showChromeInEnvironment, setShowChromeInEnvironment] = useState(false)
  const [animationPref, setAnimationPref] = useState<AnimationPref>("system")
  const [vimMode, setVimMode] = useState(false)
  const [noteLineNumbers, setNoteLineNumbers] = useState<NoteLineNumbers>("off")
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [envSettings, setEnvSettings] =
    useState<EnvSettings>(DEFAULT_ENV_SETTINGS)

  useEffect(() => {
    setShortcuts(loadShortcuts())
    setColumnCount(loadColumnCount())
    setShowChromeInEnvironment(loadEnvChrome())
    setAnimationPref(loadAnimationPref())
    setVimMode(loadVimMode())
    setNoteLineNumbers(loadNoteLineNumbers())
    const loaded = loadEnvSettings()
    setEnvSettings(loaded)
    // Resume from the last-played track (index derived from stored TrackSrc).
    const storedSrc = loaded.widgetDefaults.media.options.currentTrack
    const resumeIdx = PLAYLIST.findIndex((t) => t.src === storedSrc)
    if (resumeIdx >= 0) setMediaCurrentIndex(resumeIdx)
    // Auto-open widgets flagged "show on startup" (single, hydration-time place).
    const openers: Record<WidgetId, (open: boolean) => void> = {
      alarm: setIsAlarmOpen,
      calendar: setIsCalendarOpen,
      media: setIsMediaPlayerOpen,
      notes: setIsNotesOpen,
    }
    for (const id of WIDGET_IDS) {
      if (loaded.widgetDefaults[id].show) openers[id](true)
    }
    hydrated.current = true
  }, [])

  useEffect(() => {
    if (hydrated.current) {
      window.localStorage.setItem(
        ENV_SETTINGS_STORAGE_KEY,
        JSON.stringify(envSettings)
      )
    }
  }, [envSettings])

  useEffect(() => {
    if (hydrated.current) saveShortcuts(shortcuts)
  }, [shortcuts])

  useEffect(() => {
    if (hydrated.current) {
      window.localStorage.setItem(COLUMN_STORAGE_KEY, String(columnCount))
    }
  }, [columnCount])

  useEffect(() => {
    if (hydrated.current) {
      window.localStorage.setItem(
        ENV_CHROME_STORAGE_KEY,
        String(showChromeInEnvironment)
      )
    }
  }, [showChromeInEnvironment])

  useEffect(() => {
    if (hydrated.current) {
      window.localStorage.setItem(VIM_MODE_STORAGE_KEY, String(vimMode))
    }
  }, [vimMode])

  useEffect(() => {
    if (hydrated.current) {
      window.localStorage.setItem(
        NOTE_LINE_NUMBERS_STORAGE_KEY,
        noteLineNumbers
      )
    }
  }, [noteLineNumbers])

  // Persist the animation preference and mirror the *resolved* state onto a
  // <html data-animations> attribute so the CSS kill-switch (globals.css) can
  // neutralise CSS transitions/animations too, not just motion/react.
  useEffect(() => {
    if (hydrated.current) {
      window.localStorage.setItem(ANIMATION_STORAGE_KEY, animationPref)
    }
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => {
      const off =
        animationPref === "off" || (animationPref === "system" && media.matches)
      if (off) {
        document.documentElement.dataset.animations = "off"
      } else {
        delete document.documentElement.dataset.animations
      }
    }
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [animationPref])

  const value = useMemo<GlobalStatesContextValue>(
    () => ({
      animationPref,
      columnCount,
      envSettings,
      isAlarmOpen,
      isCalendarOpen,
      isCommandPaletteOpen,
      isHelloEffectAnimationComplete,
      isJavascriptFlipTechIconFlipped,
      isLoggedIn,
      isMediaPlayerOpen,
      isMediaPlayerPlaying,
      isNotesOpen,
      isSettingsOpen,
      isTerminalOpen,
      isTrackListOpen,
      mediaCurrentIndex,
      noteLineNumbers,
      setAnimationPref,
      setColumnCount,
      setEnvSettings,
      setIsAlarmOpen,
      setIsCalendarOpen,
      setIsCommandPaletteOpen,
      setIsHelloEffectAnimationComplete,
      setIsJavascriptFlipTechIconFlipped,
      setIsLoggedIn,
      setIsMediaPlayerOpen,
      setIsMediaPlayerPlaying,
      setIsNotesOpen,
      setIsSettingsOpen,
      setIsTerminalOpen,
      setIsTrackListOpen,
      setMediaCurrentIndex,
      setNoteLineNumbers,
      setShortcuts,
      setShowChromeInEnvironment,
      setTerminalFile,
      setVimMode,
      shortcuts,
      showChromeInEnvironment,
      terminalFile,
      theme,
      toggleTheme,
      vimMode,
    }),
    [
      animationPref,
      columnCount,
      envSettings,
      noteLineNumbers,
      showChromeInEnvironment,
      vimMode,
      isAlarmOpen,
      isCalendarOpen,
      isCommandPaletteOpen,
      isHelloEffectAnimationComplete,
      isJavascriptFlipTechIconFlipped,
      isLoggedIn,
      isMediaPlayerOpen,
      isMediaPlayerPlaying,
      isNotesOpen,
      isSettingsOpen,
      isTerminalOpen,
      isTrackListOpen,
      mediaCurrentIndex,
      shortcuts,
      terminalFile,
      theme,
      toggleTheme,
    ]
  )

  return (
    <GlobalStatesContext.Provider value={value}>
      <MotionConfig reducedMotion={reducedMotionMode(animationPref)}>
        {children}
      </MotionConfig>
    </GlobalStatesContext.Provider>
  )
}

function useGlobalStates(): GlobalStatesContextValue {
  const ctx = useContext(GlobalStatesContext)
  if (ctx == null) {
    throw new Error(
      "useGlobalStates must be used within a <GlobalStatesProvider>"
    )
  }
  return ctx
}

export { GlobalStatesProvider, useGlobalStates }
