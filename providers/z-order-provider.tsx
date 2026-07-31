"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import * as React from "react"

import { Z_LAYERS } from "@/lib/z-order"

// Lightweight cross-surface window authority. It hands out monotonically
// increasing z-index values within the floating-window band (click-to-front),
// remembers the close handler of the most-recently-focused window (so one
// "close" shortcut can target whatever is on top), and tracks WHICH window is
// focused by id — so a floating window knows when it owns the keyboard, and the
// tiling view knows to yield float-owned keys (e.g. resize).
type ZOrderContextValue = {
  // Reserve the next top-of-stack z-index; optionally register how to close the
  // focused window and an id identifying it (a float's storageKey, or the
  // `NIRI_TILE_ID` sentinel when a tiled window takes focus).
  bringToFront: (onClose?: () => void, id?: string) => number
  // Close the most-recently-focused window; returns false if none is registered.
  closeActive: () => boolean
  // Id of the most-recently-focused window (null before any focus).
  activeId: string | null
}

// Sentinel id the tiling view registers when a tiled window gains focus, so
// `activeId` distinguishes "a float is focused" from "a tile is focused".
export const NIRI_TILE_ID = "niri:tile"

const ZOrderContext = React.createContext<ZOrderContextValue | null>(null)

export function ZOrderProvider({ children }: { children: React.ReactNode }) {
  const topRef = React.useRef<number>(Z_LAYERS.window)
  const activeCloseRef = React.useRef<(() => void) | null>(null)
  const [activeId, setActiveId] = React.useState<string | null>(null)

  const bringToFront = React.useCallback(
    (onClose?: () => void, id?: string) => {
      topRef.current = Math.min(topRef.current + 1, Z_LAYERS.windowMax)
      // The focused window becomes the close target. Passing no handler clears it
      // so a non-closeable focus doesn't leave a stale one behind.
      activeCloseRef.current = onClose ?? null
      setActiveId(id ?? null)
      return topRef.current
    },
    []
  )

  const closeActive = React.useCallback(() => {
    const close = activeCloseRef.current
    if (close == null) return false
    // Clear before invoking so a re-entrant focus during close can register anew.
    activeCloseRef.current = null
    close()
    return true
  }, [])

  const value = React.useMemo<ZOrderContextValue>(
    () => ({ activeId, bringToFront, closeActive }),
    [activeId, bringToFront, closeActive]
  )

  return (
    <ZOrderContext.Provider value={value}>{children}</ZOrderContext.Provider>
  )
}

export function useZOrder(): ZOrderContextValue {
  const context = React.useContext(ZOrderContext)
  if (context == null) {
    throw new Error("useZOrder must be used within a ZOrderProvider")
  }
  return context
}
