// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Deep-sea cast. Each factory returns a SeaSystem (resize/step/draw). Colours
// are literals on purpose: like BIO in lib/bubbles, the palette IS the deep-sea
// identity and canvas cannot read CSS custom properties per frame cheaply.

import {
  along,
  type Band,
  bodyPath,
  cruise,
  followSpine,
  glowDot,
  isOffscreen,
  item,
  makeSwimmer,
  type Pt,
  polygon,
  type Range,
  rand,
  type SeaSystem,
  type Swimmer,
  spineGeometry,
  TAU,
} from "@/lib/deep-sea/core"

type SwimmerOptions = {
  n: number
  size: Range
  band: Band
  speed: number
}

const travel = (c: Swimmer): number => (c.vx >= 0 ? 1 : -1)

/* ------------------------------------------------------------------------ */
/* Shark: stiff body, only the tail sweeps; countershaded, no glow          */
/* ------------------------------------------------------------------------ */

const SHARK_SEGMENTS = 14
const sharkWidth =
  (s: number) =>
  (u: number): number =>
    s *
    0.105 *
    (u < 0.2
      ? Math.sin((u / 0.2) * (Math.PI / 2)) ** 0.65
      : 1 - ((u - 0.2) / 0.8) * 0.86)

export function createSharks({
  n = 1,
  size = [60, 200],
  band = [0.3, 0.75],
  speed = 20,
  pass = false,
}: Partial<SwimmerOptions & { pass: boolean }> = {}): SeaSystem {
  let width = 0
  let height = 0
  let sharks: Swimmer[] = []
  let wait = rand(6, 12)
  const spawn = () =>
    makeSwimmer(
      width,
      height,
      rand(size[0], size[1]),
      band,
      SHARK_SEGMENTS,
      speed,
      pass
    )

  return {
    draw(ctx) {
      for (const c of sharks) if (!isOffscreen(c, width)) drawShark(ctx, c)
    },
    resize(w, h) {
      const first = width === 0
      width = w
      height = h
      if (first && !pass) sharks = Array.from({ length: n }, spawn)
    },
    step(dt, time) {
      // `pass` mode: one close, blurred foreground shark crosses now and then.
      if (pass && sharks.length === 0) {
        wait -= dt
        if (wait <= 0) sharks = [spawn()]
      }
      for (const c of sharks) {
        const sp = cruise(c, dt, time, width, height, {
          agility: 0.35,
          band,
          margin: pass ? Number.POSITIVE_INFINITY : c.s * 1.3 + 40,
          reverse: pass ? 0 : 0.006,
          speed,
          vyScale: 0.4,
        })
        c.beat += dt * (1.1 + sp * 0.012)
        followSpine(
          c,
          c.s / (SHARK_SEGMENTS - 1),
          (u) => (u < 0.66 ? 0 : (u - 0.66) * 0.1),
          0.25
        )
      }
      if (pass) {
        sharks = sharks.filter(
          (c) =>
            !(
              (c.dir > 0 && c.x > width + c.s * 1.2) ||
              (c.dir < 0 && c.x < -c.s * 1.2)
            )
        )
        if (sharks.length === 0 && wait <= 0) wait = rand(16, 30)
      }
    },
  }
}

