"use client"

import { useEffect, useRef } from "react"
import { Z_LAYERS } from "@/lib/z-order"

const W = 640
const H = 360
const DURATION = 2000

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp = (v: number, lo: number, hi: number): number =>
  Math.max(lo, Math.min(hi, v))

type RGB = readonly [number, number, number]
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
    const ctx: CanvasRenderingContext2D | null = canvas.getContext("2d")
    if (ctx === null) return
    const context = ctx

    canvas.width = W
    canvas.height = H

    const ox = W / 2 + (Math.random() - 0.5) * W * 0.3
    const oy = H / 2 + (Math.random() - 0.5) * H * 0.3
    const maxRadius = Math.sqrt((W / 2) ** 2 + (H / 2) ** 2)
    const startTime = performance.now()
    let raf: number

    function render(now: number): void {
      const progress = Math.min((now - startTime) / DURATION, 1)
      const eased = 1 - (1 - progress) ** 2
      const radius = maxRadius * 1.15 * eased
      const time = (now - startTime) / 1000

      const imageData = context.createImageData(W, H)
      const { data } = imageData

      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4
          const dx = x - ox
          const dy = y - oy
          const dist = Math.sqrt(dx * dx + dy * dy)
          const angle = Math.atan2(dy, dx)

          const edgeNoise =
            Math.sin(angle * 8 + time * 2.3) * 0.4 +
            Math.sin(angle * 17 + time * 4.1) * 0.2 +
            Math.sin(angle * 5 + time * 1.7) * 0.25 +
            Math.sin(angle * 35 + time * 6.3) * 0.15

          const pixelFlicker =
            Math.sin(x * 31.3 + y * 17.7 + time * 23) * 0.5 + 0.5

          const noisyRadius = radius * (1 + edgeNoise * 0.22)
          const fireW = Math.max(3, radius * 0.1)
          const charW = Math.max(5, radius * 0.14)
          const relDist = dist - noisyRadius

          if (relDist > fireW) {
            data[i] = 10
            data[i + 1] = 10
            data[i + 2] = 16
            data[i + 3] = 255
          } else if (relDist > 0) {
            const t = relDist / fireW
            const hot = clamp(1 - t + pixelFlicker * 0.25, 0, 1)
            const [r, g, b] = fireColor(hot)
            data[i] = r
            data[i + 1] = g
            data[i + 2] = b
            data[i + 3] = 255
          } else if (relDist > -charW) {
            const t = -relDist / charW
            data[i] = Math.round(lerp(55, 4, t))
            data[i + 1] = Math.round(lerp(28, 2, t))
            data[i + 2] = Math.round(lerp(12, 1, t))
            data[i + 3] = Math.round(lerp(200, 0, t))
          } else {
            data[i + 3] = 0
          }
        }
      }

      context.putImageData(imageData, 0, 0)

      if (progress < 1) {
        raf = requestAnimationFrame(render)
      } else {
        onCompleteRef.current()
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
