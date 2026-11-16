"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useReducedMotion } from "motion/react"
import { usePathname } from "next/navigation"
import { BubbleSwarmTransition } from "@/components/bubble-wipe"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { useGlobalStates } from "@/providers/global-state-provider"

// Route transition: a Next App Router `template.tsx` re-mounts on every
// navigation. The cartoon bubble swarm (components/bubble-wipe) covers the
// screen BEFORE navigation (it intercepts internal link clicks) and pops away
// once this template re-mounts with the new route. Here we only report whether
// motion is allowed (app animation preference + OS reduced-motion) and signal
// the mount. Reduced motion → no interception, plain instant navigation.

export default function Template({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion()
  const { animationPref } = useGlobalStates()
  const pathname = usePathname()
  const motionAllowed = !isReducedMotion(animationPref, reduceMotion)
  // The environment page IS the desktop: keep its gentle fade-in under the
  // swarm (harmless — the swarm pops away within ~0.5s either way).
  const isEnvironment = /\/environment\/?$/.test(pathname ?? "")

  return (
    <>
      <BubbleSwarmTransition enabled={motionAllowed} />
      {motionAllowed && isEnvironment ? (
        <motion.div
          animate={{ opacity: 1 }}
          initial={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      ) : (
        children
      )}
    </>
  )
}
