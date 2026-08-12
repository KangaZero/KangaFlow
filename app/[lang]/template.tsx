"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useReducedMotion } from "motion/react"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import { useMemo } from "react"
import { BubbleWipe } from "@/components/bubble-wipe"
import { hashString } from "@/lib/bubbles"
import { DEFAULT_THEME, isTheme, type Theme } from "@/lib/themes"

// Route transition: a Next App Router `template.tsx` re-mounts on every
// navigation, so this entrance replays each time. The bubble raft itself lives
// in `components/bubble-wipe`; here we only pick the theme + per-route seed and
// decide whether to play the wipe. Gated on prefers-reduced-motion.

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