function drawShark(ctx: CanvasRenderingContext2D, c: Swimmer): void {
  const wf = sharkWidth(c.s)
  const g = spineGeometry(c.spine, wf, travel(c))
  const s = c.s
  const P = g.n - 1
  const k = (u: number) => Math.round(u * P)
  ctx.lineWidth = 1
  ctx.fillStyle = "#0c181d"
  ctx.strokeStyle = "rgba(140,210,220,0.22)"
  // Tail sweeps side to side (toward/away from the viewer): from the side that
  // reads as foreshortening, so its length along the body shrinks and grows.
  const fs = 0.35 + 0.65 * Math.abs(Math.cos(c.beat))
  polygon(ctx, [
    item(g.top, P - 1),
    along(g, P, -s * 0.14 * fs, s * 0.19),
    along(g, P, -s * 0.035 * fs, 0),
    along(g, P, -s * 0.075 * fs, -s * 0.1),
    item(g.bot, P - 1),
  ])
  ctx.fill()
  ctx.stroke()
  const ip = k(0.24)
  polygon(ctx, [
    along(g, ip, s * 0.02, -wf(0.24) * 0.4),
    along(g, ip + 1, 0, -wf(0.3) * 0.6),
    along(g, ip + 2, -s * 0.03, -s * 0.14),
  ])
  ctx.fill()
  // Countershading: dark back, paler belly.
  const m = k(0.3)
  const [ax, ay] = item(g.top, m)
  const [bx, by] = item(g.bot, m)
  const shade = ctx.createLinearGradient(ax, ay, bx, by)
  shade.addColorStop(0, "#0b161b")
  shade.addColorStop(0.6, "#16272d")
  shade.addColorStop(1, "#2a4148")
  bodyPath(ctx, g, s * 0.06)
  ctx.fillStyle = shade
  ctx.fill()
  // Rim light from above only.
  const head = item(g.S, 0)
  const [tx, ty] = item(g.T, 0)
  ctx.beginPath()
  ctx.moveTo(head.x + tx * s * 0.06, head.y + ty * s * 0.06)
  for (const [x, y] of g.top) ctx.lineTo(x, y)
  ctx.stroke()
  ctx.fillStyle = "#0c181d"
  const id = k(0.36)
  polygon(ctx, [
    item(g.top, id - 1),
    along(g, id, -s * 0.06, wf(0.36) + s * 0.14),
    item(g.top, id + 2),
  ])
  ctx.fill()
  ctx.stroke()
  const i2 = k(0.74)
  polygon(ctx, [
    item(g.top, i2),
    along(g, i2, -s * 0.03, wf(0.74) + s * 0.035),
    item(g.top, i2 + 1),
  ])
  ctx.fill()
  polygon(ctx, [
    along(g, ip, s * 0.03, -wf(0.24) * 0.5),
    along(g, ip + 1, 0, -wf(0.3) * 0.7),
    along(g, ip + 2, -s * 0.05, -s * 0.17),
  ])
  ctx.fill()
  ctx.stroke()
  ctx.strokeStyle = "rgba(0,0,0,0.5)"
  for (let j = 0; j < 4; j++) {
    const [gx, gy] = along(g, 2, -j * s * 0.016, wf(0.15) * 0.55)
    const [hx, hy] = along(g, 2, -j * s * 0.016 - s * 0.006, -wf(0.15) * 0.3)
    ctx.beginPath()
    ctx.moveTo(gx, gy)
    ctx.lineTo(hx, hy)
    ctx.stroke()
  }
  const [ex, ey] = along(g, 1, s * 0.005, wf(0.07) * 0.35)
  ctx.fillStyle = "#000"
  ctx.beginPath()
  ctx.arc(ex, ey, Math.max(1.2, s * 0.011), 0, TAU)
  ctx.fill()
}

/* ------------------------------------------------------------------------ */
/* Anglerfish: rigid, hovers, jaw opens slowly, springy glowing lure        */
/* ------------------------------------------------------------------------ */

const ANGLER_SEGMENTS = 6
type Angler = Swimmer & {
  bulb: { x: number; y: number; vx: number; vy: number }
}
const anglerWidth =
  (s: number) =>
  (u: number): number =>
    s *
    0.3 *
    Math.sin(Math.PI * Math.min(1, u * 0.85 + 0.15)) ** 0.7 *
    (1 - u * 0.45)

