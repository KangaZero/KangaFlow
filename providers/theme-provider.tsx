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

export { ThemeProvider }
