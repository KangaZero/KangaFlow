"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Moon, Sun, Terminal } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"

import { ThemeToggler } from "@/components/animate-ui/primitives/effects/theme-toggler"
import { Button } from "@/components/ui/button"
import { DEFAULT_THEME, isTheme, nextTheme, type Theme } from "@/lib/themes"

const THEME_ICON: Record<Theme, React.ComponentType> = {
  dark: Moon,
  light: Sun,
  terminal: Terminal,
}

// TODO(i18n): swap these for translate("theme.<id>") once the LocaleProvider
// lands (Workstream C). Kept as one lookup, not literals scattered in JSX.
const THEME_LABEL: Record<Theme, string> = {
  dark: "Dark theme",
  light: "Light theme",
  terminal: "Terminal theme",
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const current: Theme = isTheme(theme) ? theme : DEFAULT_THEME

  // The resolved theme is unknown during SSR/first paint; render a stable
  // placeholder so the markup matches and hydration does not warn.
  if (!mounted) {
    return (
      <Button aria-hidden disabled size="icon" variant="ghost">
        <Sun />
      </Button>
    )
  }

  return (
    <ThemeToggler setTheme={setTheme} theme={current}>
      {({ theme: active, toggleTheme }) => {
        const Icon = THEME_ICON[active]
        return (
          <Button
            aria-label={THEME_LABEL[active]}
            onClick={() => toggleTheme(nextTheme(active))}
            size="icon"
            title={THEME_LABEL[active]}
            variant="ghost"
          >
            <Icon />
          </Button>
        )
      }}
    </ThemeToggler>
  )
}