export function createAnglers({
  n = 1,
  size = [38, 110],
  band = [0.65, 0.9],
  speed = 11,
}: Partial<SwimmerOptions> = {}): SeaSystem {
  let width = 0
  let height = 0
  let anglers: Angler[] = []
  const geometry = (c: Angler) =>
    spineGeometry(c.spine, anglerWidth(c.s), travel(c))

  return {
    draw(ctx, time) {
      for (const c of anglers) {
        if (isOffscreen(c, width)) continue
        drawAngler(ctx, c, geometry(c))
        const flash = Math.max(0, Math.sin(time * 0.7 + c.ph)) ** 30
        const a = 0.55 + 0.25 * Math.sin(time * 2.3 + c.ph) + flash * 0.5
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        const halo = ctx.createRadialGradient(
          c.bulb.x,
          c.bulb.y,
          0,
          c.bulb.x,
          c.bulb.y,
          c.s * 1.1
        )
        halo.addColorStop(0, `rgba(150,255,235,${0.22 * a})`)
        halo.addColorStop(1, "rgba(150,255,235,0)")
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(c.bulb.x, c.bulb.y, c.s * 1.1, 0, TAU)
        ctx.fill()
        glowDot(ctx, c.bulb.x, c.bulb.y, 2.6, "220,255,248", Math.min(1, a))
        ctx.restore()
      }
    },
    resize(w, h) {
      const first = width === 0
      width = w
      height = h
      if (first) {
        anglers = Array.from({ length: n }, () => {
          const c = makeSwimmer(
            width,
            height,
            rand(size[0], size[1]),
            band,
            ANGLER_SEGMENTS,
            speed
          )
          return { ...c, bulb: { vx: 0, vy: 0, x: c.x, y: c.y - 30 } }
        })
      }
    },
    step(dt, time) {
      for (const c of anglers) {
        cruise(c, dt, time, width, height, {
          agility: 0.4,
          band,
          reverse: 0.02,
          speed,
          vyScale: 0.15,
        })
        c.beat += dt * 3.2
        c.y += Math.sin(time * 0.9 + c.ph) * 5 * dt
        followSpine(c, c.s / (ANGLER_SEGMENTS - 1), () => 0)
        c.gape = 0.5 + 0.5 * Math.sin(time * 0.35 + c.ph)
        // The lure hangs on a springy rod, so it lags behind the head.
        const [tx, ty] = along(geometry(c), 0, c.s * 0.5, c.s * 0.4)
        c.bulb.vx = (c.bulb.vx + (tx - c.bulb.x) * 18 * dt) * (1 - dt * 3)
        c.bulb.vy = (c.bulb.vy + (ty - c.bulb.y) * 18 * dt) * (1 - dt * 3)
        c.bulb.x += c.bulb.vx * dt
        c.bulb.y += c.bulb.vy * dt
      }
    },
  }
}

function drawAngler(
  ctx: CanvasRenderingContext2D,
  c: Angler,
  g: ReturnType<typeof spineGeometry>
): void {
  const s = c.s
  const P = g.n - 1
  const wf = anglerWidth(s)
  ctx.lineWidth = 1
  ctx.fillStyle = "rgba(20,15,17,0.97)"
  ctx.strokeStyle = "rgba(57,230,207,0.16)"
  const fs = 0.3 + 0.7 * Math.abs(Math.cos(c.beat))
  polygon(ctx, [
    item(g.top, P - 1),
    along(g, P, -s * 0.2 * fs, s * 0.14),
    along(g, P, -s * 0.16 * fs, 0),
    along(g, P, -s * 0.2 * fs, -s * 0.14),
    item(g.bot, P - 1),
  ])
  ctx.fill()
  ctx.stroke()
  bodyPath(ctx, g, s * 0.1)
  ctx.fill()
  ctx.stroke()
  const A = along(g, 0, s * 0.13, s * 0.07)
  const B = along(g, 1, -s * 0.02, -s * 0.02)
  const C = along(g, 0, s * 0.2, -s * 0.11 - c.gape * s * 0.07)
  polygon(ctx, [A, B, C])
  ctx.fillStyle = "#020101"
  ctx.fill()
  ctx.strokeStyle = "rgba(230,238,236,0.85)"
  for (let j = 1; j < 7; j++) {
    const u = j / 7
    const ux = A[0] + (B[0] - A[0]) * u
    const uy = A[1] + (B[1] - A[1]) * u
    const lx = C[0] + (B[0] - C[0]) * u
    const ly = C[1] + (B[1] - C[1]) * u
    const len = s * 0.055 * (1 - u * 0.5)
    const d = Math.hypot(lx - ux, ly - uy) || 1
    const dx = (lx - ux) / d
    const dy = (ly - uy) / d
    ctx.beginPath()
    ctx.moveTo(ux, uy)
    ctx.lineTo(ux + dx * len, uy + dy * len)
    ctx.moveTo(lx, ly)
    ctx.lineTo(lx - dx * len * 1.2, ly - dy * len * 1.2)
    ctx.stroke()
  }
  const [bx, by] = along(g, 1, s * 0.02, wf(0.2) * 0.9)
  const [cx, cy] = along(g, 0, s * 0.05, s * 0.55)
  ctx.strokeStyle = "rgba(120,140,140,0.6)"
  ctx.beginPath()
  ctx.moveTo(bx, by)
  ctx.quadraticCurveTo(cx, cy, c.bulb.x, c.bulb.y)
  ctx.stroke()
  const [ex, ey] = along(g, 1, s * 0.06, wf(0.2) * 0.45)
  ctx.fillStyle = "rgba(200,210,200,0.45)"
  ctx.beginPath()
  ctx.arc(ex, ey, 1.6, 0, TAU)
  ctx.fill()
}

