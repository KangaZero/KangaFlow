"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import * as React from "react"

import { Z_LAYERS } from "@/lib/z-order"

// Lightweight cross-surface window authority. It hands out monotonically
// increasing z-index values within the floating-window band (click-to-front),
// and remembers the close handler of the most-recently-focused window so a
// single "close" shortcut can target whatever is on top — widget float, floated
// niri window, or (as a fallback) the tiled focus.
type ZOrderContextValue = {
  // Reserve the next top-of-stack z-index; optionally register how to close the
  // window being focused so `closeActive` can reach it.
  bringToFront: (onClose?: () => void) => number
  // Close the most-recently-focused window; returns false if none is registered
  // (so the caller can fall back, e.g. to the tiled-window close).
  closeActive: () => boolean
}

const ZOrderContext = React.createContext<ZOrderContextValue>({
  bringToFront: () => Z_LAYERS.window,
  closeActive: () => false,
})

export function ZOrderProvider({ children }: { children: React.ReactNode }) {
  const topRef = React.useRef<number>(Z_LAYERS.window)
  const activeCloseRef = React.useRef<(() => void) | null>(null)

  const bringToFront = React.useCallback((onClose?: () => void) => {
    topRef.current = Math.min(topRef.current + 1, Z_LAYERS.windowMax)
    // The focused window becomes the close target. Passing no handler clears it
    // so a non-closeable focus doesn't leave a stale one behind.
    activeCloseRef.current = onClose ?? null
    return topRef.current
  }, [])

  const closeActive = React.useCallback(() => {
    const close = activeCloseRef.current
    if (close == null) return false
    // Clear before invoking so a re-entrant focus during close can register anew.
    activeCloseRef.current = null
    close()
    return true
  }, [])

  const value = React.useMemo<ZOrderContextValue>(
    () => ({ bringToFront, closeActive }),
    [bringToFront, closeActive]
  )

  return (
    <ZOrderContext.Provider value={value}>{children}</ZOrderContext.Provider>
  )
}

// Returns the stable `bringToFront(onClose?)` — call on open / pointer-down.
export function useBringToFront(): (onClose?: () => void) => number {
  return React.useContext(ZOrderContext).bringToFront
}

// Returns `closeActive()` — closes the most-recently-focused window, or returns
// false when there is none to close.
export function useCloseActive(): () => boolean {
  return React.useContext(ZOrderContext).closeActive
}
