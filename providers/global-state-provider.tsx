"use client"

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react"
import type { GlobalStatesContextValue } from "@/lib/globalStates"

const DEFAULT_GLOBAL_STATES: GlobalStatesContextValue = {
  isCommandPaletteOpen: false,
  isHelloEffectAnimationComplete: false,
  setIsCommandPaletteOpen: () => {},
  setIsHelloEffectAnimationComplete: () => {},
}

const GlobalStatesContext = createContext<GlobalStatesContextValue>(
  DEFAULT_GLOBAL_STATES
)

function GlobalStatesProvider({ children }: { children: ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)
  const [isHelloEffectAnimationComplete, setIsHelloEffectAnimationComplete] =
    useState(false)
  const value = useMemo<GlobalStatesContextValue>(
    () => ({
      isCommandPaletteOpen,
      isHelloEffectAnimationComplete,
      setIsCommandPaletteOpen,
      setIsHelloEffectAnimationComplete,
    }),
    [isCommandPaletteOpen, isHelloEffectAnimationComplete]
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
