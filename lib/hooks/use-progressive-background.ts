// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Blur-up loading for a CSS background image (which has no load event of its
// own). Preloads `src` with `new Image()`: already in the memory cache → "ready"
// at once, no placeholder; otherwise "loading" until `decode()` resolves, then
// "revealing" until the caller reports the opacity fade finished (skipped when
// the bytes came from the HTTP cache — see settledEvent).
//
// Runs in a layout effect so the cache check lands before the first paint (no
// one-frame placeholder flash). The phase is stored with the `src` it belongs
// to, so switching wallpapers never shows the previous image's state.

import { useCallback, useLayoutEffect, useState } from "react"

import {
  type LoadEvent,
  type LoadPhase,
  mountEvent,
  nextLoadPhase,
  servedFromCache,
  settledEvent,
} from "@/lib/progressive-load"

type Keyed = { readonly src: string; readonly phase: LoadPhase }

export type ProgressiveBackground = {
  /** "pending" until the preload check has run for the current `src`. */
  phase: LoadPhase
  /** Call when the reveal fade ends, so the placeholder layer can unmount. */
  onRevealed: () => void
}

export function useProgressiveBackground(
  src: string | null
): ProgressiveBackground {
  const [state, setState] = useState<Keyed | null>(null)

  const apply = useCallback(
    (forSrc: string, event: LoadEvent) =>
      setState((current) => ({
        phase: nextLoadPhase(
          current?.src === forSrc ? current.phase : "pending",
          event
        ),
        src: forSrc,
      })),
    []
  )

  useLayoutEffect(() => {
    if (src === null) return
    let cancelled = false
    const image = new Image()
    image.decoding = "async"
    image.src = src
    const event = mountEvent(image)
    apply(src, event)
    if (event === "incomplete") {
      const started = performance.now()
      // decode() resolves once the bytes are in and decoded, and rejects on a
      // network/encoding error, so it covers both `load` and `error`.
      image.decode().then(
        () => {
          if (cancelled) return
          const settled = settledEvent({
            elapsedMs: performance.now() - started,
            fromCache: servedFromCache(image.currentSrc),
          })
          apply(src, settled)
        },
        () => {
          if (!cancelled) apply(src, "failed")
        }
      )
    }
    return () => {
      cancelled = true
    }
  }, [src, apply])

  const onRevealed = useCallback(() => {
    if (src !== null) apply(src, "revealed")
  }, [src, apply])

  const phase = state !== null && state.src === src ? state.phase : "pending"
  return { onRevealed, phase }
}
