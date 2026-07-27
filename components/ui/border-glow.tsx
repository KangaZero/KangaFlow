"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// Adapted from React Bits "Border Glow" (ts-tailwind variant). Rewritten for
// this codebase: `React.FC` dropped for a plain function component, every
// index access guarded for noUncheckedIndexedAccess, `Math.pow` → `**`, the
// intro sweep gated on prefers-reduced-motion, and `buildBoxShadow` refactored
// to CSS relative-color syntax so `glowColor` accepts any CSS colour (incl.
// theme tokens like `var(--rarity-mythic)`) instead of a parsed HSL triplet.
// https://reactbits.dev/components/border-glow

import { useReducedMotion } from "motion/react"
import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { cn } from "@/lib/utils"

interface BorderGlowProps {
  children?: ReactNode
  className?: string
  edgeSensitivity?: number
  // Any CSS colour string — fed to `hsl(from … )`, so tokens/oklch work.
  glowColor?: string
  backgroundColor?: string
  borderRadius?: number
  glowRadius?: number
  glowIntensity?: number
  coneSpread?: number
  animated?: boolean
  colors?: string[]
  fillOpacity?: number
}

// 13 stacked shadow layers (inset + outset) at decreasing alpha build the soft
// bloom. Relative-color syntax varies only the alpha, so any CSS colour works.
function buildBoxShadow(glowColor: string, intensity: number): string {
  const layers: [number, number, number, number, number, boolean][] = [
    [0, 0, 0, 1, 100, true],
    [0, 0, 1, 0, 60, true],
    [0, 0, 3, 0, 50, true],
    [0, 0, 6, 0, 40, true],
    [0, 0, 15, 0, 30, true],
    [0, 0, 25, 2, 20, true],
    [0, 0, 50, 2, 10, true],
    [0, 0, 1, 0, 60, false],
    [0, 0, 3, 0, 50, false],
    [0, 0, 6, 0, 40, false],
    [0, 0, 15, 0, 30, false],
    [0, 0, 25, 2, 20, false],
    [0, 0, 50, 2, 10, false],
  ]
  return layers
    .map(([x, y, blur, spread, alpha, inset]) => {
      const a = Math.min(alpha * intensity, 100)
      return `${inset ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px hsl(from ${glowColor} h s l / ${a}%)`
    })
    .join(", ")
}

function easeOutCubic(x: number): number {
  return 1 - (1 - x) ** 3
}
function easeInCubic(x: number): number {
  return x * x * x
}

interface AnimateOpts {
  start?: number
  end?: number
  duration?: number
  delay?: number
  ease?: (t: number) => number
  onUpdate: (v: number) => void
  onEnd?: () => void
}

function animateValue({
  start = 0,
  end = 100,
  duration = 1000,
  delay = 0,
  ease = easeOutCubic,
  onUpdate,
  onEnd,
}: AnimateOpts): void {
  const t0 = performance.now() + delay
  function tick() {
    const elapsed = performance.now() - t0
    const t = Math.min(elapsed / duration, 1)
    onUpdate(start + (end - start) * ease(t))
    if (t < 1) requestAnimationFrame(tick)
    else onEnd?.()
  }
  setTimeout(() => requestAnimationFrame(tick), delay)
}

const GRADIENT_POSITIONS = [
  "80% 55%",
  "69% 34%",
  "8% 6%",
  "41% 38%",
  "86% 85%",
  "82% 18%",
  "51% 4%",
]
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1]

// Seven radial "blobs" + a base fill make the mesh gradient the border samples.
function buildMeshGradients(colors: string[]): string[] {
  const fallback = colors[0] ?? "#c084fc"
  const gradients: string[] = []
  for (let i = 0; i < 7; i++) {
    const idx = Math.min(COLOR_MAP[i] ?? 0, colors.length - 1)
    const c = colors[idx] ?? fallback
    const pos = GRADIENT_POSITIONS[i] ?? "50% 50%"
    gradients.push(`radial-gradient(at ${pos}, ${c} 0px, transparent 50%)`)
  }
  gradients.push(`linear-gradient(${fallback} 0 100%)`)
  return gradients
}

