// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { useReducedMotion } from "motion/react"
import * as React from "react"

import { isReducedMotion } from "@/lib/isReducedMotion"
import { useGlobalStates } from "@/providers/global-state-provider"

const TILT_VARS = ["--rx", "--ry", "--mx", "--my", "--hyp"] as const

type CardTiltHandlers = {
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void
  onPointerLeave: (event: React.PointerEvent<HTMLElement>) => void
}

/**
 * Pointer-driven 3D tilt for collectible cards. Writes CSS custom properties
 * straight onto the element (`--rx/--ry` rotation, `--mx/--my` pointer
 * position, `--hyp` distance from centre) and lets CSS do all the rendering,
 * so pointermove never causes a React re-render. No-op under reduced motion
 * (the site's animation setting, which falls back to the OS preference).
 */
export function useCardTilt(maxDegrees = 10): CardTiltHandlers | undefined {
  const { animationPref } = useGlobalStates()
  const reduceMotion = isReducedMotion(animationPref, useReducedMotion())

  return React.useMemo(() => {
    if (reduceMotion) return undefined
    return {
      onPointerLeave: (event) => {
        const el = event.currentTarget
        el.dataset.tilting = "false"
        for (const name of TILT_VARS) el.style.removeProperty(name)
      },
      onPointerMove: (event) => {
        // Touch drags scroll the page; tilting there fights the scroll.
        if (event.pointerType === "touch") return
        const el = event.currentTarget
        const rect = el.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width
        const y = (event.clientY - rect.top) / rect.height
        const distance = Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 2)
        el.dataset.tilting = "true"
        el.style.setProperty("--rx", `${(0.5 - y) * maxDegrees}deg`)
        el.style.setProperty("--ry", `${(x - 0.5) * maxDegrees}deg`)
        el.style.setProperty("--mx", `${x * 100}%`)
        el.style.setProperty("--my", `${y * 100}%`)
        el.style.setProperty("--hyp", (0.4 + distance * 0.6).toFixed(3))
      },
    } satisfies CardTiltHandlers
  }, [reduceMotion, maxDegrees])
}
