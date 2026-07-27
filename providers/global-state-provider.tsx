"use client"

import { MotionConfig } from "motion/react"
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
  ANIMATION_PREFS,
  type AnimationPref,
  COLUMN_OPTIONS,
  type ColumnCount,
  type GlobalStatesContextValue,
} from "@/lib/globalStates"
import {
  DEFAULT_SHORTCUTS,
  loadShortcuts,
  type Shortcut,
  saveShortcuts,
} from "@/lib/shortcuts"

const DEFAULT_COLUMN_COUNT: ColumnCount = 3
const COLUMN_STORAGE_KEY = "kangaflow:columnCount"
const ENV_CHROME_STORAGE_KEY = "kangaflow:envChrome"

function loadEnvChrome(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(ENV_CHROME_STORAGE_KEY) === "true"
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

const DEFAULT_GLOBAL_STATES: GlobalStatesContextValue = {
  animationPref: "system",
  columnCount: DEFAULT_COLUMN_COUNT,
  isCommandPaletteOpen: false,
  isHelloEffectAnimationComplete: false,
  isJavascriptFlipTechIconFlipped: false,
  isMediaPlayerOpen: false,
  isSettingsOpen: false,
  isTerminalOpen: false,
  setAnimationPref: () => {},
  setColumnCount: () => {},
  setIsCommandPaletteOpen: () => {},
  setIsHelloEffectAnimationComplete: () => {},
  setIsJavascriptFlipTechIconFlipped: () => {},
  setIsMediaPlayerOpen: () => {},
  setIsSettingsOpen: () => {},
  setIsTerminalOpen: () => {},
  setShortcuts: () => {},
  setShowChromeInEnvironment: () => {},
  setTerminalFile: () => {},
  shortcuts: [...DEFAULT_SHORTCUTS],
  showChromeInEnvironment: false,
  terminalFile: null,
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
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isHelloEffectAnimationComplete, setIsHelloEffectAnimationComplete] =
    useState(false)
  const [isJavascriptFlipTechIconFlipped, setIsJavascriptFlipTechIconFlipped] =
    useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isMediaPlayerOpen, setIsMediaPlayerOpen] = useState(false)
  const [isTerminalOpen, setIsTerminalOpen] = useState(false)
  const [terminalFile, setTerminalFile] = useState<string | null>(null)

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

  useEffect(() => {
    setShortcuts(loadShortcuts())
    setColumnCount(loadColumnCount())
    setShowChromeInEnvironment(loadEnvChrome())
    setAnimationPref(loadAnimationPref())
    hydrated.current = true
  }, [])

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
      isCommandPaletteOpen,
      isHelloEffectAnimationComplete,
      isJavascriptFlipTechIconFlipped,
      isMediaPlayerOpen,
      isSettingsOpen,
      isTerminalOpen,
      setAnimationPref,
      setColumnCount,
      setIsCommandPaletteOpen,
      setIsHelloEffectAnimationComplete,
      setIsJavascriptFlipTechIconFlipped,
      setIsMediaPlayerOpen,
      setIsSettingsOpen,
      setIsTerminalOpen,
      setShortcuts,
      setShowChromeInEnvironment,
      setTerminalFile,
      shortcuts,
      showChromeInEnvironment,
      terminalFile,
    }),
    [
      animationPref,
      columnCount,
      showChromeInEnvironment,
      isCommandPaletteOpen,
      isHelloEffectAnimationComplete,
      isJavascriptFlipTechIconFlipped,
      isMediaPlayerOpen,
      isSettingsOpen,
      isTerminalOpen,
      shortcuts,
      terminalFile,
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
