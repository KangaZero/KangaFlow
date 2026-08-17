"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useEffect } from "react"
import { Oneko, type OnekoOptions } from "@/lib/oneko"
import { useLocale } from "@/providers/locale-provider"

// Thin client wrapper: mounts the framework-agnostic Oneko once and tears it
// down on unmount. The static import gives a bundler-resolved URL (basePath and
// content hash applied), so nothing is hardcoded. Renders nothing itself — the
// class appends its own fixed-position element to <body>.
export function Neko(nekoOptions: Partial<OnekoOptions>) {
  const { translate } = useLocale()
  // Stable per-locale array reference (points into the dictionary), so the
  // effect only re-runs — and rebuilds the cat — when the language changes.
  const messages = translate("neko.speech")

  useEffect(() => {
    // Oneko already no-ops under reduced motion, but guarding here avoids even
    // creating/appending the element.
    if (!Oneko.canInitialize()) {
      return
    }
    // Spawn in the middle of the viewport (window coords, top-left origin).
    const neko = new Oneko({ ...nekoOptions, speechMessages: messages })
    return () => neko.destroy()
  }, [messages, nekoOptions])

  return null
}
