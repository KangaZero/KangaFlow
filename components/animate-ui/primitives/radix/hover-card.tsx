"use client"

import {
  AnimatePresence,
  type HTMLMotionProps,
  type MotionValue,
  motion,
  type SpringOptions,
  useMotionValue,
  useSpring,
} from "motion/react"
import { HoverCard as HoverCardPrimitive } from "radix-ui"
import type * as React from "react"
import { useControlledState } from "@/hooks/use-controlled-state"
import { getStrictContext } from "@/lib/get-strict-context"

type HoverCardContextType = {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
  x: MotionValue<number>
  y: MotionValue<number>
  followCursor?: boolean | "x" | "y"
  followCursorSpringOptions?: SpringOptions
}

const [HoverCardProvider, useHoverCard] =
  getStrictContext<HoverCardContextType>("HoverCardContext")

type HoverCardProps = React.ComponentProps<typeof HoverCardPrimitive.Root> & {
  followCursor?: boolean | "x" | "y"
  followCursorSpringOptions?: SpringOptions
}

function HoverCard({
  followCursor = false,
  followCursorSpringOptions = { damping: 17, stiffness: 200 },
  ...props
}: HoverCardProps) {
  const [isOpen, setIsOpen] = useControlledState({
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
    value: props?.open,
  })
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  return (
    <HoverCardProvider
      value={{
        followCursor,
        followCursorSpringOptions,
        isOpen,
        setIsOpen,
        x,
        y,
      }}
    >
      <HoverCardPrimitive.Root
        data-slot="hover-card"
        {...props}
        onOpenChange={setIsOpen}
      />
    </HoverCardProvider>
  )
}

type HoverCardTriggerProps = React.ComponentProps<
  typeof HoverCardPrimitive.Trigger
>

function HoverCardTrigger({ onMouseMove, ...props }: HoverCardTriggerProps) {
  const { x, y, followCursor } = useHoverCard()

  const handleMouseMove = (event: React.MouseEvent<HTMLAnchorElement>) => {
    onMouseMove?.(event)

    const target = event.currentTarget.getBoundingClientRect()

    if (followCursor === "x" || followCursor === true) {
      const eventOffsetX = event.clientX - target.left
      const offsetXFromCenter = (eventOffsetX - target.width / 2) / 2
      x.set(offsetXFromCenter)
    }

    if (followCursor === "y" || followCursor === true) {
      const eventOffsetY = event.clientY - target.top
      const offsetYFromCenter = (eventOffsetY - target.height / 2) / 2
      y.set(offsetYFromCenter)
    }
  }

  return (
    <HoverCardPrimitive.Trigger
      data-slot="hover-card-trigger"
      onMouseMove={handleMouseMove}
      {...props}
    />
  )
}

type HoverCardPortalProps = Omit<
  React.ComponentProps<typeof HoverCardPrimitive.Portal>,
  "forceMount"
>

function HoverCardPortal(props: HoverCardPortalProps) {
  const { isOpen } = useHoverCard()

  return (
    <AnimatePresence>
      {isOpen && (
        <HoverCardPrimitive.Portal
          data-slot="hover-card-portal"
          forceMount
          {...props}
        />
      )}
    </AnimatePresence>
  )
}

type HoverCardContentProps = React.ComponentProps<
  typeof HoverCardPrimitive.Content
> &
  HTMLMotionProps<"div">

function HoverCardContent({
  style,
  children,
  transition = { damping: 25, stiffness: 300, type: "spring" },
  ...props
}: HoverCardContentProps) {
  const { x, y, followCursor, followCursorSpringOptions } = useHoverCard()
  const translateX = useSpring(x, followCursorSpringOptions)
  const translateY = useSpring(y, followCursorSpringOptions)

  const followX = followCursor === "x" || followCursor === true
  const followY = followCursor === "y" || followCursor === true

  // The Radix positioning props (align/side/…) ride in `...props` so they stay
  // optional rather than being re-passed as explicit `undefined` (which
  // exactOptionalPropertyTypes rejects). `asChild` forwards them onto motion.div
  // via the Slot; Radix consumes the positioning ones for the popper.
  return (
    <HoverCardPrimitive.Content asChild forceMount {...props}>
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        data-slot="hover-card-content"
        exit={{ opacity: 0, scale: 0.5 }}
        initial={{ opacity: 0, scale: 0.5 }}
        key="hover-card-content"
        style={{
          ...(followX ? { x: translateX } : {}),
          ...(followY ? { y: translateY } : {}),
          ...style,
        }}
        transition={transition}
      >
        {children}
      </motion.div>
    </HoverCardPrimitive.Content>
  )
}

type HoverCardArrowProps = React.ComponentProps<typeof HoverCardPrimitive.Arrow>

function HoverCardArrow(props: HoverCardArrowProps) {
  return <HoverCardPrimitive.Arrow data-slot="hover-card-arrow" {...props} />
}

export {
  HoverCard,
  HoverCardArrow,
  type HoverCardArrowProps,
  HoverCardContent,
  type HoverCardContentProps,
  type HoverCardContextType,
  HoverCardPortal,
  type HoverCardPortalProps,
  type HoverCardProps,
  HoverCardTrigger,
  type HoverCardTriggerProps,
  useHoverCard,
}
