"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/ui/ransom-glyph.css"

import { motion } from "motion/react"
import { useMemo } from "react"

import { ransomLetters } from "@/lib/ransom-letters"
import { GLYPH_DELAY, GLYPH_STAGGER } from "@/lib/rebel-motion"

/**
 * A word as ransom-note cut-out tags that pop in one after another. Purely
 * visual (`aria-hidden`): callers render the real text for screen readers
 * themselves (e.g. an sr-only span), since the tags split it into letters.
 */
export function RansomWord({
  text,
  className,
  delay = GLYPH_DELAY,
}: {
  text: string
  className?: string
  /** Seconds before the first letter pops. */
  delay?: number
}) {
  const letters = useMemo(() => ransomLetters(text), [text])
  return (
    <span aria-hidden className={className}>
      {letters.map((token) =>
        token.type === "space" ? (
          <span className="inline-block w-1.5" key={token.key} />
        ) : (
          <motion.span
            animate={{
              opacity: 1,
              rotate: token.rotate,
              scale: 1,
              y: token.dy,
            }}
            className="ransom-glyph"
            data-kind={token.kind}
            initial={{ opacity: 0, rotate: 40, scale: 0, y: 0 }}
            key={token.key}
            style={{ "--glyph-size": `${token.size}px` }}
            transition={{
              damping: 14,
              delay: delay + token.index * GLYPH_STAGGER,
              stiffness: 520,
              type: "spring",
            }}
          >
            {token.char}
          </motion.span>
        )
      )}
    </span>
  )
}
