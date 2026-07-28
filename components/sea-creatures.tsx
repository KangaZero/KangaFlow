"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useReducedMotion } from "motion/react"
import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"

// Shared deep-sea life: bioluminescent SVG silhouettes + a seeded PRNG, reused
// by the page-transition doors (gentle in-place drift) and the dark-theme
// background (a school swimming across the viewport).

// Bioluminescent accent — a literal, like the environment wallpapers: the colour
// IS the deep-sea identity, not a theme token.
export const BIO = "#39e6cf"

const GLOW_FILTER = "drop-shadow(0 0 4px rgba(57,230,207,0.55))"

// Tiny deterministic PRNG (mulberry32). Seed it with Date.now() to get a
// fresh-but-reproducible arrangement each time.
export function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Four tentacles as cubic Béziers. Only the control points move between these
// snapshots (anchors + tips are fixed) so motion can interpolate `d` — pushing
// the controls to opposite sides top-vs-bottom draws a travelling S-curve.
const TENTACLES_RELAXED =
  "M6 15 C5 19 7 23 6 28 M10 16 C9 20 11 24 10 28 M14 16 C13 20 15 24 14 28 M18 15 C17 19 19 23 18 28"
const TENTACLES_S_A =
  "M6 15 C9 19 3 23 7 28 M10 16 C13 20 7 24 11 28 M14 16 C17 20 11 24 15 28 M18 15 C21 19 15 23 19 28"
const TENTACLES_S_B =
  "M6 15 C3 19 9 23 5 28 M10 16 C7 20 13 24 9 28 M14 16 C11 20 17 24 13 28 M18 15 C15 19 21 23 17 28"

export function Jellyfish() {
  return (
    <svg
      aria-hidden
      className="size-full"
      fill="none"
      style={{ filter: GLOW_FILTER }}
      viewBox="0 0 24 30"
    >
      <title>Jellyfish</title>
      {/* Bell: gentle propulsion pulse, pivoting from the tentacle seam. */}
      <motion.path
        animate={{ scaleY: [1, 0.9, 1] }}
        d="M2 13A10 9 0 0 1 22 13L22 14Q17 18 12 14Q7 18 2 14Z"
        fill="rgba(57,230,207,0.10)"
        stroke={BIO}
        strokeOpacity="0.65"
        style={{ transformBox: "fill-box", transformOrigin: "center bottom" }}
        transition={{
          duration: 3,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
        }}
      />
      {/* Tentacles: undulate through an S-curve by morphing the path `d`. */}
      <motion.path
        animate={{ d: [TENTACLES_RELAXED, TENTACLES_S_A, TENTACLES_S_B] }}
        d={TENTACLES_RELAXED}
        stroke={BIO}
        strokeLinecap="round"
        strokeOpacity="0.45"
        transition={{
          duration: 3,
          ease: "easeInOut",
          repeat: Number.POSITIVE_INFINITY,
          repeatType: "mirror",
        }}
      />
    </svg>
  )
}

export function Fish() {
  return (
    <svg
      aria-hidden
      className="size-full"
      fill="none"
      style={{ filter: GLOW_FILTER }}
      viewBox="0 0 34 22"
    >
      <title>Fish</title>
      <path
        d="M6 11C10 5 19 3.5 25 6C28.5 7.5 31 9 33 11C31 13 28.5 14.5 25 16C19 18.5 10 17 6 11Z"
        fill="rgba(3,26,34,0.92)"
        stroke={BIO}
        strokeOpacity="0.4"
      />
      <path
        d="M6 11L1 7M6 11L1 15"
        stroke={BIO}
        strokeLinecap="round"
        strokeOpacity="0.4"
      />
      <circle cx="26" cy="9" fill={BIO} r="1.5" />
    </svg>
  )
}

type Swimmer = {
  id: number
  kind: "jelly" | "fish"
  topPct: number
  size: number
  dir: 1 | -1
  dur: number // seconds for one edge-to-edge crossing
  delay: number // stagger so they don't all enter at once
  bobPx: number
  bobDur: number
}

function makeSchool(seed: number, count: number): Swimmer[] {
  const rand = mulberry32(seed)
  return Array.from({ length: count }, (_, id) => ({
    bobDur: 4 + rand() * 4,
    bobPx: 8 + rand() * 20,
    delay: rand() * 22,
    dir: rand() < 0.5 ? 1 : -1,
    dur: 26 + rand() * 30,
    id,
    kind: rand() < 0.5 ? "jelly" : "fish",
    size: 26 + rand() * 46,
    topPct: 6 + rand() * 82,
  }))
}

// A school swimming across its (relatively/absolutely positioned) container.
// Each creature crosses fully off-screen at both ends, so the infinite loop's
// reset is never visible. Seeded on the client (Date.now()) to avoid a hydration
// mismatch, and skipped entirely under prefers-reduced-motion.
export function SwimmingSchool({
  className,
  count = 9,
}: {
  className?: string
  count?: number
}) {
  const reduceMotion = useReducedMotion()
  const [seed, setSeed] = useState<number | null>(null)

  useEffect(() => setSeed(Date.now()), [])

  const swimmers = useMemo(
    () => (seed == null ? [] : makeSchool(seed, count)),
    [seed, count]
  )

  if (reduceMotion || seed == null) return null

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      {swimmers.map((s) => (
        <motion.div
          animate={{ x: s.dir > 0 ? ["-12vw", "112vw"] : ["112vw", "-12vw"] }}
          className="absolute"
          key={s.id}
          style={{ height: s.size, top: `${s.topPct}%`, width: s.size }}
          transition={{
            delay: s.delay,
            duration: s.dur,
            ease: "linear",
            repeat: Number.POSITIVE_INFINITY,
          }}
        >
          <motion.div
            animate={{ y: [0, s.bobPx, 0] }}
            className="size-full"
            style={{ scaleX: s.dir }}
            transition={{
              duration: s.bobDur,
              ease: "easeInOut",
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "mirror",
            }}
          >
            {s.kind === "jelly" ? <Jellyfish /> : <Fish />}
          </motion.div>
        </motion.div>
      ))}
    </div>
  )
}
