"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useReducedMotion } from "motion/react"

// Route transition: a Next App Router `template.tsx` re-mounts on every
// navigation, so this entrance replays each time. Two panels start covering the
// viewport and part vertically to reveal the new page — a "curtain" reveal,
// theme-tokened, no exit animation needed (App Router unmounts the old page
// first, so only the entrance is animatable). Free, built on motion/react.
const CURTAIN_TRANSITION = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1],
} as const

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()

  return (
    <>
      {children}
      {reduceMotion ? null : (
        <>
          <motion.div
            animate={{ scaleY: 0 }}
            aria-hidden
            className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-1/2 origin-top bg-primary"
            initial={{ scaleY: 1 }}
            transition={CURTAIN_TRANSITION}
          />
          <motion.div
            animate={{ scaleY: 0 }}
            aria-hidden
            className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] h-1/2 origin-bottom bg-primary"
            initial={{ scaleY: 1 }}
            transition={CURTAIN_TRANSITION}
          />
        </>
      )}
    </>
  )
}
