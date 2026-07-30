"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Renders the "f" link-hint mode: a faint glass wash over the page plus a
// blurred chip on each clickable element. While active it owns the keyboard
// (capture-phase listener) so typing selects a hint instead of firing other
// shortcuts. Colours come from theme tokens (--primary / --background) so it
// fits light, dark, and terminal without per-theme branching.

import { AnimatePresence, motion } from "motion/react"
import { useEffect, useSyncExternalStore } from "react"
import {
  exitHints,
  getHintSnapshot,
  getServerHintSnapshot,
  hintBackspace,
  subscribeHints,
  typeHintChar,
} from "@/lib/hint-store"

export function HintOverlay() {
  const state = useSyncExternalStore(
    subscribeHints,
    getHintSnapshot,
    getServerHintSnapshot
  )
  const { active, hints, typed } = state

  useEffect(() => {
    if (!active) return
    // Capture phase so hint mode intercepts keys before the global dispatcher
    // (and the page) see them.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault()
        event.stopPropagation()
        exitHints()
      } else if (event.key === "Backspace") {
        event.preventDefault()
        event.stopPropagation()
        hintBackspace()
      } else if (event.key.length === 1 && /[a-z]/i.test(event.key)) {
        event.preventDefault()
        event.stopPropagation()
        typeHintChar(event.key)
      }
    }
    // Positions are captured once; if the layout shifts, drop out rather than
    // point at stale coordinates.
    function onShift() {
      exitHints()
    }
    window.addEventListener("keydown", onKeyDown, true)
    window.addEventListener("scroll", onShift, true)
    window.addEventListener("resize", onShift)
    return () => {
      window.removeEventListener("keydown", onKeyDown, true)
      window.removeEventListener("scroll", onShift, true)
      window.removeEventListener("resize", onShift)
    }
  }, [active])

  if (!active) return null

  const visible = hints.filter((hint) => hint.label.startsWith(typed))

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[90]"
    >
      {/* Faint glass wash so the hints read as an overlay layer. */}
      <div className="absolute inset-0 bg-background/5 backdrop-blur-[0.5px]" />

      <AnimatePresence>
        {visible.map((hint) => (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="absolute"
            exit={{ opacity: 0, scale: 0.6 }}
            initial={{ opacity: 0, scale: 0.6 }}
            key={hint.label}
            style={{ left: hint.x, top: hint.y }}
            transition={{ duration: 0.12 }}
          >
            {/* Glass chip: translucent, blurred, primary-accent ring. */}
            <kbd className="inline-flex -translate-x-1 -translate-y-1/2 items-center rounded-md border border-primary/50 bg-background/70 px-1.5 py-0.5 font-bold font-mono text-[11px] uppercase leading-none shadow-black/30 shadow-lg backdrop-blur-md">
              <span className="text-muted-foreground/70">{typed}</span>
              <span className="text-primary">
                {hint.label.slice(typed.length)}
              </span>
            </kbd>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
