"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useReducedMotion } from "motion/react"
import { cn } from "@/lib/utils"

// Route transition: a Next App Router `template.tsx` re-mounts on every
// navigation, so this entrance replays each time. Two door panels start covering
// the viewport and slide apart to reveal the new page — a sliding "curtain".
// Only the entrance is animatable (App Router unmounts the old page first).
// Panels TRANSLATE (not scale) so their door handles ride along undistorted.

// Curtain axis: "x" parts left↔right, "y" parts top↔bottom.
const ORIENTATION: "x" | "y" = "x"

const CURTAIN_TRANSITION = {
  duration: 0.8,
  ease: [0.22, 1, 0.36, 1],
} as const

// Rest position (covering) and the two sliding half-doors, each with a handle
// pinned to its inner edge (where the doors meet).
const REST = ORIENTATION === "x" ? { x: 0 } : { y: 0 }

const DOORS =
  ORIENTATION === "x"
    ? [
        {
          animate: { x: "-100%" },
          handle: "top-1/2 right-3 h-12 w-1.5 -translate-y-1/2",
          panel: "inset-y-0 left-0 w-1/2",
        },
        {
          animate: { x: "100%" },
          handle: "top-1/2 left-3 h-12 w-1.5 -translate-y-1/2",
          panel: "inset-y-0 right-0 w-1/2",
        },
      ]
    : [
        {
          animate: { y: "-100%" },
          handle: "bottom-3 left-1/2 h-1.5 w-12 -translate-x-1/2",
          panel: "inset-x-0 top-0 h-1/2",
        },
        {
          animate: { y: "100%" },
          handle: "top-3 left-1/2 h-1.5 w-12 -translate-x-1/2",
          panel: "inset-x-0 bottom-0 h-1/2",
        },
      ]

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
              className={cn(
                "pointer-events-none fixed z-[100] bg-primary",
                door.panel
              )}
              initial={REST}
              key={door.panel}
              transition={CURTAIN_TRANSITION}
            >
              <span
                className={cn(
                  "absolute rounded-full bg-primary-foreground/70",
                  door.handle
                )}
              />
            </motion.div>
          ))}
    </>
  )
}
