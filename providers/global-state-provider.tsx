"use client"

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

const DEFAULT_GLOBAL_STATES: GlobalStatesContextValue = {
  columnCount: DEFAULT_COLUMN_COUNT,
  isCommandPaletteOpen: false,
  isHelloEffectAnimationComplete: false,
  isJavascriptFlipTechIconFlipped: false,
  isMediaPlayerOpen: false,
  isSettingsOpen: false,
  setColumnCount: () => {},
  setIsCommandPaletteOpen: () => {},
  setIsHelloEffectAnimationComplete: () => {},
  setIsJavascriptFlipTechIconFlipped: () => {},
  setIsMediaPlayerOpen: () => {},
  setIsSettingsOpen: () => {},
  setShortcuts: () => {},
  shortcuts: [...DEFAULT_SHORTCUTS],
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

  useEffect(() => {
    setShortcuts(loadShortcuts())
    setColumnCount(loadColumnCount())
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

  const value = useMemo<GlobalStatesContextValue>(
    () => ({
      columnCount,
      isCommandPaletteOpen,
      isHelloEffectAnimationComplete,
      isJavascriptFlipTechIconFlipped,
      isMediaPlayerOpen,
      isSettingsOpen,
      setColumnCount,
      setIsCommandPaletteOpen,
      setIsHelloEffectAnimationComplete,
      setIsJavascriptFlipTechIconFlipped,
      setIsMediaPlayerOpen,
      setIsSettingsOpen,
      setShortcuts,
      shortcuts,
    }),
    [
      columnCount,
      isCommandPaletteOpen,
      isHelloEffectAnimationComplete,
      isJavascriptFlipTechIconFlipped,
      isMediaPlayerOpen,
      isSettingsOpen,
      shortcuts,
    ]
  )

  return (
    <GlobalStatesContext.Provider value={value}>
      {children}
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
