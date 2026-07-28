"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useReducedMotion } from "motion/react"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useState } from "react"
import { BIO, Fish, Jellyfish, mulberry32 } from "@/components/sea-creatures"
import { DEFAULT_THEME, isTheme, type Theme } from "@/lib/themes"
import { cn } from "@/lib/utils"

// Route transition: a Next App Router `template.tsx` re-mounts on every
// navigation, so this entrance replays each time. Two leaves start closed over
// the viewport and slide apart to reveal the new page. The leaves TRANSLATE so
// their ornaments ride undistorted, and their skin is THEME-DRESSED:
//   • terminal → Tron neon grid-gate (accent = --primary)
//   • light    → sunlit beachside (sky→sea→sand, a warm sun disc)
//   • dark     → deep-sea abyss with drifting bioluminescent creatures
// Only the entrance animates (App Router unmounts the old page first), and the
// whole thing is gated on prefers-reduced-motion.

// Curtain axis: "x" parts left↔right, "y" parts top↔bottom.
const ORIENTATION: "x" | "y" = "x"

const CURTAIN_TRANSITION = { duration: 0.9, ease: [0.22, 1, 0.36, 1] } as const

const REST = ORIENTATION === "x" ? { x: 0 } : { y: 0 }

// Per leaf: slide target, panel box, the seam edge (where leaves meet), and the
// ornament anchor on that same inner edge.
const DOORS =
  ORIENTATION === "x"
    ? [
        {
          animate: { x: "-100%" },
          knob: "top-1/2 right-2 -translate-y-1/2",
          panel: "inset-y-0 left-0 w-1/2",
          seam: "inset-y-0 right-0 w-[2px]",
        },
        {
          animate: { x: "100%" },
          knob: "top-1/2 left-2 -translate-y-1/2",
          panel: "inset-y-0 right-0 w-1/2",
          seam: "inset-y-0 left-0 w-[2px]",
        },
      ]
    : [
        {
          animate: { y: "-100%" },
          knob: "bottom-2 left-1/2 -translate-x-1/2",
          panel: "inset-x-0 top-0 h-1/2",
          seam: "inset-x-0 bottom-0 h-[2px]",
        },
        {
          animate: { y: "100%" },
          knob: "top-2 left-1/2 -translate-x-1/2",
          panel: "inset-x-0 bottom-0 h-1/2",
          seam: "inset-x-0 top-0 h-[2px]",
        },
      ]

// Stacked, increasing-blur shadows fake neon light-bleed (Tron seam + disc).
const NEON_GLOW =
  "0 0 6px var(--primary), 0 0 16px var(--primary), 0 0 30px color-mix(in oklch, var(--primary) 55%, transparent)"
const GRID_LINE = "color-mix(in oklch, var(--primary) 12%, transparent)"

// Narrow (not React.CSSProperties) so it stays assignable to motion's
// MotionStyle — CSSProperties' `x?` prop clashes with MotionStyle.x.
const PANEL_STYLE: Record<
  Theme,
  { backgroundColor: string; backgroundImage: string }
> = {
  dark: {
    backgroundColor: "#04202c",
    backgroundImage:
      "radial-gradient(120% 60% at 50% -12%, rgba(90,210,225,0.18), rgba(90,210,225,0) 58%), linear-gradient(180deg,#083140 0%,#04202c 42%,#010a10 100%)",
  },
  light: {
    backgroundColor: "#8fd3ef",
    backgroundImage:
      "radial-gradient(90% 55% at 50% 0%, rgba(255,246,214,0.7), rgba(255,246,214,0) 60%), linear-gradient(180deg,#cdeeff 0%,#8fd3ef 38%,#e7d6a8 70%,#f2e6c9 100%)",
  },
  terminal: {
    backgroundColor: "#05060a",
    backgroundImage: `repeating-linear-gradient(0deg, ${GRID_LINE} 0 1px, transparent 1px 42px), repeating-linear-gradient(90deg, ${GRID_LINE} 0 1px, transparent 1px 42px)`,
  },
}

const SEAM_STYLE: Record<Theme, React.CSSProperties> = {
  dark: {
    backgroundColor: BIO,
    boxShadow: `0 0 8px ${BIO}, 0 0 20px rgba(57,230,207,0.6)`,
  },
  light: {
    backgroundColor: "#fff0c2",
    boxShadow: "0 0 10px rgba(255,214,120,0.9), 0 0 22px rgba(255,185,90,0.55)",
  },
  terminal: { backgroundColor: "var(--primary)", boxShadow: NEON_GLOW },
}

