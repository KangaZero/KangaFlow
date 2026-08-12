"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion } from "motion/react"
import { useMemo } from "react"
import { BUBBLE_ACCENT, bubbleBackground, makeBubbles } from "@/lib/bubbles"
import type { Theme } from "@/lib/themes"

// A transparent raft of soap bubbles that drifts up over the (already-visible)
// new page and floats off-screen — the SpongeBob-style flourish played by the
// route-transition template on every navigation. Rims are THEME-DRESSED via
// BUBBLE_ACCENT (terminal → neon, light → white soap, dark → bioluminescent).

// The two feel knobs. DURATION is how long the raft takes to rise off-screen;
// SPEED multiplies the per-bubble bob (and its stagger) — >1 faster, <1 slower.
const WIPE_DURATION = 3 // seconds
const BUBBLE_SPEED = 1 // multiplier
const BUBBLE_BLUR = 4 // px — backdrop blur behind the raft (0 = off)
const WIPE_EASE = [0.22, 1, 0.36, 1] as const

export function BubbleWipe({
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
