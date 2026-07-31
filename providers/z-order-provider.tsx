"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import * as React from "react"

import { Z_LAYERS } from "@/lib/z-order"

// Hands out monotonically increasing z-index values within the floating-window
// band so the most recently focused widget renders on top of its peers
// (click-to-front). A single shared counter across all windows guarantees a
// total order; clamping at `windowMax` keeps a raised widget from ever crossing
// into the panel/dialog bands above it.
const ZOrderContext = React.createContext<() => number>(() => Z_LAYERS.window)

export function ZOrderProvider({ children }: { children: React.ReactNode }) {
  const topRef = React.useRef<number>(Z_LAYERS.window)
  const bringToFront = React.useCallback(() => {
    topRef.current = Math.min(topRef.current + 1, Z_LAYERS.windowMax)
    return topRef.current
  }, [])
  return (
    <ZOrderContext.Provider value={bringToFront}>
      {children}
    </ZOrderContext.Provider>
  )
}

// Returns a stable function that, when called, reserves and returns the next
// top-of-stack z-index. Call it when a window opens or receives a pointer-down.
export function useBringToFront(): () => number {
  return React.useContext(ZOrderContext)
}
