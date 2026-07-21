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
  side?: "top" | "bottom" | "responsive"
  className?: string
}

// Position + entry-offset per side. `y` is the initial/exit offset so the
// tooltip slides out from behind the trigger.
const SIDE_STYLES = {
  bottom: { className: "top-full mt-2", y: -8 },
  responsive: {
    className: "bottom-full mb-2 sm:top-full sm:bottom-auto sm:mt-2 sm:mb-0",
    y: 8,
  },
  top: { className: "bottom-full mb-2", y: 8 },
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
          <motion.div
            animate={{
              opacity: 1,
              scale: 1,
              transition: { damping: 10, stiffness: 260, type: "spring" },
              y: 0,
            }}
            className={cn(
              "pointer-events-none absolute left-1/2 z-50 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-md bg-card px-3 py-1.5 text-card-foreground text-xs shadow-xl ring-1 ring-foreground/10",
              placement.className
            )}
            data-slot="tooltip-content"
            exit={{ opacity: 0, scale: 0.6, y: placement.y }}
            initial={{ opacity: 0, scale: 0.6, y: placement.y }}
            style={{ rotate, translateX }}
          >
            {label}
            {shortcut && shortcut.length > 0 ? (
              <KbdGroup>
                {shortcut.map((token) => (
                  <Kbd key={token}>{token}</Kbd>
                ))}
              </KbdGroup>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
      {children}
    </div>
  )
}
