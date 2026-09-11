"use client"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { Activity, useEffect, useState } from "react"
import { BlueSky } from "@/components/blue-sky"
import { Clouds } from "@/components/canvasui/Clouds"
import { SwimmingSchool } from "@/components/sea-creatures"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { DEFAULT_THEME } from "@/lib/themes"
import { useGlobalStates } from "@/providers/global-state-provider"

// The WebGL backgrounds pull heavy deps (ogl / three + postprocessing), so they
// load only when their theme is active — a light-theme visitor never downloads
// them. BlueSky is pure CSS, so it ships inline.
const LightRays = dynamic(
  () => import("@/components/LightRays").then((m) => m.LightRays),
  {
    ssr: false,
  }
)
const PixelBlast = dynamic(() => import("@/components/PixelBlast"), {
  ssr: false,
})

const FILL = "h-full w-full"

function activeBackground(theme: string | undefined, isReducedMotion: boolean) {
  switch (theme) {
    case "dark":
      return (
        <>
          <LightRays className={FILL} />
          <Activity mode={isReducedMotion ? "hidden" : "visible"}>
            <SwimmingSchool />
          </Activity>
        </>
      )
    case "terminal":
      return (
        <Activity mode={isReducedMotion ? "hidden" : "visible"}>
          <PixelBlast className={FILL} color="#a6e3a1" transparent />
        </Activity>
      )
    default:
      return (
        <Clouds
          className={FILL}
          cover={0.1}
          refraction={0.1}
          speed={isReducedMotion ? 0 : 0.6}
          wind={0.2}
        >
          <BlueSky className={FILL} isReducedMotion={isReducedMotion} />
        </Clouds>
      )
  }
}

// Per-theme background layer. Renders nothing until mounted so the server HTML
// (which can't know the resolved theme) and first client render match, then the
// correct background fills in.
export function ThemeBackground() {
  const { resolvedTheme } = useTheme()
  const reducedMotion = useReducedMotion()
  const { animationPref } = useGlobalStates()
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
            key={resolvedTheme ?? DEFAULT_THEME}
            transition={{ duration: 0.6, ease: "easeInOut" }}
          >
            {activeBackground(
              resolvedTheme ?? DEFAULT_THEME,
              isReducedMotion(animationPref, reducedMotion)
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