/* ------------------------------------------------------------------------ */
/* Gulper eel: whole-body wave, balloon jaw, red tail light                 */
/* ------------------------------------------------------------------------ */

const GULPER_SEGMENTS = 26
const gulperWidth =
  (s: number) =>
  (u: number): number =>
    (u < 0.06 ? s * 0.03 : s * 0.012 * (1 - u * 0.8)) + 0.6

export function createGulpers({
  n = 1,
  size = [140, 340],
  band = [0.45, 0.85],
  speed = 20,
}: Partial<SwimmerOptions> = {}): SeaSystem {
  let width = 0
  let height = 0
  let eels: Swimmer[] = []
  return {
    draw(ctx, time) {
      for (const c of eels) {
        if (isOffscreen(c, width)) continue
        const g = spineGeometry(c.spine, gulperWidth(c.s), travel(c))
        const s = c.s
        ctx.lineWidth = 1
        ctx.fillStyle = "rgba(9,11,15,0.97)"
        ctx.strokeStyle = "rgba(57,230,207,0.18)"
        bodyPath(ctx, g, 0)
        ctx.fill()
        ctx.stroke()
        const hinge = item(g.S, 3)
        const [fx, fy] = item(g.T, 0)
        const [ux, uy] = item(g.U, 0)
        const cg = Math.cos(c.gape)
        const sg = Math.sin(c.gape)
        const upper: Pt = {
          x: hinge.x + (fx * cg + ux * sg) * s * 0.14,
          y: hinge.y + (fy * cg + uy * sg) * s * 0.14,
        }
        const lower: Pt = {
          x: hinge.x + (fx * cg - ux * sg) * s * 0.16,
          y: hinge.y + (fy * cg - uy * sg) * s * 0.16,
        }
        ctx.beginPath()
        ctx.moveTo(hinge.x, hinge.y)
        ctx.lineTo(upper.x, upper.y)
        ctx.quadraticCurveTo(
          hinge.x + fx * s * 0.05,
          hinge.y + fy * s * 0.05,
          lower.x,
          lower.y
        )
        ctx.closePath()
        ctx.fillStyle = "rgba(28,8,16,0.75)"
        ctx.fill()
        ctx.strokeStyle = "rgba(57,230,207,0.32)"
        ctx.beginPath()
        ctx.moveTo(upper.x, upper.y)
        ctx.lineTo(hinge.x, hinge.y)
        ctx.lineTo(lower.x, lower.y)
        ctx.stroke()
        const tail = item(c.spine, c.spine.length - 1)
        const f = Math.max(0, Math.sin(time * 1.6 + c.ph)) ** 8
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        glowDot(ctx, tail.x, tail.y, 2 + f * 2, "255,80,130", 0.25 + f * 0.7)
        ctx.restore()
      }
    },
    resize(w, h) {
      const first = width === 0
      width = w
      height = h
      if (first)
        eels = Array.from({ length: n }, () =>
          makeSwimmer(
            width,
            height,
            rand(size[0], size[1]),
            band,
            GULPER_SEGMENTS,
            speed
          )
        )
    },
    step(dt, time) {
      for (const c of eels) {
        cruise(c, dt, time, width, height, {
          agility: 0.3,
          band,
          margin: c.s + 60,
          reverse: 0.008,
          speed,
        })
        c.beat += dt * 2.4
        followSpine(
          c,
          c.s / (GULPER_SEGMENTS - 1),
          (u) => 0.035 + u * 0.03,
          0.3
        )
        c.gape = 0.25 + 0.3 * (0.5 + 0.5 * Math.sin(time * 0.45 + c.ph))
      }
    },
  }
}

/* ------------------------------------------------------------------------ */
/* Viperfish: darts, oversized fangs, blue belly photophores                */
/* ------------------------------------------------------------------------ */

const VIPER_SEGMENTS = 11
const viperWidth =
  (s: number) =>
  (u: number): number =>
    s *
    0.085 *
    Math.sin(Math.PI * Math.min(1, u * 1.08 + 0.07)) ** 0.7 *
    (1 - u * 0.35)

