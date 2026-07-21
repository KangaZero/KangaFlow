"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Moon, Sun, Terminal } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"

import { ThemeToggler } from "@/components/animate-ui/primitives/effects/theme-toggler"
import { Button } from "@/components/ui/button"
import { DEFAULT_THEME, isTheme, nextTheme, type Theme } from "@/lib/themes"
import { useLocale } from "@/providers/locale-provider"

const THEME_ICON: Record<Theme, React.ComponentType> = {
  dark: Moon,
  light: Sun,
  terminal: Terminal,
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const { translate } = useLocale()
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
        const label = translate(`theme.${active}`)
        return (
          <Button
            aria-label={label}
            onClick={() => toggleTheme(nextTheme(active))}
            size="icon"
            variant="ghost"
          >
            <Icon />
          </Button>
        )
      }}
    </ThemeToggler>
  )
}
