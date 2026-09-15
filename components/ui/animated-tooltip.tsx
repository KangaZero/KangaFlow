"use client"

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "motion/react"
import { useState } from "react"

import { Kbd, KbdGroup } from "@/components/ui/kbd"
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
// `tail-*` are project utilities declared in globals.css. They are real
// utilities (`@utility`), not inline `[clip-path:…]` classes, so Tailwind
// variants compose — see `responsive`, which flips the tail at `sm`.
const SIDE_STYLES = {
  bottom: {
    className: "top-full mt-2",
    origin: "origin-top",
    pad: "px-4 pt-5 pb-1.5",
    shadow: "4px_4px",
    tail: "tail-bottom",
    y: -8,
  },
  left: {
    className: "top-0 right-full mr-2",
    origin: "origin-right",
    pad: "py-1.5 pl-4 pr-8",
    shadow: "-4px_4px",
    tail: "tail-left",
    y: 0,
  },
  responsive: {
    className: "bottom-full mb-2 sm:top-full sm:bottom-auto sm:mt-2 sm:mb-0",
    origin: "origin-bottom sm:origin-top",
    pad: "px-4 py-5",
    shadow: "4px_4px",
    tail: "tail-top sm:tail-bottom",
    y: 8,
  },
  right: {
    className: "top-0 left-full ml-2",
    origin: "origin-left",
    pad: "py-1.5 pr-4 pl-8",
    shadow: "4px_4px",
    tail: "tail-right",
    y: 0,
  },
  top: {
    className: "bottom-full mb-2",
    origin: "origin-bottom",
    pad: "px-4 pt-1.5 pb-5",
    shadow: "4px_-4px",
    tail: "tail-top",
    y: 8,
  },
} as const

// Generalised from the Aceternity "animated tooltip": the mouse-follow spring
// (rotate + translateX) is preserved, but it now wraps an arbitrary trigger and
// shows a text label on a configurable side.
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
            {/* wrapper carries the shadow; child carries the shape */}
            <motion.div
              animate={{
                opacity: 1,
                scale: 1,
                transition: { damping: 10, stiffness: 260, type: "spring" },
                y: 0,
              }}
              className={cn(
                "pointer-events-none absolute z-50 w-max",
                // `drop-shadow-*`, not `filter-[drop-shadow(…)]`: the latter
                // sets the whole `filter` property, so any other filter
                // utility added here later would silently clobber it.
                "drop-shadow-[4px_4px_0_var(--tooltip-shadow)]",
                // "translate-y-[-15]",
                // side !== "left"
                //   ? "left-1/2 -translate-x-1/2"
                //   : "right-full mr-2",
                placement.origin,
                isHorizontal ? "" : "left-1/2",
                placement.className
              )}
              data-slot="tooltip-content"
              exit={{ opacity: 0, scale: 0.6, y: placement.y }}
              initial={{ opacity: 0, scale: 0.6, y: placement.y }}
              // style={{ rotate, translateX }}
              style={{ rotate, translateX, x: isHorizontal ? 0 : "-50%" }}
            >
              <div
                className={cn(
                  "flex -skew-x-6 items-center gap-1.5 whitespace-nowrap bg-tooltip",
                  placement.pad,
                  "font-black text-[11px] text-tooltip-foreground uppercase tracking-wide",
                  placement.tail
                )}
              >
                <span className="skew-x-6">{label}</span>
                {shortcut?.length ? (
                  <KbdGroup className="skew-x-6">
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
          </div>
        )}
      </AnimatePresence>
      {children}
    </div>
  )
}
