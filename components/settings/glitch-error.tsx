"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useEffect, useState } from "react"

import { decryptFrame } from "@/lib/decrypt-text"

const DECRYPT_MS = 450

/**
 * A shortcut error that "decrypts" out of noise the moment a row breaks (the
 * same effect as the hero's role flip), then stays put. `play` is true only on
 * the render where the binding just became invalid; otherwise it renders the
 * plain message, so reopening the menu doesn't replay it.
 */
export function GlitchError({
  message,
  play,
  reduced,
  tag,
}: {
  message: string
  play: boolean
  reduced: boolean
  tag: string
}) {
  const [shown, setShown] = useState(message)

  useEffect(() => {
    if (!play || reduced) {
      setShown(message)
      return
    }
    const start = performance.now()
    let frame = requestAnimationFrame(function step(now) {
      const progress = (now - start) / DECRYPT_MS
      setShown(decryptFrame("", message, Math.max(progress, 0.01), Math.random))
      if (progress < 1) frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [message, play, reduced])

  return (
    <span className="pm-err" role="alert">
      <span className="pm-err-tag">{tag}</span>
      {/* The live region reads the final message, not the noise frames. */}
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{message}</span>
    </span>
  )
}
