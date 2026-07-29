"use client"

import { type HTMLMotionProps, type MotionStyle, motion } from "motion/react"

import {
  Slot,
  type WithAsChild,
} from "@/components/animate-ui/primitives/animate/slot"

type LiquidButtonProps = WithAsChild<
  HTMLMotionProps<"button"> & {
    delay?: string
    fillHeight?: string
    hoverScale?: number
    tapScale?: number
    /**
     * Inverts the fill: filled at rest and drains on hover (default is empty at
     * rest, fills on hover). Pair with inverted text colours in the wrapper so
     * the label reads on the filled surface and returns to the base colour as it
     * drains. Reflects a controlled pressed/active state.
     */
    defaultPressed?: boolean
  }
>

function LiquidButton({
  delay = "0.3s",
  fillHeight = "3px",
  hoverScale = 1.05,
  tapScale = 0.95,
  asChild = false,
  defaultPressed = false,
  ...props
}: LiquidButtonProps) {
  const Component = asChild ? Slot : motion.button

  // Resting vs hover fill. Motion snaps the var instantly (duration 0); the CSS
  // background transition below does the visible rise/drain, so a defaultPressed
  // change on click animates through the same transition.
  //   empty   → off to the right (unpressed rest): fills on hover.
  //   full    → covered.
  //   drained → full width but only a bottom sliver of height. The background is
  //             bottom-anchored (…position y = 100%), so shrinking the height
  //             lowers the liquid level → it drains top→bottom, not right→left.
  const empty = { height: fillHeight, width: "-1%" }
  const full = { height: "100%", width: "100%" }
  const drained = { height: fillHeight, width: "100%" }
  const rest = defaultPressed ? full : empty
  const hover = defaultPressed ? drained : full

  return (
    <Component
      style={
        {
          "--liquid-button-delay": "0s",
          "--liquid-button-fill-height": rest.height,
          "--liquid-button-fill-width": rest.width,
          background:
            "linear-gradient(var(--liquid-button-color) 0 0) no-repeat calc(200% - var(--liquid-button-fill-width, -1%)) 100% / 200% var(--liquid-button-fill-height, 0.2em)",
          backgroundColor: "var(--liquid-button-background-color)",
          transition: `background ${delay} var(--liquid-button-delay, 0s), color ${delay} ${delay}, background-position ${delay} calc(${delay} - var(--liquid-button-delay, 0s))`,
        } as MotionStyle
      }
      whileHover={{
        "--liquid-button-delay": delay,
        "--liquid-button-fill-height": hover.height,
        "--liquid-button-fill-width": hover.width,
        scale: hoverScale,
        transition: {
          "--liquid-button-delay": { duration: 0 },
          "--liquid-button-fill-height": { duration: 0 },
          "--liquid-button-fill-width": { duration: 0 },
        },
      }}
      whileTap={{ scale: tapScale }}
      {...props}
    />
  )
}

export { LiquidButton, type LiquidButtonProps }
