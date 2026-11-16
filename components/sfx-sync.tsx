"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"
import { useEffect, useRef, useState } from "react"

import { isReducedMotion } from "@/lib/isReducedMotion"
import { stopAmbience, syncAmbience } from "@/lib/sfx/ambience"
import { playSfx, setSfxGate } from "@/lib/sfx/play"
import { useGlobalStates } from "@/providers/global-state-provider"

/**
 * Bridges React state to the framework-agnostic lib/sfx: the soundEffects /
 * reduced-motion gate, the first-user-gesture unlock (nothing is created or
 * played before it), app-wide toggle + theme-switch sounds, and the opt-in
 * ambience (crossfades on theme change, paused while the tab is hidden).
 * Renders nothing.
 */
export function SfxSync() {
  const { soundEffects, ambience, animationPref } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const { resolvedTheme } = useTheme()
  const [gestured, setGestured] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    setSfxGate({ enabled: soundEffects, reducedMotion: reduced })
  }, [soundEffects, reduced])

  // Autoplay policy: audio may only start after a user gesture.
  useEffect(() => {
    const unlock = () => {
      setSfxGate({ gestured: true })
      setGestured(true)
    }
    window.addEventListener("pointerdown", unlock, {
      capture: true,
      once: true,
    })
    window.addEventListener("keydown", unlock, { capture: true, once: true })
    return () => {
      window.removeEventListener("pointerdown", unlock, { capture: true })
      window.removeEventListener("keydown", unlock, { capture: true })
    }
  }, [])

  // Every switch in the app (role="switch"): read its new state after the click.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target
      const toggle =
        target instanceof Element ? target.closest('[role="switch"]') : null
      if (!toggle) return
      requestAnimationFrame(() =>
        playSfx(
          toggle.getAttribute("aria-checked") === "true"
            ? "toggle-on"
            : "toggle-off"
        )
      )
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [])

  // Theme switch from any source (toggle, shortcut, terminal `theme`).
  const previousTheme = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (
      previousTheme.current !== undefined &&
      resolvedTheme !== undefined &&
      previousTheme.current !== resolvedTheme
    ) {
      playSfx("theme-switch")
    }
    previousTheme.current = resolvedTheme
  }, [resolvedTheme])

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [])

  useEffect(() => {
    syncAmbience({
      enabled: ambience && gestured,
      hidden,
      theme: resolvedTheme,
    })
  }, [ambience, gestured, hidden, resolvedTheme])

  useEffect(() => () => stopAmbience(), [])

  return null
}
