"use client"

import { useCallback } from "react"
import { flushSync } from "react-dom"
import { THEMES, type Theme } from "@/lib/themes"

export type TransitionDirection = "btt" | "ttb" | "ltr" | "rtl"

function getClipKeyframes(direction: TransitionDirection): [string, string] {
  switch (direction) {
    case "rtl":
      return ["inset(0 0 0 100%)", "inset(0 0 0 0)"]
    case "ttb":
      return ["inset(0 0 100% 0)", "inset(0 0 0 0)"]
    case "btt":
      return ["inset(100% 0 0 0)", "inset(0 0 0 0)"]
    default:
      return ["inset(0 100% 0 0)", "inset(0 0 0 0)"]
  }
}

export function applyThemeClass(theme: Theme): void {
  const root = document.documentElement
  root.classList.remove(...THEMES)
  root.classList.add(theme)
}

export const DEFAULT_TRANSITION_DURATION = 700

/**
 * Returns a `transition(next, duration?)` function that switches themes with a
 * View Transition clip-path wipe. `duration` defaults to 700 ms but callers
 * can pass a shorter value (e.g. 250) for a snappier feel in dense UI like the
 * settings panel. Falls back to an instant swap when the API is unavailable or
 * the user prefers reduced motion.
 */
export function useThemeTransition(
  setTheme: (theme: Theme) => void,
  direction: TransitionDirection = "ltr"
): (next: Theme, duration?: number) => Promise<void> {
  const [fromClip, toClip] = getClipKeyframes(direction)

  return useCallback(
    async (next: Theme, duration = DEFAULT_TRANSITION_DURATION) => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches

      if (!document.startViewTransition || reduceMotion) {
        setTheme(next)
        return
      }

      await document.startViewTransition(() => {
        flushSync(() => applyThemeClass(next))
      }).ready

      document.documentElement
        .animate(
          { clipPath: [fromClip, toClip] },
          {
            duration,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          }
        )
        .finished.finally(() => setTheme(next))
    },
    [setTheme, fromClip, toClip]
  )
}
