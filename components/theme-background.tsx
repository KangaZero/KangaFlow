"use client"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import { Activity } from "react"
import { BlueSky } from "@/components/blue-sky"
import { useIsClient } from "@/lib/hooks/use-is-client"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { DEFAULT_THEME } from "@/lib/themes"
import { useGlobalStates } from "@/providers/global-state-provider"

// Every canvas/WebGL background is its own chunk that loads only when its
// theme is active, so a visitor downloads one theme's scene, not all of them
// (LightRays/PixelBlast pull ogl + raw WebGL2 shaders; Clouds, DeepSea and
// SkyBirds are large canvas scenes). BlueSky is pure CSS, so it ships inline.
const LightRays = dynamic(
  () => import("@/components/LightRays").then((m) => m.LightRays),
  {
    ssr: false,
  }
)
const PixelBlast = dynamic(() => import("@/components/PixelBlast"), {
  ssr: false,
})
const Clouds = dynamic(
  () => import("@/components/canvasui/Clouds").then((m) => m.Clouds),
  { ssr: false }
)
const DeepSea = dynamic(
  () => import("@/components/deep-sea").then((m) => m.DeepSea),
  { ssr: false }
)
const SkyBirds = dynamic(
  () => import("@/components/sky-birds").then((m) => m.SkyBirds),
  { ssr: false }
)

const FILL = "h-full w-full"

function activeBackground(theme: string | undefined, isReducedMotion: boolean) {
  switch (theme) {
    case "dark":
      return (
        <>
          <LightRays className={FILL} />
          <Activity mode={isReducedMotion ? "hidden" : "visible"}>
            <DeepSea />
          </Activity>
        </>
      )
    case "terminal":
      return (
        <Activity mode={isReducedMotion ? "hidden" : "visible"}>
          {/* [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
              "Soft glow": the dither with upstream's default bloom (glow 0.4)
              and edge softness (0.6), picked from a live comparison. No
              twinkle/drift/intro, and no pointer effects (this layer is
              pointer-events-none and decorative). */}
          <PixelBlast
            className={FILL}
            color="#a6e3a1"
            drift={0}
            enableRipples={false}
            glow={0.4}
            hoverEffect="none"
            intro={false}
            softness={0.6}
            transparent
            twinkle={0}
          />
        </Activity>
      )
    default:
      return (
        <>
          <Clouds
            className={FILL}
            cover={0.1}
            refraction={0.1}
            speed={isReducedMotion ? 0 : 0.6}
            wind={0.2}
          >
            <BlueSky className={FILL} />
          </Clouds>
          {/* Birds sit ABOVE the cloud layer (crisp, and the HTML-in-Canvas
              content never repaints per frame). */}
          <Activity mode={isReducedMotion ? "hidden" : "visible"}>
            <SkyBirds />
          </Activity>
        </>
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
  // False for the prerender + hydration pass, true after (no extra effect).
  const mounted = useIsClient()

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
