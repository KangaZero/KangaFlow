"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useEffect, useRef } from "react"

import type { SkyBirdPalette } from "@/lib/sky-birds/draw"
import { BIRD_COUNTS, createSkyBirds } from "@/lib/sky-birds/scene"
import { cn } from "@/lib/utils"

const MAX_DPR = 1.5

// Colours are CSS tokens (app/globals.css, light theme); read once per mount —
// ThemeBackground remounts this layer on every theme change.
function readPalette(): SkyBirdPalette {
  const css = getComputedStyle(document.documentElement)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    gullBody: v("--sky-gull-body"),
    gullEdge: v("--sky-gull-edge"),
    gullTip: v("--sky-gull-tip"),
    gullWing: v("--sky-gull-wing"),
    hawk: v("--sky-hawk"),
    starling: v("--sky-starling"),
    starlingFar: v("--sky-starling-far"),
  }
}

/**
 * Light-theme birds: a small organic murmuration, a pale distant flock, gulls
 * and an occasional hawk pass (lib/sky-birds). Rendered as its own canvas
 * ABOVE the WebGL Clouds layer, not inside its HTML-in-Canvas content (that
 * would force a full-texture repaint every frame and fog the birds).
 * Decorative: aria-hidden, pointer-events none, no cursor interaction.
 * Reduced motion is handled by the caller (Activity-gated like the others).
 */
export function SkyBirds({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    const host = canvas?.parentElement
    if (!canvas || !ctx || !host) return

    const light =
      window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768
    const counts = light ? BIRD_COUNTS.coarse : BIRD_COUNTS.fine
    const palette = readPalette()
    // Layout size (offset*), NOT getBoundingClientRect: the theme crossfade
    // scales this layer 1.04 → 1 and ResizeObserver never fires for a
    // transform, so a bounding-rect size would stay 4% too large.
    const scene = createSkyBirds(
      { height: host.offsetHeight, width: host.offsetWidth },
      counts,
      Date.now() & 0xffff
    )

    let width = host.offsetWidth
    let height = host.offsetHeight
    const resize = () => {
      width = host.offsetWidth
      height = host.offsetHeight
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      scene.resize(width, height)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(host)

    let frame = 0
    let last = performance.now()
    const tick = (now: number) => {
      scene.advance((now - last) / 1000) // sub-stepped + capped inside
      last = now
      ctx.clearRect(0, 0, width, height)
      scene.draw(ctx, palette)
      frame = requestAnimationFrame(tick)
    }
    const start = () => {
      last = performance.now()
      frame = requestAnimationFrame(tick)
    }
    const onVisibility = () => {
      cancelAnimationFrame(frame)
      if (!document.hidden) start()
    }
    document.addEventListener("visibilitychange", onVisibility)
    start()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [])

  return (
    <canvas
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 size-full",
        className
      )}
      ref={canvasRef}
    />
  )
}
