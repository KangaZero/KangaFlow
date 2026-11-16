// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Ambient life: a schooling fish swarm (boids), pulse-driven jellyfish and
// marine snow. Bubbles are NOT here — they are pure CSS (components/deep-sea.css).

import { BIO } from "@/lib/bubbles"
import {
  clamp,
  item,
  lerp,
  makeSpine,
  type Pt,
  type Range,
  rand,
  type SeaSystem,
  TAU,
} from "@/lib/deep-sea/core"

/* ------------------------------------------------------------------------ */
/* Schooling fish: boids + bending spine + photophores, flee the pointer    */
/* ------------------------------------------------------------------------ */

const FISH_SEGMENTS = 9
const NEIGHBOUR_RADIUS = 90
const PERSONAL_SPACE = 26
const FLEE_RADIUS = 150

type Fish = {
  x: number
  y: number
  vx: number
  vy: number
  s: number
  spine: Pt[]
  beat: number
  ph: number
  wander: number
  pace: number
}

export function createSchool({
  n = 8,
  size = [12, 42],
  speed = 1,
}: Partial<{ n: number; size: Range; speed: number }> = {}): SeaSystem {
  let width = 0
  let height = 0
  let fish: Fish[] = []
  const pointer = { life: 0, x: Number.NaN, y: Number.NaN }

  function make(): Fish {
    const s = rand(size[0], size[1])
    const x = rand(0, width)
    const y = rand(height * 0.1, height * 0.85)
    const a = rand(0, TAU)
    return {
      beat: rand(0, TAU),
      pace: rand(0.85, 1.15),
      ph: rand(0, TAU),
      s,
      spine: makeSpine(x, y, FISH_SEGMENTS, s * 0.13, a),
      vx: Math.cos(a) * 40,
      vy: Math.sin(a) * 20,
      wander: rand(0, TAU),
      x,
      y,
    }
  }

  function wrap(f: Fish, dx: number) {
    f.x += dx
    for (const p of f.spine) p.x += dx
  }

  return {
    draw(ctx) {
      for (const f of fish) drawFish(ctx, f)
    },
    pointer(x, y) {
      pointer.x = x
      pointer.y = y
      pointer.life = 1.5
    },
    resize(w, h) {
      const first = width === 0
      width = w
      height = h
      if (first) fish = Array.from({ length: n }, make)
    },
    step(dt, time) {
      pointer.life -= dt
      for (const f of fish) {
        // Boids: separation, alignment, cohesion (O(n²), fine for n ≤ ~20).
        let sx = 0
        let sy = 0
        let ax = 0
        let ay = 0
        let cx = 0
        let cy = 0
        let neighbours = 0
        for (const o of fish) {
          if (o === f) continue
          const dx = o.x - f.x
          const dy = o.y - f.y
          const d2 = dx * dx + dy * dy
          if (d2 >= NEIGHBOUR_RADIUS ** 2) continue
          neighbours++
          ax += o.vx
          ay += o.vy
          cx += o.x
          cy += o.y
          if (d2 < PERSONAL_SPACE ** 2) {
            const d = Math.sqrt(d2) || 1
            sx -= dx / d
            sy -= dy / d
          }
        }
        let fx = sx * 60
        let fy = sy * 60
        if (neighbours > 0) {
          fx += (ax / neighbours - f.vx) * 0.9 + (cx / neighbours - f.x) * 0.25
          fy += (ay / neighbours - f.vy) * 0.9 + (cy / neighbours - f.y) * 0.25
        }
        f.wander += rand(-1, 1) * dt * 2
        fx += Math.cos(f.wander) * 18
        fy += Math.sin(f.wander) * 10
        if (f.y < height * 0.06) fy += (height * 0.06 - f.y) * 2
        if (f.y > height * 0.92) fy -= (f.y - height * 0.92) * 2
        const fleeing = pointer.life > 0
        if (fleeing) {
          const dx = f.x - pointer.x
          const dy = f.y - pointer.y
          const d = Math.hypot(dx, dy)
          if (d > 0 && d < FLEE_RADIUS) {
            const push = 900 * (1 - d / FLEE_RADIUS)
            fx += (dx / d) * push
            fy += (dy / d) * push
          }
        }
        f.vx += fx * dt
        f.vy += fy * dt
        // Burst-and-coast swimming.
        const burst = 1 + 0.7 * Math.max(0, Math.sin(time * 0.8 + f.ph)) ** 6
        const current = Math.hypot(f.vx, f.vy) || 1
        const limit = Math.min(
          clamp(current, 28, 140),
          55 * burst * speed * f.pace + (fleeing ? 80 : 0)
        )
        f.vx = (f.vx / current) * limit
        f.vy = (f.vy / current) * limit * 0.8
        f.x += f.vx * dt
        f.y += f.vy * dt
        if (f.x < -80) wrap(f, width + 160)
        else if (f.x > width + 80) wrap(f, -width - 160)
        // Spine: head + lateral tail beat; the rest follows at fixed spacing.
        f.beat += dt * (4 + limit * 0.09)
        const head = item(f.spine, 0)
        const len = f.s * 0.13
        const nx = -f.vy / limit
        const ny = f.vx / limit
        head.x = f.x + nx * Math.sin(f.beat) * f.s * 0.03
        head.y = f.y + ny * Math.sin(f.beat) * f.s * 0.03
        for (let i = 1; i < FISH_SEGMENTS; i++) {
          const p = item(f.spine, i - 1)
          const q = item(f.spine, i)
          const wob =
            Math.sin(f.beat - i * 0.7) * (i / FISH_SEGMENTS) * f.s * 0.05
          const dx = q.x - p.x + nx * wob
          const dy = q.y - p.y + ny * wob
          const d = Math.hypot(dx, dy) || 1
          q.x = p.x + (dx / d) * len
          q.y = p.y + (dy / d) * len
        }
      }
    },
  }
}

