"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect } from "react"

import { type AppPath, COLUMN_OPTIONS } from "@/lib/globalStates"
import { matchesShortcut } from "@/lib/shortcuts"
import { DEFAULT_THEME, isTheme, nextTheme } from "@/lib/themes"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"
import { isTypingTarget } from "@/providers/theme-provider"

// Single global keydown listener: matches the user's configured shortcuts and
// runs the corresponding action. Replaces the old hardcoded theme hotkey.
export function ShortcutDispatcher() {
  const router = useRouter()
  const currentPath = usePathname() as AppPath
  const { theme, setTheme } = useTheme()
  const { locale, setLocale } = useLocale()
  const {
    shortcuts,
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isMediaPlayerOpen,
    setIsMediaPlayerOpen,
    isTerminalOpen,
    setIsTerminalOpen,
    setTerminalFile,
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
        case "goTimeline":
          router.push(`/${locale}/timeline`)
          break
        case "cycleTheme": {
          const current = isTheme(theme) ? theme : DEFAULT_THEME
          setTheme(nextTheme(current))
          break
        }
        case "openCommandMenu":
          setIsCommandPaletteOpen(!isCommandPaletteOpen)
          break
        case "openMediaPlayer":
          setIsMediaPlayerOpen(!isMediaPlayerOpen)
          break
        case "toggleLanguage":
          if (
            !isHelloEffectAnimationComplete &&
            (currentPath === "/en/" || currentPath === "/ja/")
          )
            return //Without this language change may cause animation to never complete resulting in never rendering the about section and stuck on the hello-effect
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
        case "toggleTerminal": {
          // A bare Ctrl+/ opens a plain shell, so clear any pending file target.
          if (!isTerminalOpen) setTerminalFile(null)
          setIsTerminalOpen(!isTerminalOpen)
          break
        }
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
    isMediaPlayerOpen,
    setIsMediaPlayerOpen,
    isTerminalOpen,
    setIsTerminalOpen,
    setTerminalFile,
    columnCount,
    setColumnCount,
    isHelloEffectAnimationComplete,
    currentPath,
  ])

  return null
}
