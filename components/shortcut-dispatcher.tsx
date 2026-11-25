"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useEffectEvent } from "react"
import { type AppPath, nextAchievementLayout } from "@/lib/globalStates"
import { enterHints, isHintActive } from "@/lib/hint-store"
import { hrefForRoute, PAGE } from "@/lib/pages"
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
    // isCommandPaletteOpen,
    // setIsCommandPaletteOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    isMediaPlayerOpen,
    setIsMediaPlayerOpen,
    isTerminalOpen,
    setIsTerminalOpen,
    setTerminalFile,
    achievementLayout,
    setAchievementLayout,
    isHelloEffectAnimationComplete,
  } = useGlobalStates()

  // An Effect Event: always sees the latest state/settings, yet never needs to
  // be a dependency, so the window listener below is attached exactly once
  // instead of being torn down whenever any of ~17 values changes.
  const onKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.repeat) return
    // Hint mode owns the keyboard while active (its capture-phase listener
    // handles keys); don't also run shortcuts.
    if (isHintActive()) return
    if (isTypingTarget(event.target)) return

    const hit = shortcuts.find((shortcut) => matchesShortcut(event, shortcut))
    if (!hit) return
    event.preventDefault()

    switch (hit.action) {
      case "goHome":
        router.push(hrefForRoute(locale, PAGE.home.route))
        break
      case "goAchievements":
        router.push(hrefForRoute(locale, PAGE.achievements.route))
        break
      case "goTimeline":
        router.push(hrefForRoute(locale, PAGE.timeline.route))
        break
      case "goEnvironment":
        router.push(hrefForRoute(locale, PAGE.environment.route))
        break
      case "cycleTheme": {
        const current = isTheme(theme) ? theme : DEFAULT_THEME
        setTheme(nextTheme(current))
        break
      }
      // case "openCommandMenu":
      //   setIsCommandPaletteOpen(!isCommandPaletteOpen)
      //   break
      case "openMediaPlayer":
        setIsMediaPlayerOpen(!isMediaPlayerOpen)
        break
      case "toggleLanguage":
        if (
          !isHelloEffectAnimationComplete &&
          (currentPath === "/en/" || currentPath === "/ja/")
        )
          //INFO: Do not notify here, this is explicity not added in
          return //Without this language change may cause animation to never complete resulting in never rendering the about section and stuck on the hello-effect
        setLocale(locale === "en" ? "ja" : "en")
        break
      case "cycleAchievementLayout":
        setAchievementLayout(nextAchievementLayout(achievementLayout))
        break
      case "toggleSettings":
        setIsSettingsOpen(!isSettingsOpen)
        break
      case "toggleTerminal": {
        // A bare Ctrl+/ opens a plain shell, so clear any pending file target.
        if (!isTerminalOpen) setTerminalFile(null)
        setIsTerminalOpen(!isTerminalOpen)
        break
      }
      case "toggleHints":
        enterHints()
        break
    }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKeyDown(event)
    window.addEventListener("keydown", listener)
    return () => window.removeEventListener("keydown", listener)
  }, [])

  return null
}