export function BorderGlow({
  children,
  className = "",
  edgeSensitivity = 30,
  glowColor = "oklch(0.68 0.25 330)",
  backgroundColor = "var(--card)",
  borderRadius = 10,
  glowRadius = 24,
  glowIntensity = 1.0,
  coneSpread = 25,
  animated = false,
  colors = ["#c084fc", "#f472b6", "#38bdf8"],
  fillOpacity = 0.5,
}: BorderGlowProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const reduceMotion = useReducedMotion()
  const [isHovered, setIsHovered] = useState(false)
  const [cursorAngle, setCursorAngle] = useState(45)
  const [edgeProximity, setEdgeProximity] = useState(0)
  const [sweepActive, setSweepActive] = useState(false)

  const getCenter = useCallback((el: HTMLElement): [number, number] => {
    const { width, height } = el.getBoundingClientRect()
    return [width / 2, height / 2]
  }, [])

  const getEdgeProximity = useCallback(
    (el: HTMLElement, x: number, y: number) => {
      const [cx, cy] = getCenter(el)
      const dx = x - cx
      const dy = y - cy
      let kx = Number.POSITIVE_INFINITY
      let ky = Number.POSITIVE_INFINITY
      if (dx !== 0) kx = cx / Math.abs(dx)
      if (dy !== 0) ky = cy / Math.abs(dy)
      return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1)
    },
    [getCenter]
  )

  const getCursorAngle = useCallback(
    (el: HTMLElement, x: number, y: number) => {
      const [cx, cy] = getCenter(el)
      const dx = x - cx
      const dy = y - cy
      if (dx === 0 && dy === 0) return 0
      let degrees = Math.atan2(dy, dx) * (180 / Math.PI) + 90
      if (degrees < 0) degrees += 360
      return degrees
    },
    [getCenter]
  )

  const handlePointerMove = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      const card = cardRef.current
      if (!card) return
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      setEdgeProximity(getEdgeProximity(card, x, y))
      setCursorAngle(getCursorAngle(card, x, y))
    },
    [getEdgeProximity, getCursorAngle]
  )

  // One-shot intro sweep: rotate the highlight around the border and pulse the
  // edge proximity in/out. Purely decorative → skipped under reduced motion.
  useEffect(() => {
    if (!animated || reduceMotion) return
    const angleStart = 110
    const angleEnd = 465
    const span = angleEnd - angleStart
    setSweepActive(true)
    setCursorAngle(angleStart)

    animateValue({ duration: 500, onUpdate: (v) => setEdgeProximity(v / 100) })
    animateValue({
      duration: 1500,
      ease: easeInCubic,
      end: 50,
      onUpdate: (v) => setCursorAngle(span * (v / 100) + angleStart),
    })
    animateValue({
      delay: 1500,
      duration: 2250,
      ease: easeOutCubic,
      end: 100,
      onUpdate: (v) => setCursorAngle(span * (v / 100) + angleStart),
      start: 50,
    })
    animateValue({
      delay: 2500,
      duration: 1500,
      ease: easeInCubic,
      end: 0,
      onEnd: () => setSweepActive(false),
      onUpdate: (v) => setEdgeProximity(v / 100),
      start: 100,
    })
  }, [animated, reduceMotion])

  const colorSensitivity = edgeSensitivity + 20
  const isVisible = isHovered || sweepActive
  const borderOpacity = isVisible
    ? Math.max(
        0,
        (edgeProximity * 100 - colorSensitivity) / (100 - colorSensitivity)
      )
    : 0
  const glowOpacity = isVisible
    ? Math.max(
        0,
        (edgeProximity * 100 - edgeSensitivity) / (100 - edgeSensitivity)
      )
    : 0

  const meshGradients = buildMeshGradients(colors)
  const borderBg = meshGradients.map((g) => `${g} border-box`)
  const fillBg = meshGradients.map((g) => `${g} padding-box`)
  const angleDeg = `${cursorAngle.toFixed(3)}deg`
  const transition = isVisible
    ? "opacity 0.25s ease-out"
    : "opacity 0.75s ease-in-out"
  const fillMask = [
    "linear-gradient(to bottom, black, black)",
    "radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)",
    "radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)",
    "radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)",
    "radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)",
    "radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)",
    `conic-gradient(from ${angleDeg} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
  ].join(", ")

  return (
    <div
      className={cn("relative isolate grid border border-border/40", className)}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      onPointerMove={handlePointerMove}
      ref={cardRef}
      style={{
        background: backgroundColor,
        borderRadius: `${borderRadius}px`,
        boxShadow:
          "rgba(0,0,0,0.1) 0 1px 2px, rgba(0,0,0,0.1) 0 2px 4px, rgba(0,0,0,0.1) 0 4px 8px, rgba(0,0,0,0.1) 0 8px 16px",
        transform: "translate3d(0, 0, 0.01px)",
      }}
    >
      {/* Mesh-gradient border, masked to a cone around the cursor angle. */}
      <div
        className="absolute inset-0 -z-[1] rounded-[inherit]"
        style={{
          background: [
            `linear-gradient(${backgroundColor} 0 100%) padding-box`,
            "linear-gradient(rgb(255 255 255 / 0%) 0% 100%) border-box",
            ...borderBg,
          ].join(", "),
          border: "1px solid transparent",
          maskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
          opacity: borderOpacity,
          transition,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
        }}
      />

      {/* Soft mesh fill bleeding in from the edges. */}
      <div
        className="absolute inset-0 -z-[1] rounded-[inherit]"
        style={
          {
            background: fillBg.join(", "),
            border: "1px solid transparent",
            maskComposite: "subtract, add, add, add, add, add",
            maskImage: fillMask,
            mixBlendMode: "soft-light",
            opacity: borderOpacity * fillOpacity,
            transition,
            WebkitMaskComposite:
              "source-out, source-over, source-over, source-over, source-over, source-over",
            WebkitMaskImage: fillMask,
          } as CSSProperties
        }
      />

      {/* Outer bloom that spills beyond the card near the cursor edge. */}
      <span
        className="pointer-events-none absolute z-[1] rounded-[inherit]"
        style={
          {
            inset: `${-glowRadius}px`,
            maskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
            mixBlendMode: "plus-lighter",
            opacity: glowOpacity,
            transition,
            WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          } as CSSProperties
        }
      >
        <span
          className="absolute rounded-[inherit]"
          style={{
            boxShadow: buildBoxShadow(glowColor, glowIntensity),
            inset: `${glowRadius}px`,
          }}
        />
      </span>

      <div className="relative z-[1] flex flex-col overflow-hidden">
        {children}
      </div>
    </div>
  )
}