export function createVipers({
  n = 1,
  size = [30, 90],
  band = [0.4, 0.9],
  speed = 26,
}: Partial<SwimmerOptions> = {}): SeaSystem {
  let width = 0
  let height = 0
  let vipers: Swimmer[] = []
  return {
    draw(ctx, time) {
      for (const c of vipers) {
        if (isOffscreen(c, width)) continue
        const wf = viperWidth(c.s)
        const g = spineGeometry(c.spine, wf, travel(c))
        const s = c.s
        const P = g.n - 1
        ctx.lineWidth = 1
        ctx.fillStyle = "rgba(8,14,20,0.96)"
        ctx.strokeStyle = "rgba(57,230,207,0.28)"
        polygon(ctx, [
          item(g.top, P - 1),
          along(g, P, -s * 0.13, s * 0.09),
          along(g, P, -s * 0.06, 0),
          along(g, P, -s * 0.13, -s * 0.09),
          item(g.bot, P - 1),
        ])
        ctx.fill()
        ctx.stroke()
        bodyPath(ctx, g, s * 0.08)
        ctx.fill()
        ctx.stroke()
        const curve = (
          from: readonly [number, number],
          via: readonly [number, number],
          to: readonly [number, number]
        ) => {
          ctx.beginPath()
          ctx.moveTo(from[0], from[1])
          ctx.quadraticCurveTo(via[0], via[1], to[0], to[1])
          ctx.stroke()
        }
        const jaw = along(g, 0, s * 0.1, -s * 0.045)
        ctx.strokeStyle = "rgba(235,240,240,0.9)"
        ctx.lineWidth = 1.2
        curve(
          jaw,
          along(g, 0, s * 0.17, -s * 0.01),
          along(g, 0, s * 0.12, s * 0.08)
        )
        curve(
          along(g, 0, s * 0.05, -s * 0.035),
          along(g, 0, s * 0.09, 0),
          along(g, 0, s * 0.07, s * 0.065)
        )
        ctx.lineWidth = 1
        ctx.strokeStyle = "rgba(120,150,160,0.5)"
        const lure = along(g, 0, s * 0.28, s * 0.24)
        curve(item(g.top, 3), along(g, 3, s * 0.15, s * 0.35), lure)
        ctx.save()
        ctx.globalCompositeOperation = "lighter"
        for (let i = 1; i < P; i++) {
          const [px, py] = along(g, i, 0, -wf(i / P) * 0.7)
          glowDot(
            ctx,
            px,
            py,
            0.9,
            "120,200,255",
            0.55 + 0.35 * Math.sin(time * 2 + i)
          )
        }
        glowDot(
          ctx,
          lure[0],
          lure[1],
          1.6,
          "170,255,240",
          0.6 + 0.4 * Math.sin(time * 3 + c.ph)
        )
        ctx.restore()
      }
    },
    resize(w, h) {
      const first = width === 0
      width = w
      height = h
      if (first)
        vipers = Array.from({ length: n }, () =>
          makeSwimmer(
            width,
            height,
            rand(size[0], size[1]),
            band,
            VIPER_SEGMENTS,
            speed
          )
        )
    },
    step(dt, time) {
      for (const c of vipers) {
        const sp = cruise(c, dt, time, width, height, {
          agility: 1.1,
          band,
          burst: 2.8,
          burstFrequency: 0.45,
          reverse: 0.025,
          speed,
        })
        c.beat += dt * (4 + sp * 0.07)
        followSpine(
          c,
          c.s / (VIPER_SEGMENTS - 1),
          (u) => 0.02 + u * u * 0.3,
          0.7
        )
      }
    },
  }
}

/* ------------------------------------------------------------------------ */
/* Vampire squid: contract → jet mantle-first; relax → webbed arms flare    */
/* ------------------------------------------------------------------------ */

const ARMS = 8
const ARM_POINTS = 9
type ArmPoint = { x: number; y: number; px: number; py: number }
type Squid = {
  r: number
  x: number
  y: number
  a: number
  vx: number
  vy: number
  ph: number
  c: number
  arms: ArmPoint[][]
}

