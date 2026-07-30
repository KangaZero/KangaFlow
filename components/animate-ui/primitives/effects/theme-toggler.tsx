"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import * as React from "react"

import {
  type TransitionDirection,
  useThemeTransition,
} from "@/lib/theme-transition"
import type { Theme } from "@/lib/themes"

// Adapted from @animate-ui/primitives-effects-theme-toggler. Upstream hardcodes
// a light/dark/system union and toggles only the `.dark` class; we own this
// vendored copy, so it is generalized to the app's `Theme` set (see lib/themes)
// and swaps whichever theme class is active during the View Transition.
// Transition logic lives in lib/theme-transition — this component is now a
// thin render-prop wrapper so callers don't need to wire the hook themselves.

type Direction = TransitionDirection

type ChildrenRender =
  | React.ReactNode
  | ((state: {
      theme: Theme
      toggleTheme: (theme: Theme) => void
    }) => React.ReactNode)

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
  const transition = useThemeTransition(setTheme, direction)

  const toggleTheme = React.useCallback(
    async (next: Theme) => {
      onImmediateChange?.(next)
      await transition(next)
    },
    [onImmediateChange, transition]
  )

  return (
    <React.Fragment {...props}>
      {typeof children === "function"
        ? children({ theme, toggleTheme })
        : children}
    </React.Fragment>
  )
}

export { type Direction, ThemeToggler, type ThemeTogglerProps }
