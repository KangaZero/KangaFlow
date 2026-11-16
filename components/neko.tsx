"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useReducedMotion } from "motion/react"
import { useEffect } from "react"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { Oneko } from "@/lib/oneko"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// Thin client wrapper: mounts the framework-agnostic Oneko and tears it down on
// unmount. Renders nothing itself — the class appends its own fixed-position
// element to <body>. All configuration comes from persisted global state (set
// via the terminal's `oneko` command), so there are no props: a props object
// would be a fresh identity every render and rebuild the cat each time.
export function Neko() {
  const { translate } = useLocale()
  const { animationPref, onekoEnabled, onekoFollowCursor } = useGlobalStates()
  // Same resolution the terminal's reduced-motion warning uses: the site's
  // animation preference first, then the OS setting.
  const reduceMotion = isReducedMotion(animationPref, useReducedMotion())
  // Stable per-locale array reference (points into the dictionary), so the
  // effect only re-runs on a language change — not on every render.
  const messages = translate("neko.speech")

  // Every dependency is a primitive or a stable reference, so the cat is
  // rebuilt only when a setting that shapes it actually changes; the cleanup
  // always destroys the previous instance first (never two cats at once).
  useEffect(() => {
    if (!onekoEnabled || reduceMotion) {
      return
    }
    const neko = new Oneko({
      followMouse: onekoFollowCursor,
      speechMessages: messages,
    })
    return () => neko.destroy()
  }, [messages, onekoEnabled, onekoFollowCursor, reduceMotion])

  return null
}