// The inner-edge ornament, styled per theme.
function DoorNode({ theme, className }: { theme: Theme; className?: string }) {
  if (theme === "light") {
    return (
      <span
        className={cn(
          "absolute size-[clamp(44px,9vw,80px)] rounded-full",
          className
        )}
        style={{
          background:
            "radial-gradient(circle at 50% 45%, #fff7d6, #ffd873 45%, #ffb03a 78%, rgba(255,176,58,0) 84%)",
          boxShadow:
            "0 0 24px rgba(255,196,90,0.85), 0 0 60px rgba(255,170,60,0.5)",
        }}
      />
    )
  }
  if (theme === "dark") {
    return (
      <span
        className={cn(
          "absolute size-[clamp(30px,6vw,52px)] rounded-full",
          className
        )}
        style={{
          background: `radial-gradient(circle at 50% 45%, #d6fff6, ${BIO} 40%, #0c8f86 75%, rgba(12,143,134,0) 82%)`,
          boxShadow: `0 0 16px ${BIO}, 0 0 42px rgba(57,230,207,0.6)`,
        }}
      />
    )
  }
  // terminal: Tron identity disc — glowing ring + bright core.
  return (
    <span
      className={cn(
        "absolute flex size-[clamp(40px,8vw,72px)] items-center justify-center rounded-full",
        className
      )}
      style={{ boxShadow: NEON_GLOW }}
    >
      <span
        className="size-full rounded-full border-2"
        style={{
          borderColor: "var(--primary)",
          boxShadow:
            "inset 0 0 12px color-mix(in oklch, var(--primary) 60%, transparent)",
        }}
      />
      <span
        className="absolute size-[26%] rounded-full"
        style={{ backgroundColor: "var(--primary)", boxShadow: NEON_GLOW }}
      />
    </span>
  )
}

// --- Deep-sea life (dark theme): the doors show a gentle in-place drift; the
// SVG silhouettes + PRNG are shared with the background school. ---

type Creature = {
  id: number
  kind: "jelly" | "fish"
  leftPct: number
  topPct: number
  size: number
  dx: number // vw of gentle horizontal drift
  dy: number // px of vertical bob
  rot: number // deg of sway
  dur: number // seconds per drift cycle
}
type Speck = { id: number; leftPct: number; topPct: number; dur: number }

function makeAbyss(seed: number): { creatures: Creature[]; specks: Speck[] } {
  const rand = mulberry32(seed)
  const creatureCount = 5 + Math.floor(rand() * 3)
  const creatures: Creature[] = Array.from(
    { length: creatureCount },
    (_, id) => ({
      dur: 9 + rand() * 12,
      dx: (rand() * 2 - 1) * 7,
      dy: (rand() * 2 - 1) * 22,
      id,
      kind: rand() < 0.5 ? "jelly" : "fish",
      leftPct: rand() * 86,
      rot: (rand() * 2 - 1) * 12,
      size: 22 + rand() * 40,
      topPct: rand() * 80,
    })
  )
  const specks: Speck[] = Array.from({ length: 6 }, (_, id) => ({
    dur: 2.5 + rand() * 3,
    id,
    leftPct: rand() * 96,
    topPct: rand() * 96,
  }))
  return { creatures, specks }
}

function AbyssLife({ seed }: { seed: number }) {
  const { creatures, specks } = useMemo(() => makeAbyss(seed), [seed])
  return (
    <>
      {specks.map((s) => (
        <motion.span
          animate={{ opacity: [0.15, 0.9, 0.15] }}
          aria-hidden
          className="absolute size-[3px] rounded-full"
          key={`speck-${s.id}`}
          style={{
            backgroundColor: BIO,
            boxShadow: `0 0 6px ${BIO}`,
            left: `${s.leftPct}%`,
            top: `${s.topPct}%`,
          }}
          transition={{ duration: s.dur, ease: "easeInOut", repeat: Infinity }}
        />
      ))}
      {creatures.map((c) => (
        <motion.div
          animate={{
            rotate: [0, c.rot, 0],
            x: [0, `${c.dx}vw`, 0],
            y: [0, c.dy, 0],
          }}
          aria-hidden
          className="absolute"
          key={`creature-${c.id}`}
          style={{
            height: c.size,
            left: `${c.leftPct}%`,
            top: `${c.topPct}%`,
            width: c.size,
          }}
          transition={{
            duration: c.dur,
            ease: "easeInOut",
            repeat: Infinity,
            repeatType: "mirror",
          }}
        >
          {c.kind === "jelly" ? <Jellyfish /> : <Fish />}
        </motion.div>
      ))}
    </>
  )
}

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  const { resolvedTheme } = useTheme()
  const theme: Theme = isTheme(resolvedTheme) ? resolvedTheme : DEFAULT_THEME

  // Seed the sea life on the CLIENT only (Date.now() in render would mismatch
  // the prerendered HTML). Re-mounts per navigation → fresh randomness each time.
  const [seed, setSeed] = useState<number | null>(null)
  useEffect(() => setSeed(Date.now()), [])

  if (reduceMotion) return <>{children}</>

  return (
    <>
      {children}
      {DOORS.map((door, i) => (
        <motion.div
          animate={door.animate}
          aria-hidden
          className={cn("pointer-events-none fixed z-[100]", door.panel)}
          initial={REST}
          key={door.panel}
          style={PANEL_STYLE[theme]}
          transition={CURTAIN_TRANSITION}
        >
          {theme === "dark" && seed != null ? (
            <div className="absolute inset-0 overflow-hidden">
              <AbyssLife seed={seed + i} />
            </div>
          ) : null}
          {/* Inner haze framing the leaf (neon on terminal, subtle elsewhere). */}
          {theme === "terminal" ? (
            <span
              className="absolute inset-0"
              style={{
                boxShadow:
                  "inset 0 0 26px color-mix(in oklch, var(--primary) 28%, transparent)",
              }}
            />
          ) : null}
          <span
            className={cn("absolute", door.seam)}
            style={SEAM_STYLE[theme]}
          />
          <DoorNode className={door.knob} theme={theme} />
        </motion.div>
      ))}
    </>
  )
}