function drawFish(ctx: CanvasRenderingContext2D, f: Fish): void {
  const S = f.spine
  const n = S.length
  const left: [number, number][] = []
  const right: [number, number][] = []
  for (let i = 0; i < n; i++) {
    const a = item(S, i - 1)
    const b = item(S, i + 1)
    const p = item(S, i)
    const d = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const dx = (b.x - a.x) / d
    const dy = (b.y - a.y) / d
    const u = i / (n - 1)
    const w =
      f.s *
      0.2 *
      Math.sin(Math.PI * Math.min(1, u * 1.15 + 0.08)) ** 0.8 *
      (1 - u * 0.55)
    left.push([p.x - dy * w, p.y + dx * w])
    right.push([p.x + dy * w, p.y - dx * w])
  }
  const s0 = item(S, 0)
  const s1 = item(S, 1)
  ctx.beginPath()
  ctx.moveTo(s0.x + (s0.x - s1.x) * 0.9, s0.y + (s0.y - s1.y) * 0.9)
  for (const [x, y] of left) ctx.lineTo(x, y)
  for (let i = right.length - 1; i >= 0; i--) {
    const [x, y] = item(right, i)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fillStyle = "rgba(3,26,34,0.94)"
  ctx.fill()
  ctx.lineWidth = 1
  ctx.strokeStyle = "rgba(57,230,207,0.45)"
  ctx.stroke()
  // Forked tail.
  const tail = item(S, n - 1)
  const prev = item(S, n - 2)
  const d = Math.hypot(tail.x - prev.x, tail.y - prev.y) || 1
  const dx = (tail.x - prev.x) / d
  const dy = (tail.y - prev.y) / d
  const tl = f.s * 0.32
  ctx.beginPath()
  ctx.moveTo(tail.x, tail.y)
  ctx.lineTo(
    tail.x + dx * tl - dy * tl * 0.55,
    tail.y + dy * tl + dx * tl * 0.55
  )
  ctx.lineTo(tail.x + dx * tl * 0.55, tail.y + dy * tl * 0.55)
  ctx.lineTo(
    tail.x + dx * tl + dy * tl * 0.55,
    tail.y + dy * tl - dx * tl * 0.55
  )
  ctx.closePath()
  ctx.fillStyle = "rgba(57,230,207,0.16)"
  ctx.fill()
  ctx.stroke()
  // Eye + twinkling photophores (lantern-fish light dots).
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  ctx.fillStyle = BIO
  ctx.beginPath()
  ctx.arc(s1.x, s1.y, Math.max(1, f.s * 0.045), 0, TAU)
  ctx.fill()
  for (let i = 2; i < n - 1; i++) {
    const [rx, ry] = item(right, i)
    const p = item(S, i)
    const x = lerp(p.x, rx, 0.55)
    const y = lerp(p.y, ry, 0.55)
    const twinkle = 0.55 + 0.45 * Math.sin(f.beat * 0.5 + i)
    ctx.fillStyle = `rgba(57,230,207,${0.18 * twinkle})`
    ctx.beginPath()
    ctx.arc(x, y, 3.2, 0, TAU)
    ctx.fill()
    ctx.fillStyle = `rgba(190,255,248,${0.9 * twinkle})`
    ctx.beginPath()
    ctx.arc(x, y, 0.9, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------------ */
/* Jellyfish: contraction drives thrust; verlet tentacles trail behind      */
/* ------------------------------------------------------------------------ */

const TENTACLES = 6
const TENTACLE_POINTS = 10
type Node = { x: number; y: number; px: number; py: number }
type Jelly = {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  ph: number
  freq: number
  c: number
  tilt: number
  tentacles: Node[][]
}

export function createJellies({
  n = 1,
  size = [12, 40],
}: Partial<{ n: number; size: Range }> = {}): SeaSystem {
  let width = 0
  let height = 0
  let jellies: Jelly[] = []

  function make(): Jelly {
    const r = rand(size[0], size[1])
    const x = rand(0.1, 0.9) * width
    const y = rand(0.25, 0.9) * height
    const tentacles = Array.from({ length: TENTACLES }, () =>
      Array.from({ length: TENTACLE_POINTS }, (_, k) => ({
        px: x,
        py: y + k * r * 0.22,
        x,
        y: y + k * r * 0.22,
      }))
    )
    return {
      c: 0,
      freq: rand(0.5, 0.8),
      ph: rand(0, TAU),
      r,
      tentacles,
      tilt: 0,
      vx: rand(-4, 4),
      vy: 0,
      x,
      y,
    }
  }

  return {
    draw(ctx) {
      ctx.save()
      ctx.globalCompositeOperation = "lighter"
      for (const j of jellies) drawJelly(ctx, j)
      ctx.restore()
    },
    resize(w, h) {
      const first = width === 0
      width = w
      height = h
      if (first) jellies = Array.from({ length: n }, make)
    },
    step(dt, time) {
      for (const j of jellies) {
        j.ph += dt * j.freq * TAU
        j.c = Math.max(0, Math.sin(j.ph)) ** 2
        j.vy = (j.vy - j.c * 70 * dt + 9 * dt) * (1 - dt * 1.2) // thrust vs. sinking
        j.vx = (j.vx + Math.sin(time * 0.2 + j.r) * 2 * dt) * (1 - dt * 0.3)
        j.x += j.vx * dt
        j.y += j.vy * dt
        j.tilt = lerp(j.tilt, clamp(j.vx * 0.03, -0.35, 0.35), dt * 2)
        if (j.y < -j.r * 4) {
          const dy = height + j.r * 6
          j.y += dy
          for (const t of j.tentacles)
            for (const p of t) {
              p.y += dy
              p.py = p.y
            }
        }
        if (j.x < -60) j.x = width + 60
        else if (j.x > width + 60) j.x = -60
        const rx = j.r * (1 - 0.2 * j.c)
        const segment = j.r * 0.26
        j.tentacles.forEach((t, i) => {
          const a = (i / (TENTACLES - 1) - 0.5) * 1.6
          const root = item(t, 0)
          root.x = j.x + Math.sin(a) * rx * 0.85
          root.y = j.y + j.r * 0.1
          for (let k = 1; k < TENTACLE_POINTS; k++) {
            const p = item(t, k)
            const vx = (p.x - p.px) * 0.96
            const vy = (p.y - p.py) * 0.96
            p.px = p.x
            p.py = p.y
            p.x += vx + Math.sin(time * 1.3 + k * 0.6 + i) * 0.05
            p.y += vy + 18 * dt * dt * 60
          }
          for (let pass = 0; pass < 2; pass++) {
            for (let k = 1; k < TENTACLE_POINTS; k++) {
              const p = item(t, k - 1)
              const q = item(t, k)
              const dx = q.x - p.x
              const dy = q.y - p.y
              const d = Math.hypot(dx, dy) || 1
              const diff = (d - segment) / d
              if (k > 1) {
                p.x += dx * diff * 0.5
                p.y += dy * diff * 0.5
                q.x -= dx * diff * 0.5
                q.y -= dy * diff * 0.5
              } else {
                q.x -= dx * diff
                q.y -= dy * diff
              }
            }
          }
        })
      }
    },
  }
}

function drawJelly(ctx: CanvasRenderingContext2D, j: Jelly): void {
  const rx = j.r * (1 - 0.2 * j.c)
  const ry = j.r * (0.78 + 0.14 * j.c)
  ctx.lineWidth = 1
  ctx.strokeStyle = "rgba(57,230,207,0.28)"
  for (const t of j.tentacles) {
    ctx.beginPath()
    ctx.moveTo(item(t, 0).x, item(t, 0).y)
    for (let k = 1; k < t.length - 1; k++) {
      const p = item(t, k)
      const q = item(t, k + 1)
      ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2)
    }
    ctx.stroke()
  }
  ctx.save()
  ctx.translate(j.x, j.y)
  ctx.rotate(j.tilt)
  const halo = ctx.createRadialGradient(
    0,
    -ry * 0.3,
    0,
    0,
    -ry * 0.3,
    j.r * 2.4
  )
  halo.addColorStop(0, "rgba(57,230,207,0.16)")
  halo.addColorStop(1, "rgba(57,230,207,0)")
  ctx.fillStyle = halo
  ctx.beginPath()
  ctx.arc(0, -ry * 0.3, j.r * 2.4, 0, TAU)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(0, 0, rx, ry, 0, Math.PI, TAU)
  for (let k = 0; k <= 8; k++) {
    const x = rx - (k / 8) * rx * 2
    ctx.quadraticCurveTo(x + rx / 8, ry * 0.18, x, 0) // scalloped margin
  }
  const bell = ctx.createRadialGradient(0, -ry * 0.5, 0, 0, -ry * 0.2, rx)
  bell.addColorStop(0, "rgba(170,255,244,0.28)")
  bell.addColorStop(1, "rgba(57,230,207,0.06)")
  ctx.fillStyle = bell
  ctx.fill()
  ctx.strokeStyle = "rgba(57,230,207,0.7)"
  ctx.stroke()
  ctx.strokeStyle = "rgba(200,255,250,0.35)"
  for (let k = 0; k < 4; k++) {
    ctx.beginPath()
    ctx.ellipse(
      (k - 1.5) * rx * 0.32,
      -ry * 0.35,
      rx * 0.12,
      ry * 0.16,
      0,
      0,
      TAU
    )
    ctx.stroke()
  }
  ctx.restore()
}

/* ------------------------------------------------------------------------ */
/* Marine snow: drifting specks, the cheapest "this is underwater" cue      */
/* ------------------------------------------------------------------------ */

type Speck = { x: number; y: number; r: number; v: number; ph: number }

export function createSnow(
  count: number,
  { size = 1.4, alpha = 0.3 }: Partial<{ size: number; alpha: number }> = {}
): SeaSystem {
  let width = 0
  let height = 0
  let specks: Speck[] = []
  return {
    draw(ctx) {
      ctx.fillStyle = `rgba(200,240,235,${alpha})`
      for (const q of specks) {
        ctx.beginPath()
        ctx.arc(q.x, q.y, q.r, 0, TAU)
        ctx.fill()
      }
    },
    resize(w, h) {
      width = w
      height = h
      specks = Array.from({ length: count }, () => ({
        ph: rand(0, TAU),
        r: rand(0.4, size),
        v: rand(4, 14),
        x: rand(0, w),
        y: rand(0, h),
      }))
    },
    step(dt, time) {
      for (const q of specks) {
        q.y += q.v * dt
        q.x += Math.sin(time * 0.4 + q.ph) * 4 * dt
        if (q.y > height + 4) {
          q.y = -4
          q.x = rand(0, width)
        }
      }
    },
  }
}
