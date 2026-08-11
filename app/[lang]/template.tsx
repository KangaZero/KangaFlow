"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useReducedMotion } from "motion/react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useMemo } from "react"
import { BIO, mulberry32 } from "@/components/sea-creatures"
import { DEFAULT_THEME, isTheme, type Theme } from "@/lib/themes"

// Route transition: a Next App Router `template.tsx` re-mounts on every
// navigation, so this entrance replays each time. A transparent raft of soap
// bubbles drifts up over the (already-visible) new page and floats off-screen —
// a SpongeBob-style bubble flourish. The rims are THEME-DRESSED:
//   • terminal → neon (accent = --primary)
//   • light    → white/sky soap
//   • dark     → bioluminescent teal
// Only the entrance animates (App Router unmounts the old page first), and the
// whole thing is gated on prefers-reduced-motion.

// The two feel knobs. DURATION is how long the raft takes to rise off-screen;
// SPEED multiplies the per-bubble bob (and its stagger) — >1 faster, <1 slower.
const WIPE_DURATION = 3 // seconds
const BUBBLE_SPEED = 1 // multiplier
const BUBBLE_BLUR = 4 // px — backdrop blur behind the raft (0 = off)
const WIPE_EASE = [0.22, 1, 0.36, 1] as const

// Per-theme rim colour for each bubble.
const BUBBLE_ACCENT: Record<Theme, string> = {
  dark: BIO,
  light: "rgba(255,255,255,0.95)",
  terminal: "var(--primary)",
}

// The soap-film look of a single bubble, tinted by `accent`. Three stacked
// radial-gradients (first listed paints on top): a small offset white specular
// highlight for the glassy read, a thin bright `accent` rim, and a faint inner
// sheen so the sphere isn't hollow. Centre stays transparent.
function bubbleBackground(accent: string): string {
  return [
    "radial-gradient(circle at 32% 27%, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 16%)",
    `radial-gradient(circle at 50% 50%, transparent 60%, ${accent} 71%, ${accent} 73%, transparent 77%)`,
    `radial-gradient(circle at 50% 56%, color-mix(in oklch, ${accent} 14%, transparent) 0%, transparent 62%)`,
  ].join(", ")
}

type Bubble = {
  id: number
  leftPct: number
  bottomPct: number
  size: number // px
  drift: number // vw of gentle horizontal bob
  dur: number // seconds per bob cycle
  delay: number // seconds of stagger
}

// Deterministic per-route seed (FNV-1a): identical on server + client so the
// prerendered HTML matches, and available synchronously for first-paint cover.
function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function makeBubbles(seed: number): Bubble[] {
  const rand = mulberry32(seed)
  const count = 28 + Math.floor(rand() * 10)
  return Array.from({ length: count }, (_, id) => ({
    bottomPct: rand() * 100,
    delay: rand() * 0.15,
    drift: (rand() * 2 - 1) * 4,
    dur: 1.4 + rand() * 1.2,
    id,
    leftPct: rand() * 100,
    size: 26 + rand() * 90,
  }))
}

function BubbleWipe({
  theme,
  seed,
  duration = WIPE_DURATION,
  speed = BUBBLE_SPEED,
  blur = BUBBLE_BLUR,
}: {
  theme: Theme
  seed: number
  duration?: number
  speed?: number
  blur?: number
}) {
  const bubbles = useMemo(() => makeBubbles(seed), [seed])
  const accent = BUBBLE_ACCENT[theme]
  const frost = blur > 0 ? `blur(${blur}px)` : "none"
  return (
    <motion.div
      animate={{ y: "-125%" }}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[100] min-h-[200vh] overflow-hidden"
      initial={{ y: "0%" }}
      style={{ backdropFilter: frost, WebkitBackdropFilter: frost }}
      transition={{ duration, ease: WIPE_EASE }}
    >
      {bubbles.map((b) => (
        <motion.span
          animate={{
            scale: [1, 1.05, 1],
            x: [0, `${b.drift}vw`, 0],
            y: [0, -8, 0],
          }}
          className="absolute rounded-full"
          key={b.id}
          style={{
            background: bubbleBackground(accent),
            bottom: `${b.bottomPct}%`,
            height: b.size,
            left: `${b.leftPct}%`,
            width: b.size,
          }}
          transition={{
            delay: b.delay / speed,
            duration: b.dur / speed,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
            repeatType: "mirror",
          }}
        />
      ))}
    </motion.div>
  )
}

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  const { resolvedTheme } = useTheme()
  const theme: Theme = isTheme(resolvedTheme) ? resolvedTheme : DEFAULT_THEME
  const pathname = usePathname()
  // The environment page IS the desktop — the wipe would just cover it.
  const isEnvironment = /\/environment\/?$/.test(pathname ?? "")
  const seed = useMemo(() => hashString(pathname ?? ""), [pathname])

  if (reduceMotion) return <>{children}</>

  // The environment page is the desktop — the bubble wipe would just cover it,
  // so use a simple fade-in instead.
  if (isEnvironment) {
    return (
      <motion.div
        animate={{ opacity: 1 }}
        initial={{ opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <>
      {children}
      <BubbleWipe seed={seed} theme={theme} />
    </>
  )
}
