"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { AnimatePresence, motion } from "motion/react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"

import { BlueSky } from "@/components/blue-sky"

// The WebGL backgrounds pull heavy deps (ogl / three + postprocessing), so they
// load only when their theme is active — a light-theme visitor never downloads
// them. BlueSky is pure CSS, so it ships inline.
const LightRays = dynamic(
  () => import("@/components/LightRays").then((m) => m.LightRays),
  { ssr: false }
)
const PixelBlast = dynamic(() => import("@/components/PixelBlast"), {
  ssr: false,
})

const FILL = "h-full w-full"

function activeBackground(theme: string | undefined) {
  switch (theme) {
    case "dark":
      return <LightRays className={FILL} />
    case "terminal":
      return <PixelBlast className={FILL} color="#a6e3a1" transparent />
    default:
      return <BlueSky className={FILL} />
  }
}

// Per-theme background layer. Renders nothing until mounted so the server HTML
// (which can't know the resolved theme) and first client render match, then the
// correct background fills in.
export function ThemeBackground() {
  const { resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Crossfade on theme change: keyed by theme, so the outgoing layer fades out
  // while the incoming fades in (with a gentle zoom for a soft cross-dissolve).
  // Overlapping — no `mode="wait"` — so there's never a bare gap between them.
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <AnimatePresence>
        {mounted ? (
          <motion.div
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0"
            exit={{ opacity: 0, scale: 1.04 }}
            initial={{ opacity: 0, scale: 1.04 }}
            key={resolvedTheme ?? "light"}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            {activeBackground(resolvedTheme)}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
