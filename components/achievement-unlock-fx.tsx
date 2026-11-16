"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { animate } from "motion/react"
import { useCallback, useEffect, useMemo, useRef } from "react"

import type { UnlockIntensity } from "@/lib/achievement-unlock"
import {
  burst,
  confetti,
  createFx,
  type FxState,
  isFxIdle,
  rays,
  ring,
  stepFx,
} from "@/lib/unlock-particles"
import { Z_LAYERS } from "@/lib/z-order"

const MAX_DPR = 2
const MAX_DT = 0.05
// Subtle: enough to lift the toast off the page, never a flash.
const DIM_ALPHA = 0.3

export type UnlockFx = {
  /** Resolve a CSS colour expression (e.g. `var(--rarity-rare)`) for canvas. */
  resolveColor: (value: string) => string
  impact: (args: {
    x: number
    y: number
    color: string
    confettiColors: readonly string[]
    intensity: UnlockIntensity
  }) => void
  sparks: (
    x: number,
    y: number,
    color: string,
    count: number,
    speed?: number
  ) => void
  rays: (x: number, y: number, color: string, buildSeconds: number) => void
  /** Ease a low-alpha dark overlay in, hold, and ease it out (never a flash). */
  dim: (seconds: number) => void
}

function draw(
  ctx: CanvasRenderingContext2D,
  fx: FxState,
  width: number,
  height: number
) {
  ctx.clearRect(0, 0, width, height)
  const reach = Math.max(width, height)
  for (const r of fx.rays) {
    const built = Math.min(1, r.age / r.build)
    const fade = r.age > r.build ? 1 - (r.age - r.build) / r.fade : 1
    ctx.save()
    ctx.translate(r.x, r.y)
    ctx.rotate(r.age * 0.6)
    ctx.globalCompositeOperation = "lighter"
    ctx.globalAlpha = 0.12 * built * fade // subtle: no dimming, no takeover
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, reach * 0.35)
    gradient.addColorStop(0, r.color)
    gradient.addColorStop(1, "transparent")
    ctx.fillStyle = gradient
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, reach, a, a + 0.09)
      ctx.closePath()
      ctx.fill()
    }
    ctx.restore()
  }
  for (const r of fx.rings) {
    const k = r.age / r.life
    const eased = 1 - (1 - k) ** 3
    ctx.globalAlpha = 1 - k
    ctx.strokeStyle = r.color
    ctx.lineWidth = r.width * (1 - k * 0.7)
    ctx.beginPath()
    ctx.arc(r.x, r.y, 12 + eased * r.maxRadius, 0, Math.PI * 2)
    ctx.stroke()
  }
  for (const p of fx.particles) {
    const k = p.age / p.life
    ctx.globalAlpha = p.kind === "confetti" ? Math.min(1, (1 - k) * 2.5) : 1 - k
    ctx.fillStyle = p.color
    ctx.strokeStyle = p.color
    if (p.kind === "spark") {
      ctx.lineWidth = p.size * 0.8
      ctx.lineCap = "round"
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * 0.045, p.y - p.vy * 0.045)
      ctx.stroke()
    } else if (p.kind === "confetti") {
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.scale(1, Math.abs(Math.cos(p.age * 7 + p.phase)))
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      ctx.restore()
    } else {
      ctx.beginPath()
      ctx.arc(p.x, p.y, p.size * (1 - k * 0.5), 0, Math.PI * 2)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

/**
 * One full-viewport canvas + flash layer for the unlock celebration. The rAF
 * loop only runs while something is alive (particles/rings/rays), so an idle
 * toast costs nothing. Returns the layer elements and an imperative API.
 */
export function useUnlockFx() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const flashRef = useRef<HTMLDivElement>(null)
  const dimRef = useRef<HTMLDivElement>(null)
  const fxRef = useRef<FxState>(createFx())
  const frameRef = useRef(0)

  const run = useCallback(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || frameRef.current !== 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000))
      last = now
      stepFx(fxRef.current, dt)
      draw(ctx, fxRef.current, width, height)
      if (isFxIdle(fxRef.current)) {
        ctx.clearRect(0, 0, width, height)
        frameRef.current = 0
        return
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(
    () => () => {
      cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
    },
    []
  )

  const api = useMemo<UnlockFx>(
    () => ({
      dim: (seconds) => {
        if (!dimRef.current) return
        animate(
          dimRef.current,
          { opacity: [0, DIM_ALPHA, DIM_ALPHA, 0] },
          { duration: seconds, ease: "easeInOut", times: [0, 0.2, 0.8, 1] }
        )
      },
      impact: ({ x, y, color, confettiColors, intensity }) => {
        const fx = fxRef.current
        // Bigger particle budgets also throw faster (0.13 common … 1 mythic).
        const power = intensity.particles / 110
        burst(fx, {
          color,
          count: intensity.particles,
          speed: 220 + power * 360,
          x,
          y,
        })
        burst(fx, {
          color: confettiColors[1] ?? color,
          count: Math.round(intensity.particles / 4),
          size: 1.8,
          speed: 160 + power * 240,
          x,
          y,
        })
        for (let i = 0; i < intensity.rings; i++) {
          ring(fx, {
            color,
            life: 0.55 + i * 0.12,
            maxRadius: 90 + i * 70,
            width: 5 - i,
            x,
            y,
          })
        }
        if (intensity.confetti > 0)
          confetti(fx, {
            colors: confettiColors,
            count: intensity.confetti,
            x,
            y,
          })
        // Single low-contrast flash (≤ 0.18) — never repeated, so far below 3/s.
        if (intensity.flash > 0 && flashRef.current) {
          flashRef.current.style.background = color
          animate(
            flashRef.current,
            { opacity: [0, intensity.flash, 0] },
            { duration: 0.28, ease: "easeOut" }
          )
        }
        // A short jolt of the page content (not the fixed layers).
        const main = document.querySelector("main")
        if (intensity.shake > 0 && main) {
          const s = intensity.shake
          const jitter = Array.from(
            { length: 8 },
            (_, i) => (Math.random() - 0.5) * 2 * s * (1 - i / 8)
          )
          animate(
            main,
            { x: [...jitter, 0], y: [...jitter.toReversed(), 0] },
            { duration: 0.38, ease: "linear" }
          )
        }
        run()
      },
      rays: (x, y, color, buildSeconds) => {
        rays(fxRef.current, { build: buildSeconds, color, fade: 0.6, x, y })
        run()
      },
      resolveColor: (value) => {
        const probe = canvasRef.current
        if (!probe) return value
        probe.style.color = value
        return getComputedStyle(probe).color
      },
      sparks: (x, y, color, count, speed = 160) => {
        burst(fxRef.current, { color, count, speed, x, y })
        run()
      },
    }),
    [run]
  )

  const layer = (
    <>
      {/* Page stays usable: pointer-events none, below the toast. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 bg-black opacity-0"
        ref={dimRef}
        style={{ zIndex: Z_LAYERS.unlockDim }}
      />
      <canvas
        aria-hidden
        className="pointer-events-none fixed inset-0 h-screen w-screen"
        ref={canvasRef}
        style={{ zIndex: Z_LAYERS.unlockFx }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-0 mix-blend-screen"
        ref={flashRef}
        style={{ zIndex: Z_LAYERS.unlockFx }}
      />
    </>
  )

  return { api, layer }
}
