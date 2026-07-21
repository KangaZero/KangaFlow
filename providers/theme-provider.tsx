"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { ThemeProvider as NextThemesProvider } from "next-themes"
import type * as React from "react"

import { DEFAULT_THEME, THEMES } from "@/lib/themes"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={DEFAULT_THEME}
      disableTransitionOnChange
      // Three explicit themes, no OS "system" theme.
      enableSystem={false}
      themes={[...THEMES]}
      {...props}
    >
      {children}
    </NextThemesProvider>
  )
}

// True when the event target is a text-entry element — used by the global
// shortcut dispatcher to ignore bare-key shortcuts while the user is typing.
function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

export { isTypingTarget, ThemeProvider }
