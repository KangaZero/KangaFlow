"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useEffect } from "react"
import onekoSrc from "@/assets/oneko/default.png"
import { Oneko } from "@/lib/oneko"
import { useLocale } from "@/providers/locale-provider"

// Thin client wrapper: mounts the framework-agnostic Oneko once and tears it
// down on unmount. The static import gives a bundler-resolved URL (basePath and
// content hash applied), so nothing is hardcoded. Renders nothing itself — the
// class appends its own fixed-position element to <body>.
export function Neko() {
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
    const neko = new Oneko({
      source: onekoSrc.src,
      speechMessages: messages,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })
    return () => neko.destroy()
  }, [messages])

  return null
}
