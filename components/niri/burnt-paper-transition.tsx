"use client"

import { useEffect, useRef } from "react"
import { Z_LAYERS } from "@/lib/z-order"

const W = 640
const H = 360
const BURN_DURATION = 1800

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v))

type RGB = readonly [number, number, number]

// Fire front colours: innermost (hottest) → outermost (coolest)
const FIRE_STOPS: readonly [number, RGB][] = [
  [0.0, [170, 35, 0]],
  [0.35, [230, 90, 0]],
  [0.65, [255, 155, 10]],
  [0.85, [255, 215, 40]],
  [1.0, [255, 255, 160]],
] as const

function fireColor(hot: number): RGB {
  for (let i = 1; i < FIRE_STOPS.length; i++) {
    const prev = FIRE_STOPS[i - 1]
    const curr = FIRE_STOPS[i]
    if (prev === undefined || curr === undefined) continue
    const [t0, c0] = prev
    const [t1, c1] = curr
    if (hot <= t1) {
      const t = (hot - t0) / (t1 - t0)
      return [
        Math.round(lerp(c0[0], c1[0], t)),
        Math.round(lerp(c0[1], c1[1], t)),
        Math.round(lerp(c0[2], c1[2], t)),
      ]
    }
  }
  return [255, 255, 160]
}

type BurnOrigin = {
  ox: number
  oy: number
  delay: number // ms before this point ignites
  rate: number // radius growth multiplier
}

// Four burn points scattered across the full canvas. Each ignites at a
// different time so you see distinct rings start, expand, and merge.
function makeOrigins(): BurnOrigin[] {
  return Array.from({ length: 4 }, (_, i) => ({
    delay: i * 160 + Math.random() * 120,
    ox: W * 0.15 + Math.random() * W * 0.7,
    oy: H * 0.15 + Math.random() * H * 0.7,
    rate: 0.8 + Math.random() * 0.4,
  }))
}

// Low-amplitude noise keeps the burn edge clean (Balatro-style) rather than
// realistically jagged. Just enough irregularity to feel organic.
function edgeNoise(angle: number, time: number, seed: number): number {
  return (
    Math.sin(angle * 6 + time * 1.8 + seed * 1.7) * 0.12 +
    Math.sin(angle * 13 + time * 3.2 + seed * 2.3) * 0.07 +
    Math.sin(angle * 3 + time * 1.1 + seed * 0.9) * 0.06
  )
}

function originRadius(o: BurnOrigin, elapsed: number): number {
  const t = clamp((elapsed - o.delay) / BURN_DURATION, 0, 1)
  const eased = 1 - (1 - t) ** 2
  const diag = Math.sqrt(W * W + H * H)
  return diag * 1.1 * eased * o.rate
}

export function BurntPaperTransition({
  onComplete,
}: {
  onComplete: () => void
}): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctxRaw = canvas.getContext("2d")
    if (!ctxRaw) return
    const ctx = ctxRaw

    canvas.width = W
    canvas.height = H

    const origins = makeOrigins()
    const maxDelay = Math.max(...origins.map((o) => o.delay))
    const totalDuration = BURN_DURATION + maxDelay
    const startTime = performance.now()
    let raf: number

    function render(now: number): void {
      const elapsed = now - startTime
      const progress = elapsed / totalDuration
      const time = elapsed / 1000

      const maxR = Math.max(...origins.map((o) => originRadius(o, elapsed)))
      // Crisp fire ring + thin char trail. The environment reveals quickly
      // behind the ring rather than building up a thick charred border.
      const fireW = Math.max(5, maxR * 0.07)
      const charW = Math.max(8, maxR * 0.16)

      const imageData = ctx.createImageData(W, H)
      const { data } = imageData

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4

          // Max burn depth across all origins — union of all fire fronts
          let maxDepth = Number.NEGATIVE_INFINITY
          for (let s = 0; s < origins.length; s++) {
            const o = origins[s]
            if (o === undefined) continue
            const r = originRadius(o, elapsed)
            if (r <= 0) continue
            const dx = x - o.ox
            const dy = y - o.oy
            const dist = Math.sqrt(dx * dx + dy * dy)
            const angle = Math.atan2(dy, dx)
            const noise = edgeNoise(angle, time, s)
            const noisyR = r * (1 + noise * 0.22)
            const depth = noisyR - dist // positive = inside burn
            if (depth > maxDepth) maxDepth = depth
          }

          // relDist > 0 = unburnt, relDist < 0 = inside burn
          const relDist = -maxDepth
          const pixelFlicker =
            Math.sin(x * 31.3 + y * 17.7 + time * 23) * 0.5 + 0.5

          if (relDist > fireW) {
            // Unburnt paper
            data[i] = 10
            data[i + 1] = 10
            data[i + 2] = 16
            data[i + 3] = 255
          } else if (relDist > 0) {
            // Fire zone: white-yellow core → orange-red outer edge
            const t = relDist / fireW
            const hot = clamp(1 - t + pixelFlicker * 0.25, 0, 1)
            const [r, g, b] = fireColor(hot)
            data[i] = r
            data[i + 1] = g
            data[i + 2] = b
            data[i + 3] = 255
          } else if (relDist > -charW) {
            // Thin char ring: orange-brown right behind fire, fades to
            // transparent quickly so the environment is revealed cleanly.
            const t = -relDist / charW
            const colorT = t ** 0.5
            data[i] = Math.round(lerp(200, 8, colorT))
            data[i + 1] = Math.round(lerp(80, 3, colorT))
            data[i + 2] = Math.round(lerp(18, 1, colorT))
            // Fade starts at t=0.4 so transparency follows the ring closely
            data[i + 3] = Math.round(lerp(255, 0, clamp((t - 0.4) / 0.6, 0, 1)))
          } else {
            // Fully burnt — transparent, live environment shows through
            data[i + 3] = 0
          }
        }
      }

      ctx.putImageData(imageData, 0, 0)

      if (progress >= 1) {
        onCompleteRef.current()
      } else {
        raf = requestAnimationFrame(render)
      }
    }

    raf = requestAnimationFrame(render)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        height: "100%",
        inset: 0,
        position: "fixed",
        width: "100%",
        zIndex: Z_LAYERS.toast + 100,
      }}
    />
  )
}