export function createVampireSquids({
  n = 1,
  size = [12, 34],
  band = [0.35, 0.85],
}: Partial<Omit<SwimmerOptions, "speed">> = {}): SeaSystem {
  let width = 0
  let height = 0
  let squids: Squid[] = []

  function make(): Squid {
    const r = rand(size[0], size[1])
    const x = rand(0.1, 0.9) * width
    const y = rand(band[0], band[1]) * height
    const a = -Math.PI / 2 + rand(-0.8, 0.8)
    const arms = Array.from({ length: ARMS }, () =>
      Array.from({ length: ARM_POINTS }, (_, k) => {
        const px = x - Math.cos(a) * k * r * 0.3
        const py = y - Math.sin(a) * k * r * 0.3
        return { px, py, x: px, y: py }
      })
    )
    return { a, arms, c: 0, ph: rand(0, TAU), r, vx: 0, vy: 0, x, y }
  }

  return {
    draw(ctx, time) {
      for (const o of squids) drawSquid(ctx, o, time)
    },
    resize(w, h) {
      const first = width === 0
      width = w
      height = h
      if (first) squids = Array.from({ length: n }, make)
    },
    step(dt, time) {
      for (const o of squids) stepSquid(o, dt, time, width, height, band)
    },
  }
}

function stepSquid(
  o: Squid,
  dt: number,
  time: number,
  width: number,
  height: number,
  band: Band
): void {
  o.ph += dt * 0.5 * TAU
  o.c = Math.max(0, Math.sin(o.ph)) ** 2
  o.a += rand(-1, 1) * dt * 0.7
  const steerTo = (target: number) => {
    o.a += Math.atan2(Math.sin(target - o.a), Math.cos(target - o.a)) * dt * 0.8
  }
  if (o.y < band[0] * height) steerTo(Math.PI / 2)
  else if (o.y > band[1] * height) steerTo(-Math.PI / 2)
  const dx = Math.cos(o.a)
  const dy = Math.sin(o.a)
  o.vx = (o.vx + dx * o.c * 85 * dt) * (1 - dt * 1.1)
  o.vy = (o.vy + dy * o.c * 85 * dt) * (1 - dt * 1.1) + 3 * dt
  o.x += o.vx * dt
  o.y += o.vy * dt
  const margin = o.r * 6
  const shift =
    o.x < -margin
      ? width + 2 * margin
      : o.x > width + margin
        ? -width - 2 * margin
        : 0
  if (shift !== 0) {
    o.x += shift
    for (const arm of o.arms)
      for (const p of arm) {
        p.x += shift
        p.px += shift
      }
  }
  const baseX = o.x - dx * o.r * 0.55
  const baseY = o.y - dy * o.r * 0.55
  const px = -dy
  const py = dx
  const segment = o.r * 0.3
  o.arms.forEach((arm, i) => {
    const u = (i - 3.5) / 3.5
    const spread = u * (0.35 + 1.2 * (1 - o.c)) // web flares open when relaxed
    const ox = -dx * Math.cos(spread) - px * Math.sin(spread)
    const oy = -dy * Math.cos(spread) - py * Math.sin(spread)
    const root = item(arm, 0)
    root.x = baseX + px * u * o.r * 0.45
    root.y = baseY + py * u * o.r * 0.45
    root.px = root.x
    root.py = root.y
    for (let k = 1; k < ARM_POINTS; k++) {
      const p = item(arm, k)
      const vx = (p.x - p.px) * 0.93
      const vy = (p.y - p.py) * 0.93
      p.px = p.x
      p.py = p.y
      const f = (1 - k / ARM_POINTS) * 26 * dt
      p.x += vx + ox * f + Math.sin(time * 1.5 + k * 0.7 + i) * 0.04
      p.y += vy + oy * f + 0.02
    }
    for (let pass = 0; pass < 3; pass++) {
      for (let k = 1; k < ARM_POINTS; k++) {
        const a = item(arm, k - 1)
        const b = item(arm, k)
        const ex = b.x - a.x
        const ey = b.y - a.y
        const d = Math.hypot(ex, ey) || 1
        const diff = (d - segment) / d
        if (k > 1) {
          a.x += ex * diff * 0.5
          a.y += ey * diff * 0.5
          b.x -= ex * diff * 0.5
          b.y -= ey * diff * 0.5
        } else {
          b.x -= ex * diff
          b.y -= ey * diff
        }
      }
    }
  })
}

