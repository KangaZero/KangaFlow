"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/ui/animated-tooltip.css"

import {
  AnimatePresence,
  motion,
  type Transition,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react"
import { useMemo, useState } from "react"

import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { ransomLetters } from "@/lib/ransom-letters"
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
 * Entrance = diagonal wipe + slam, run together:
 * - a diagonal clip-path wipe reveals shard + plate;
 * - the plate slams in (mild scale/rotate overshoot) and the accent shard
 *   springs in 50ms later from the opposite corner;
 * - letters pop in after the plate lands, with a stepped colour-split glitch.
 * Exit slices the tooltip out to the right.
 * The wipe polygons reach far past the box (−60%/160%) so the shard overflow
 * is never clipped, and keep the same point count so Motion can interpolate.
 */
const WIPE_HIDDEN = "polygon(-20% -60%, -20% -60%, -40% 160%, -40% 160%)"
const WIPE_SHOWN = "polygon(-20% -60%, 140% -60%, 120% 160%, -40% 160%)"
const WIPE_GONE = "polygon(140% -60%, 140% -60%, 120% 160%, 120% 160%)"
// A literal tuple matches Motion's cubic-bezier type (readonly [n, n, n, n]).
const WIPE_EASE = [0.6, 0, 0.2, 1] as const
const SLAM: Transition = { damping: 15, stiffness: 420, type: "spring" }
const SHARD: Transition = { damping: 14, stiffness: 380, type: "spring" }
const GLYPH_DELAY = 0.12
const GLYPH_STAGGER = 0.022

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
  const letters = useMemo(() => ransomLetters(label), [label])

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
                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                className={placement.origin}
                exit={{ opacity: 0, transition: { duration: 0.16 }, x: 14 }}
                initial={{ opacity: 0, rotate: -9, scale: 1.3 }}
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
                  transition={{ duration: 0.3, ease: WIPE_EASE }}
                >
                  {/* Accent shard: same silhouette, offset like a hard shadow. */}
                  <motion.div
                    animate={{ opacity: 1, rotate: -3, scale: 1, x: 6, y: 5 }}
                    aria-hidden
                    className={cn(
                      "bg-tooltip-shadow absolute -inset-x-2.5 -top-1.5 -bottom-2",
                      placement.shape
                    )}
                    initial={{
                      opacity: 0,
                      rotate: 10,
                      scale: 0.6,
                      x: -26,
                      y: -14,
                    }}
                    transition={{ ...SHARD, delay: 0.05 }}
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
                    <span
                      aria-hidden
                      className="tooltip-glitch inline-flex skew-x-[9deg] items-end"
                    >
                      {letters.map((token) =>
                        token.type === "space" ? (
                          <span className="w-1.5" key={token.key} />
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
                              delay: GLYPH_DELAY + token.index * GLYPH_STAGGER,
                              stiffness: 520,
                              type: "spring",
                            }}
                          >
                            {token.char}
                          </motion.span>
                        )
                      )}
                    </span>
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
