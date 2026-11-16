// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Composition + runtime of the dark-theme deep sea: which systems live on which
// depth layer, and one rAF loop that drives them all.

import { createJellies, createSchool, createSnow } from "@/lib/deep-sea/ambient"
import type { SeaSystem } from "@/lib/deep-sea/core"
import {
  createAnglers,
  createFarVisitors,
  createGulpers,
  createSharks,
  createVampireSquids,
  createVipers,
} from "@/lib/deep-sea/creatures"
import type { BubbleDepth } from "@/lib/deep-sea/css-bubbles"

/**
 * Depth layers, back to front. Depth of field is a CSS `filter: blur()` on the
 * whole canvas (one GPU pass) instead of blurring each body. `bubblesBefore`
 * slots a CSS-bubble tier in front of the previous layer, so far bubbles sit
 * behind near fish.
 */
export const DEEP_SEA_LAYERS = [
  { blur: 3, id: "far", opacity: 0.55 },
  { blur: 1.4, bubblesBefore: "far", id: "deep", opacity: 0.6 },
  { blur: 0.5, id: "mid", opacity: 0.85 },
  { blur: 0, bubblesBefore: "mid", id: "near", opacity: 1 },
  { blur: 7, bubblesBefore: "near", id: "foreground", opacity: 0.9 },
] as const satisfies readonly {
  id: string
  blur: number
  opacity: number
  bubblesBefore?: BubbleDepth
}[]

export type DeepSeaLayerId = (typeof DEEP_SEA_LAYERS)[number]["id"]

/**
 * The cast per layer. Counts are deliberately small (8 + 8 schooling fish, one
 * of each predator) — boids cost grows with n². `coarse` (touch devices)
 * halves the schools and drops the foreground pass.
 */
export function buildDeepSea(
  coarse: boolean
): Record<DeepSeaLayerId, SeaSystem[]> {
  const fish = coarse ? 4 : 8
  return {
    deep: [
      createSchool({ n: fish, size: [6, 16], speed: 0.55 }),
      createSnow(coarse ? 15 : 30, { alpha: 0.3, size: 1.5 }),
      createSharks({ band: [0.3, 0.7], size: [60, 200], speed: 18 }),
    ],
    far: [
      createFarVisitors(),
      createSnow(coarse ? 25 : 45, { alpha: 0.25, size: 1.2 }),
    ],
    foreground: coarse
      ? []
      : [
          createSharks({
            band: [0.25, 0.75],
            pass: true,
            size: [380, 820],
            speed: 120,
          }),
        ],
    mid: [
      createJellies({ n: 1, size: [12, 26] }),
      createGulpers(),
      createVampireSquids(),
    ],
    near: [
      createSchool({ n: fish }),
      createJellies({ n: 1, size: [20, 40] }),
      createAnglers(),
      createVipers(),
      createSnow(15, { alpha: 0.35, size: 2.2 }),
    ],
  }
}

const MAX_DPR = 1.5
const MAX_DT = 0.05

/**
 * Start the loop on the given canvases (one per DEEP_SEA_LAYERS entry, same
 * order). Pauses while the tab is hidden; fish flee the pointer, which is read
 * from `window` because the background itself is `pointer-events: none`.
 * Returns a cleanup function.
 */
export function runDeepSea(
  canvases: readonly HTMLCanvasElement[],
  systems: Record<DeepSeaLayerId, SeaSystem[]>
): () => void {
  const layers = DEEP_SEA_LAYERS.map((layer, i) => {
    const canvas = canvases[i]
    const ctx = canvas?.getContext("2d")
    return canvas && ctx ? { canvas, ctx, systems: systems[layer.id] } : null
  }).filter((layer) => layer !== null)
  const host = canvases[0]?.parentElement
  if (!host || layers.length !== DEEP_SEA_LAYERS.length) return () => {}

  let width = 0
  let height = 0
  const resize = () => {
    const rect = host.getBoundingClientRect()
    width = rect.width
    height = rect.height
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    for (const { canvas, ctx, systems: list } of layers) {
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      for (const system of list) system.resize(width, height)
    }
  }
  resize()
  const observer = new ResizeObserver(resize)
  observer.observe(host)

  const onPointer = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    for (const { systems: list } of layers)
      for (const system of list) system.pointer?.(x, y)
  }
  window.addEventListener("pointermove", onPointer, { passive: true })

  let frame = 0
  let last = performance.now()
  const tick = (now: number) => {
    // rAF timestamps can precede `last` on the first frame: never step backwards.
    const dt = Math.min(MAX_DT, Math.max(0, (now - last) / 1000))
    last = now
    const time = now / 1000
    for (const { ctx, systems: list } of layers) {
      ctx.clearRect(0, 0, width, height)
      for (const system of list) {
        system.step(dt, time)
        system.draw(ctx, time)
      }
    }
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
    window.removeEventListener("pointermove", onPointer)
    document.removeEventListener("visibilitychange", onVisibility)
  }
}
