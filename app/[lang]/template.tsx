"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

// Route transition: a Next App Router `template.tsx` re-mounts on every
// navigation, so this entrance replays each time. Two neon "grid gate" leaves
// start closed over the viewport and slide apart to reveal the new page —
// Tron-style: near-black panels lit by a faint circuit grid, a glowing seam
// where the leaves meet, and a neon identity-disc node on each inner edge. Only
// the entrance animates (App Router unmounts the old page first); the leaves
// TRANSLATE so their ornaments ride undistorted. The neon colour is the theme's
// `--primary`, so it adapts (electric on dark, green in the terminal theme).

// Curtain axis: "x" parts left↔right, "y" parts top↔bottom.
const ORIENTATION: "x" | "y" = "x"

const CURTAIN_TRANSITION = { duration: 0.9, ease: [0.22, 1, 0.36, 1] } as const

// Stacked, increasing-blur shadows fake neon light-bleed. Shared by the seam,
// the frame haze, and the disc so the whole gate glows as one material.
const NEON_GLOW =
  "0 0 6px var(--primary), 0 0 16px var(--primary), 0 0 30px color-mix(in oklch, var(--primary) 55%, transparent)"

// Near-black base (neon needs a dark ground to glow against) + a faint circuit
// grid drawn from two repeating gradients tinted with the theme accent.
const GRID_LINE = "color-mix(in oklch, var(--primary) 12%, transparent)"
const PANEL_STYLE = {
  backgroundColor: "#05060a",
  backgroundImage: `repeating-linear-gradient(0deg, ${GRID_LINE} 0 1px, transparent 1px 42px), repeating-linear-gradient(90deg, ${GRID_LINE} 0 1px, transparent 1px 42px)`,
}

const REST = ORIENTATION === "x" ? { x: 0 } : { y: 0 }

// Per leaf: slide target, panel box, the glowing seam edge (where leaves meet),
// and the disc node anchored on that same inner edge.
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

// A Tron "identity disc": a glowing ring with a bright core.
function NeonNode({ className }: { className?: string }) {
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

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()

  return (
    <>
      {children}
      {reduceMotion
        ? null
        : DOORS.map((door) => (
            <motion.div
              animate={door.animate}
              aria-hidden
              className={cn("pointer-events-none fixed z-[100]", door.panel)}
              initial={REST}
              key={door.panel}
              style={PANEL_STYLE}
              transition={CURTAIN_TRANSITION}
            >
              {/* Inner neon haze framing the leaf. */}
              <span
                className="absolute inset-0"
                style={{
                  boxShadow:
                    "inset 0 0 26px color-mix(in oklch, var(--primary) 28%, transparent)",
                }}
              />
              {/* Bright glowing seam where the two leaves meet. */}
              <span
                className={cn("absolute", door.seam)}
                style={{
                  backgroundColor: "var(--primary)",
                  boxShadow: NEON_GLOW,
                }}
              />
              <NeonNode className={door.knob} />
            </motion.div>
          ))}
    </>
  )
}
