// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure helpers for the environment top bar (no React, no DOM).

import type { BarPosition } from "@/components/niri/settings"

export type TooltipSide = "top" | "bottom" | "left" | "right"

/** Bar tooltips open toward the desktop, never off the edge the bar hugs. */
export function barTooltipSide(barPosition: BarPosition): TooltipSide {
  switch (barPosition) {
    case "top":
      return "bottom"
    case "bottom":
      return "top"
    case "left":
      return "right"
    case "right":
      return "left"
  }
}

/** Fraction of the track played, for the media progress ring (0..1). */
export function trackProgress(playedSeconds: number, duration: number): number {
  if (!Number.isFinite(playedSeconds) || duration <= 0) return 0
  return Math.min(1, Math.max(0, playedSeconds / duration))
}
