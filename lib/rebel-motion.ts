// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Shared Motion presets for the "rebel" surfaces (AnimatedTooltip, the header
// workplace card): diagonal clip-path wipe + slam + accent shard. One source so
// both entrances stay identical.
//
// The wipe polygons reach far past the box (−60%/160%) so the shard overflow is
// never clipped, and all three keep the same point count so Motion can
// interpolate between them.

import type { Transition } from "motion/react"

export const WIPE_HIDDEN = "polygon(-20% -60%, -20% -60%, -40% 160%, -40% 160%)"
export const WIPE_SHOWN = "polygon(-20% -60%, 140% -60%, 120% 160%, -40% 160%)"
export const WIPE_GONE = "polygon(140% -60%, 140% -60%, 120% 160%, 120% 160%)"
// A literal tuple matches Motion's cubic-bezier type (readonly [n, n, n, n]).
export const WIPE_EASE = [0.6, 0, 0.2, 1] as const
export const WIPE_DURATION = 0.3

export const SLAM: Transition = { damping: 15, stiffness: 420, type: "spring" }
/** Plate slam: mild scale/rotate overshoot (SLAM spring) into place. */
export const SLAM_HIDDEN = { opacity: 0, rotate: -9, scale: 1.3 }
export const SLAM_SHOWN = { opacity: 1, rotate: 0, scale: 1 }

export const SHARD: Transition = { damping: 14, stiffness: 380, type: "spring" }
/** Accent shard: flies in from the opposite corner, lands as an offset shadow. */
export const SHARD_HIDDEN = {
  opacity: 0,
  rotate: 10,
  scale: 0.6,
  x: -26,
  y: -14,
}
export const SHARD_SHOWN = { opacity: 1, rotate: -3, scale: 1, x: 6, y: 5 }
export const SHARD_DELAY = 0.05

/** Ransom letters pop in after the plate lands. */
export const GLYPH_DELAY = 0.12
export const GLYPH_STAGGER = 0.022