function drawSquid(
  ctx: CanvasRenderingContext2D,
  o: Squid,
  time: number
): void {
  ctx.fillStyle = "rgba(70,8,22,0.5)"
  for (let i = 0; i < ARMS - 1; i++) {
    const A = item(o.arms, i)
    const B = item(o.arms, i + 1)
    ctx.beginPath()
    ctx.moveTo(item(A, 0).x, item(A, 0).y)
    for (let k = 1; k <= 5; k++) ctx.lineTo(item(A, k).x, item(A, k).y)
    for (let k = 5; k >= 0; k--) ctx.lineTo(item(B, k).x, item(B, k).y)
    ctx.fill()
  }
  ctx.strokeStyle = "rgba(85,12,30,0.95)"
  ctx.lineCap = "round"
  for (const arm of o.arms) {
    for (let k = 1; k < ARM_POINTS; k++) {
      ctx.lineWidth = o.r * 0.16 * (1 - k / ARM_POINTS) + 0.6
      ctx.beginPath()
      ctx.moveTo(item(arm, k - 1).x, item(arm, k - 1).y)
      ctx.lineTo(item(arm, k).x, item(arm, k).y)
      ctx.stroke()
    }
  }
  ctx.lineCap = "butt"
  ctx.lineWidth = 1
  ctx.save()
  ctx.translate(o.x, o.y)
  ctx.rotate(o.a)
  const flap = Math.sin(time * 3 + o.ph) * 0.5
  ctx.fillStyle = "rgba(80,10,26,0.95)"
  for (const side of [-1, 1]) {
    ctx.save()
    ctx.translate(o.r * 0.55, side * o.r * 0.5)
    ctx.rotate(side * (0.6 + flap))
    ctx.beginPath()
    ctx.ellipse(0, side * o.r * 0.2, o.r * 0.18, o.r * 0.32, 0, 0, TAU)
    ctx.fill()
    ctx.restore()
  }
  const mantle = ctx.createRadialGradient(o.r * 0.3, 0, 0, 0, 0, o.r * 1.1)
  mantle.addColorStop(0, "rgba(110,18,40,1)")
  mantle.addColorStop(1, "rgba(40,4,14,1)")
  ctx.fillStyle = mantle
  ctx.strokeStyle = "rgba(255,110,130,0.22)"
  ctx.beginPath()
  ctx.ellipse(o.r * 0.15, 0, o.r * 1.05, o.r * (0.72 - 0.14 * o.c), 0, 0, TAU)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
  // Glowing eyes + arm-tip photophores.
  const dx = Math.cos(o.a)
  const dy = Math.sin(o.a)
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  for (const side of [-1, 1]) {
    glowDot(
      ctx,
      o.x - dx * o.r * 0.2 - dy * side * o.r * 0.5,
      o.y - dy * o.r * 0.2 + dx * side * o.r * 0.5,
      1.8,
      "140,210,255",
      0.9
    )
  }
  o.arms.forEach((arm, i) => {
    const tip = item(arm, ARM_POINTS - 1)
    glowDot(
      ctx,
      tip.x,
      tip.y,
      1.2,
      "120,200,255",
      0.35 + 0.35 * Math.sin(time * 2.2 + i)
    )
  })
  ctx.restore()
}

/* ------------------------------------------------------------------------ */
/* Far visitors: manta + giant squid silhouettes, sized off the viewport    */
/* ------------------------------------------------------------------------ */

export type VisitorKind = "manta" | "squid"
/**
 * Body unit as a fraction of stage width. A squid spans ~2.25 units (mantle
 * tip → tentacle clubs), so 0.31 ≈ 70% of the screen. Sizes are skewed small
 * (power curve) so a screen-filling one is a rare event.
 */
export const VISITOR_SIZE = {
  manta: [0.05, 0.16],
  squid: [0.08, 0.31],
} as const satisfies Record<VisitorKind, Range>

export function visitorSize(
  kind: VisitorKind,
  width: number,
  roll: number
): number {
  const [lo, hi] = VISITOR_SIZE[kind]
  return (lo + roll ** 1.6 * (hi - lo)) * width
}

type Visitor = {
  kind: VisitorKind
  x: number
  y: number
  s: number
  ph: number
}

