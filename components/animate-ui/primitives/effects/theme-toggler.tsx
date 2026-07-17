"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import * as React from "react"
import { flushSync } from "react-dom"

import { THEMES, type Theme } from "@/lib/themes"

// Adapted from @animate-ui/primitives-effects-theme-toggler. Upstream hardcodes
// a light/dark/system union and toggles only the `.dark` class; we own this
// vendored copy, so it is generalized to the app's `Theme` set (see lib/themes)
// and swaps whichever theme class is active during the View Transition.

type Direction = "btt" | "ttb" | "ltr" | "rtl"

type ChildrenRender =
  | React.ReactNode
  | ((state: {
      theme: Theme
      toggleTheme: (theme: Theme) => void
    }) => React.ReactNode)

function getClipKeyframes(direction: Direction): [string, string] {
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

// Optimistically swap the active theme class on <html> so the incoming half of
// the View Transition paints in the target theme. next-themes then persists it.
function applyThemeClass(theme: Theme) {
  const root = document.documentElement
  root.classList.remove(...THEMES)
  root.classList.add(theme)
}

type ThemeTogglerProps = {
  theme: Theme
  setTheme: (theme: Theme) => void
  direction?: Direction
  onImmediateChange?: (theme: Theme) => void
  children?: ChildrenRender
}

function ThemeToggler({
  theme,
  setTheme,
  onImmediateChange,
  direction = "ltr",
  children,
  ...props
}: ThemeTogglerProps) {
  const [fromClip, toClip] = getClipKeyframes(direction)

  const toggleTheme = React.useCallback(
    async (next: Theme) => {
      onImmediateChange?.(next)

      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches

      // No View Transitions API (or the user prefers reduced motion) → swap
      // instantly without the circular reveal.
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
            duration: 700,
            easing: "ease-in-out",
            pseudoElement: "::view-transition-new(root)",
          }
        )
        .finished.finally(() => setTheme(next))
    },
    [onImmediateChange, fromClip, toClip, setTheme]
  )

  return (
    <React.Fragment {...props}>
      {typeof children === "function"
        ? children({ theme, toggleTheme })
        : children}
      <style>
        {
          "::view-transition-old(root),::view-transition-new(root){animation:none;mix-blend-mode:normal;}"
        }
      </style>
    </React.Fragment>
  )
}

export { type Direction, ThemeToggler, type ThemeTogglerProps }
