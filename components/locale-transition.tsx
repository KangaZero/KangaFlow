"use client"

import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "motion/react"
import type { ReactNode } from "react"
import { useLocale } from "@/providers/locale-provider"

type LocaleTransitionVariant = "fade" | "rotate"

// Enter/exit targets per variant. "rotate" is the reactbits-style vertical roll
// applied at the block level (old slides up and out, new rolls in from below) —
// the rotating-text feel without splitting text into per-character nodes.
const VARIANTS: Record<LocaleTransitionVariant, Variants> = {
  fade: {
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    initial: { opacity: 0 },
  },
  rotate: {
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -18 },
    initial: { opacity: 0, y: 18 },
  },
}

// Animates its children whenever the locale changes: keyed on locale so
// AnimatePresence swaps the subtree. Wrap any view whose text is locale-dependent
// (About, footer, sidebar, achievements) for a coordinated language-switch
// transition.
//
// - `variant` picks the motion ("rotate" = vertical roll, "fade" = opacity only).
// - `initial={false}` skips the animation on first mount so it doesn't stack with
//   a view's own mount reveal.
// - `className` carries the layout (flex/gap) the wrapper element replaces.
// - Reduced-motion users get the plain content with no wrapper animation.
export function LocaleTransition({
  children,
  className,
  variant = "rotate",
}: {
  children: ReactNode
  className?: string
  variant?: LocaleTransitionVariant
}) {
  const { locale } = useLocale()
  const reduceMotion = useReducedMotion()

  if (reduceMotion) {
    return <div className={className}>{children}</div>
  }

  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div
        animate="animate"
        className={className}
        exit="exit"
        initial="initial"
        key={locale}
        transition={{ duration: 0.25, ease: "easeOut" }}
        variants={VARIANTS[variant]}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