export function createFarVisitors({
  kinds = ["manta", "squid"],
  band = [0.25, 0.6],
  speed = 26,
  waitRange = [14, 26],
  firstAfter = 4,
}: Partial<{
  kinds: readonly VisitorKind[]
  band: Band
  speed: number
  waitRange: Range
  firstAfter: number
}> = {}): SeaSystem {
  let width = 0
  let height = 0
  let visitor: Visitor | null = null
  let wait = firstAfter
  let turn = 0
  return {
    draw(ctx) {
      if (visitor) drawVisitor(ctx, visitor)
    },
    resize(w, h) {
      width = w
      height = h
    },
    step(dt, time) {
      if (!visitor) {
        wait -= dt
        if (wait <= 0) {
          const kind = item(kinds, turn++ % kinds.length)
          const s = visitorSize(kind, width, Math.random())
          visitor = {
            kind,
            ph: 0,
            s,
            x: -s * 0.9,
            y: rand(band[0], band[1]) * height,
          }
        }
        return
      }
      visitor.x += speed * (0.6 + visitor.s / 300) * dt
      visitor.ph += dt * 1.4
      visitor.y += Math.sin(time * 0.4) * 4 * dt
      if (visitor.x > width + visitor.s * 1.7) {
        visitor = null
        wait = rand(waitRange[0], waitRange[1])
      }
    },
  }
}

function drawVisitor(ctx: CanvasRenderingContext2D, m: Visitor): void {
  const { s } = m
  ctx.save()
  ctx.translate(m.x, m.y)
  ctx.lineWidth = 1
  ctx.fillStyle = "rgba(4,30,38,0.9)"
  ctx.strokeStyle = "rgba(57,230,207,0.18)"
  if (m.kind === "manta") {
    const flap = Math.sin(m.ph) * s * 0.22
    ctx.beginPath()
    ctx.moveTo(s * 0.55, 0)
    ctx.quadraticCurveTo(s * 0.2, -s * 0.1, -s * 0.05, -s * 0.75 - flap)
    ctx.quadraticCurveTo(-s * 0.2, -s * 0.2, -s * 0.45, 0)
    ctx.quadraticCurveTo(-s * 0.2, s * 0.2, -s * 0.05, s * 0.75 + flap)
    ctx.quadraticCurveTo(s * 0.2, s * 0.1, s * 0.55, 0)
    ctx.fill()
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(-s * 0.45, 0)
    ctx.lineTo(-s * 1.2, Math.sin(m.ph * 0.7) * 6)
    ctx.stroke()
    ctx.restore()
    return
  }
  // Giant squid, mantle first; arms + two long feeding tentacles trail behind.
  ctx.strokeStyle = "rgba(10,40,48,0.95)"
  ctx.lineCap = "round"
  for (let i = 0; i < 8; i++) {
    const spread = (i - 3.5) * 0.05
    ctx.lineWidth = s * 0.035
    ctx.beginPath()
    ctx.moveTo(-s * 0.1, 0)
    for (let k = 1; k <= 6; k++) {
      ctx.lineTo(
        -s * 0.1 - k * s * 0.09,
        spread * k * s * 0.5 + Math.sin(m.ph * 1.3 - k * 0.7 + i) * k * 1.6
      )
    }
    ctx.stroke()
  }
  for (const side of [-1, 1]) {
    ctx.lineWidth = s * 0.015
    ctx.beginPath()
    ctx.moveTo(-s * 0.1, 0)
    for (let k = 1; k <= 14; k++) {
      ctx.lineTo(
        -s * 0.1 - k * s * 0.1,
        side * k * 1.2 + Math.sin(m.ph - k * 0.5 + side) * k * 1.4
      )
    }
    ctx.stroke()
    ctx.fillStyle = "rgba(10,40,48,0.95)"
    ctx.beginPath()
    ctx.ellipse(
      -s * 1.5,
      side * 17 + Math.sin(m.ph - 7 + side) * 18,
      s * 0.08,
      s * 0.025,
      0,
      0,
      TAU
    )
    ctx.fill()
  }
  ctx.lineCap = "butt"
  ctx.lineWidth = 1
  ctx.fillStyle = "rgba(4,30,38,0.92)"
  ctx.strokeStyle = "rgba(57,230,207,0.15)"
  ctx.beginPath()
  ctx.moveTo(s * 0.75, 0)
  ctx.quadraticCurveTo(s * 0.3, -s * 0.15, -s * 0.12, -s * 0.1)
  ctx.lineTo(-s * 0.12, s * 0.1)
  ctx.quadraticCurveTo(s * 0.3, s * 0.15, s * 0.75, 0)
  ctx.fill()
  ctx.stroke()
  const fin = Math.sin(m.ph * 1.5) * s * 0.03
  ctx.beginPath()
  ctx.moveTo(s * 0.75, 0)
  ctx.lineTo(s * 0.5, -s * 0.17 - fin)
  ctx.lineTo(s * 0.45, 0)
  ctx.lineTo(s * 0.5, s * 0.17 + fin)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}
