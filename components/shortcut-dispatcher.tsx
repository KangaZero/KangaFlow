"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect } from "react"

import { COLUMN_OPTIONS } from "@/lib/globalStates"
import { matchesShortcut } from "@/lib/shortcuts"
import { DEFAULT_THEME, isTheme, nextTheme } from "@/lib/themes"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"
import { isTypingTarget } from "@/providers/theme-provider"

// Single global keydown listener: matches the user's configured shortcuts and
// runs the corresponding action. Replaces the old hardcoded theme hotkey.
export function ShortcutDispatcher() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { locale, setLocale } = useLocale()
  const {
    shortcuts,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    columnCount,
    setColumnCount,
    isHelloEffectAnimationComplete,
  } = useGlobalStates()

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return
      if (isTypingTarget(event.target)) return

      const hit = shortcuts.find((shortcut) => matchesShortcut(event, shortcut))
      if (!hit) return
      event.preventDefault()

      switch (hit.action) {
        case "goHome":
          router.push(`/${locale}`)
          break
        case "goAchievements":
          router.push(`/${locale}/achievements`)
          break
        case "cycleTheme": {
          const current = isTheme(theme) ? theme : DEFAULT_THEME
          setTheme(nextTheme(current))
          break
        }
        case "openCommandMenu":
          setIsCommandPaletteOpen(!isCommandPaletteOpen)
          break
        case "toggleLanguage":
          if (!isHelloEffectAnimationComplete) return //Without this language change may cause animation to never complete resulting in never rendering the about section and stuck on the hello-effect
          setLocale(locale === "en" ? "ja" : "en")
          break
        case "toggleColumns": {
          const index = COLUMN_OPTIONS.indexOf(columnCount)
          const next = COLUMN_OPTIONS[(index + 1) % COLUMN_OPTIONS.length]
          if (next) setColumnCount(next)
          break
        }
        case "toggleSettings":
          setIsSettingsOpen(!isSettingsOpen)
          break
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [
    shortcuts,
    router,
    theme,
    setTheme,
    locale,
    setLocale,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    columnCount,
    setColumnCount,
    isHelloEffectAnimationComplete,
  ])

  return null
}
