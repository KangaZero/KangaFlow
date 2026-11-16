"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/ui/animated-tooltip.css"

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react"
import { useState } from "react"

import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { RansomWord } from "@/components/ui/ransom-word"
import {
  SHARD,
  SHARD_DELAY,
  SHARD_HIDDEN,
  SHARD_SHOWN,
  SLAM,
  SLAM_HIDDEN,
  SLAM_SHOWN,
  WIPE_DURATION,
  WIPE_EASE,
  WIPE_GONE,
  WIPE_HIDDEN,
  WIPE_SHOWN,
} from "@/lib/rebel-motion"
import { cn } from "@/lib/utils"

export interface AnimatedTooltipProps {
  /** Text shown in the floating tooltip. */
  label: string
  /**
   * Optional keyboard-shortcut tokens (e.g. `["⌘", "K"]`) rendered as <Kbd>
   * chips beside the label. Pre-formatted by the caller so this primitive stays
   * free of app-domain types; omit or pass an empty array for no shortcut.
   */
  shortcut?: readonly string[] | undefined
  /** The trigger (e.g. an icon button). */
  children: React.ReactNode
  /**
   * Where the tooltip appears relative to the trigger. "responsive" shows it
   * above on mobile and below at `sm+` — matching a nav that sits at the bottom
   * on small screens and the top on larger ones.
   */
  side?: "top" | "bottom" | "right" | "left" | "responsive"
  className?: string
}

// `tooltip-shape-*` (globals.css) are real utilities, so the `responsive` side
// can flip shape + tip padding at `sm` with plain Tailwind variants. `pad` puts
// 25px on the trigger-facing side: that is where the bolt tip lives.
const SIDE_STYLES = {
  bottom: {
    className: "top-full mt-0.5",
    origin: "origin-top",
    pad: "px-4 pt-[25px] pb-2.5",
    shape: "tooltip-shape-bottom",
  },
  left: {
    className: "top-0 right-full mr-0.5",
    origin: "origin-right",
    pad: "py-2.5 pr-[28px] pl-4",
    shape: "tooltip-shape-left",
  },
  responsive: {
    className:
      "bottom-full mb-0.5 sm:top-full sm:bottom-auto sm:mt-0.5 sm:mb-0",
    origin: "origin-bottom sm:origin-top",
    pad: "px-4 pt-2.5 pb-[25px] sm:pt-[25px] sm:pb-2.5",
    shape: "tooltip-shape-top sm:tooltip-shape-bottom",
  },
  right: {
    className: "top-0 left-full ml-0.5",
    origin: "origin-left",
    pad: "py-2.5 pr-4 pl-[28px]",
    shape: "tooltip-shape-right",
  },
  top: {
    className: "bottom-full mb-0.5",
    origin: "origin-bottom",
    pad: "px-4 pt-2.5 pb-[25px]",
    shape: "tooltip-shape-top",
  },
} as const

/*
 * Entrance = diagonal wipe + slam, run together (presets in lib/rebel-motion):
 * - a diagonal clip-path wipe reveals shard + plate;
 * - the plate slams in (mild scale/rotate overshoot) and the accent shard
 *   springs in 50ms later from the opposite corner;
 * - letters pop in after the plate lands, with a stepped colour-split glitch.
 * Exit slices the tooltip out to the right.
 */

// Generalised from the Aceternity "animated tooltip": the mouse-follow spring
// (rotate + translateX) is preserved on the outer layer; the entrance runs on
// inner layers so the two never fight over the same transform.
export function AnimatedTooltip({
  label,
  shortcut,
  children,
  side = "bottom",
  className,
}: AnimatedTooltipProps) {
  const [open, setOpen] = useState(false)
  const springConfig = { damping: 15, stiffness: 100 }
  const x = useMotionValue(0)
  const rotate = useSpring(useTransform(x, [-50, 50], [-18, 18]), springConfig)
  const translateX = useSpring(
    useTransform(x, [-50, 50], [-24, 24]),
    springConfig
  )
  const placement = SIDE_STYLES[side]
  const isHorizontal = side === "left" || side === "right"

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: presentational wrapper; the real control is the interactive child, this only drives the decorative tooltip.
    <div
      className={cn("group relative flex items-center", className)}
      onBlur={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onPointerEnter={() => setOpen(true)}
      onPointerLeave={() => setOpen(false)}
      onPointerMove={(event) => {
        const halfWidth = event.currentTarget.offsetWidth / 2
        x.set(event.nativeEvent.offsetX - halfWidth)
      }}
    >
      <AnimatePresence>
        {open && (
          <div className="relative">
            {/* Layer 1: position + mouse-follow tilt. */}
            <motion.div
              className={cn(
                "pointer-events-none absolute z-50 w-max",
                placement.origin,
                isHorizontal ? "" : "left-1/2",
                placement.className
              )}
              data-slot="tooltip-content"
              style={{ rotate, translateX, x: isHorizontal ? 0 : "-50%" }}
            >
              {/* Layer 2: slam in, slice out. */}
              <motion.div
                animate={SLAM_SHOWN}
                className={placement.origin}
                exit={{ opacity: 0, transition: { duration: 0.16 }, x: 14 }}
                initial={SLAM_HIDDEN}
                transition={{ ...SLAM, opacity: { duration: 0.12 } }}
              >
                {/* Layer 3: diagonal wipe (clip-path) around shard + plate. */}
                <motion.div
                  animate={{ clipPath: WIPE_SHOWN }}
                  className="relative"
                  exit={{
                    clipPath: WIPE_GONE,
                    transition: { duration: 0.16, ease: "easeIn" },
                  }}
                  initial={{ clipPath: WIPE_HIDDEN }}
                  transition={{ duration: WIPE_DURATION, ease: WIPE_EASE }}
                >
                  {/* Accent shard: same silhouette, offset like a hard shadow. */}
                  <motion.div
                    animate={SHARD_SHOWN}
                    aria-hidden
                    className={cn(
                      "bg-tooltip-shadow absolute -inset-x-2.5 -top-1.5 -bottom-2",
                      placement.shape
                    )}
                    initial={SHARD_HIDDEN}
                    transition={{ ...SHARD, delay: SHARD_DELAY }}
                  />
                  {/* Plate: skewed, text counter-skewed back to upright. */}
                  <div
                    className={cn(
                      "bg-tooltip relative flex -skew-x-[9deg] items-center gap-2 whitespace-nowrap",
                      placement.pad,
                      placement.shape
                    )}
                  >
                    <span className="sr-only">{label}</span>
                    <RansomWord
                      className="tooltip-glitch inline-flex skew-x-[9deg] items-end"
                      text={label}
                    />
                    {shortcut?.length ? (
                      <KbdGroup className="skew-x-[9deg]">
                        {shortcut.map((token) => (
                          <Kbd
                            className="in-data-[slot=tooltip-content]:bg-sidebar-accent"
                            key={token}
                          >
                            {token}
                          </Kbd>
                        ))}
                      </KbdGroup>
                    ) : null}
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {children}
    </div>
  )
}
