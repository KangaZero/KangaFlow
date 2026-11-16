// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Canvas drawing for the light-theme birds. Colours come in as a palette read
// from CSS tokens (app/globals.css), never hard-coded here.

import type { Flock } from "@/lib/sky-birds/flock"
import { clamp, lerp } from "@/lib/sky-birds/flock"
import { type Gull, gullWing } from "@/lib/sky-birds/gull"
import type { Noise } from "@/lib/sky-birds/noise"

export type SkyBirdPalette = {
  starling: string
  starlingFar: string
  gullWing: string
  gullTip: string
  gullBody: string
  gullEdge: string
  hawk: string
}

export type FlockLook = {
  scale: number
  color: keyof Pick<SkyBirdPalette, "starling" | "starlingFar">
  alpha: readonly [far: number, near: number]
}

/** Tiny "v" seen from below: swept, banked wings whose span pulses with the beat. */
export function drawFlock(
  ctx: CanvasRenderingContext2D,
  flock: Flock,
  look: FlockLook,
  palette: SkyBirdPalette
): void {
  ctx.strokeStyle = palette[look.color]
  ctx.lineCap = "round"
  ctx.lineJoin = "round"
  for (const b of flock.birds) {
    const c = Math.cos(b.h)
    const s = Math.sin(b.h)
    const size = look.scale * b.size * lerp(1.3, 2.7, b.z)
    const span = b.gliding ? 0.95 : 0.45 + 0.55 * Math.abs(Math.cos(b.phase))
    const bob = b.gliding ? 0 : Math.sin(b.phase) * 0.35 * size
    const left = size * (1.2 + span) * (1 - b.bank * 0.35)
    const right = size * (1.2 + span) * (1 + b.bank * 0.35)
    const sweep = b.gliding ? 0.25 : 0.55 - span * 0.35
    const x = b.x
    const y = b.y + bob
    ctx.globalAlpha = lerp(look.alpha[0], look.alpha[1], b.z)
    ctx.lineWidth = lerp(0.9, 1.6, b.z) * look.scale
    ctx.beginPath()
    ctx.moveTo(x - (c * sweep + s) * left, y - (s * sweep - c) * left)
    ctx.lineTo(x + c * size * 0.9, y + s * size * 0.9)
    ctx.lineTo(x - (c * sweep - s) * right, y - (s * sweep + c) * right)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

// Mirrors smoothly through head-on (no snap) so "up" stays up whichever way
// the gull flies; the frame narrows as it turns toward/away from the viewer.
function toWorld(
  g: Gull,
  p: readonly [number, number],
  scale: number
): [number, number] {
  const c = Math.cos(g.h)
  const n = Math.sin(g.h)
  const m = clamp(c * 4, -1, 1) || 1
  const y = p[1] * m
  return [g.x + (p[0] * c - y * n) * scale, g.y + (p[0] * n + y * c) * scale]
}

export function drawGull(
  ctx: CanvasRenderingContext2D,
  g: Gull,
  noise: Noise,
  palette: SkyBirdPalette
): void {
  const s = g.scale
  ctx.lineWidth = 0.8
  for (const side of [-1, 1] as const) {
    const wing = gullWing(g, side, noise)
    const front = wing.map((q) => toWorld(g, q, s))
    const back = wing.map((q, i) =>
      toWorld(g, [q[0] - ([6, 7, 4, 0][i] ?? 0), q[1]], s)
    )
    const [p0, p1, p2, p3] = front
    const [b0, b1, b2] = back
    if (!p0 || !p1 || !p2 || !p3 || !b0 || !b1 || !b2) continue
    ctx.fillStyle = palette.gullWing
    ctx.strokeStyle = palette.gullEdge
    ctx.beginPath()
    ctx.moveTo(p0[0], p0[1])
    ctx.lineTo(p1[0], p1[1])
    ctx.quadraticCurveTo(p2[0], p2[1], p3[0], p3[1])
    ctx.lineTo(b2[0], b2[1])
    ctx.lineTo(b1[0], b1[1])
    ctx.lineTo(b0[0], b0[1])
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
    // black primaries
    ctx.fillStyle = palette.gullTip
    ctx.beginPath()
    ctx.moveTo(lerp(p2[0], p3[0], 0.45), lerp(p2[1], p3[1], 0.45))
    ctx.lineTo(p3[0], p3[1])
    ctx.lineTo(lerp(b2[0], p3[0], 0.45), lerp(b2[1], p3[1], 0.45))
    ctx.closePath()
    ctx.fill()
  }
  const head = toWorld(g, [11, 0], s)
  const tail = toWorld(g, [-12, 0], s)
  const l = toWorld(g, [0, -3.2], s)
  const r = toWorld(g, [0, 3.2], s)
  ctx.fillStyle = palette.gullBody
  ctx.strokeStyle = palette.gullEdge
  ctx.beginPath()
  ctx.moveTo(head[0], head[1])
  ctx.quadraticCurveTo(l[0], l[1], tail[0], tail[1])
  ctx.quadraticCurveTo(r[0], r[1], head[0], head[1])
  ctx.fill()
  ctx.stroke()
}

export function drawHawk(
  ctx: CanvasRenderingContext2D,
  hawk: { x: number; y: number; vx: number; vy: number },
  palette: SkyBirdPalette
): void {
  ctx.save()
  ctx.translate(hawk.x, hawk.y)
  ctx.rotate(Math.atan2(hawk.vy, hawk.vx))
  ctx.fillStyle = palette.hawk
  ctx.beginPath()
  ctx.moveTo(8, 0)
  ctx.lineTo(-6, -9)
  ctx.lineTo(-3, 0)
  ctx.lineTo(-6, 9)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}
