"use client"

import * as React from "react"

import type { GlobalStatesContextValue } from "@/lib/globalStates"

const DEFAULT_GLOBAL_STATES: GlobalStatesContextValue = {
  isCommandPaletteOpen: false,
  setIsCommandPaletteOpen: () => {},
}

const GlobalStatesContext = React.createContext<GlobalStatesContextValue>(
  DEFAULT_GLOBAL_STATES
)

function GlobalStatesProvider({ children }: { children: React.ReactNode }) {
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = React.useState(false)
  const value = React.useMemo<GlobalStatesContextValue>(
    () => ({ isCommandPaletteOpen, setIsCommandPaletteOpen }),
    [isCommandPaletteOpen]
  )

  return (
    <GlobalStatesContext.Provider value={value}>
      {children}
    </GlobalStatesContext.Provider>
  )
}

function useGlobalStates(): GlobalStatesContextValue {
  const ctx = React.useContext(GlobalStatesContext)
  if (ctx == null) {
    throw new Error(
      "useGlobalStates must be used within a <GlobalStatesProvider>"
    )
  }
  return ctx
}

export { GlobalStatesProvider, useGlobalStates }
