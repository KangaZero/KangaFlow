"use client"

import { AnimatePresence, type HTMLMotionProps, motion } from "motion/react"
import { Popover as PopoverPrimitive } from "radix-ui"
import type * as React from "react"
import { useControlledState } from "@/hooks/use-controlled-state"
import { getStrictContext } from "@/lib/get-strict-context"

type PopoverContextType = {
  isOpen: boolean
  setIsOpen: (isOpen: boolean) => void
}

const [PopoverProvider, usePopover] =
  getStrictContext<PopoverContextType>("PopoverContext")

type PopoverProps = React.ComponentProps<typeof PopoverPrimitive.Root>

function Popover(props: PopoverProps) {
  const [isOpen, setIsOpen] = useControlledState({
    defaultValue: props?.defaultOpen,
    onChange: props?.onOpenChange,
    value: props?.open,
  })

  return (
    <PopoverProvider value={{ isOpen, setIsOpen }}>
      <PopoverPrimitive.Root
        data-slot="popover"
        {...props}
        onOpenChange={setIsOpen}
      />
    </PopoverProvider>
  )
}

type PopoverTriggerProps = React.ComponentProps<typeof PopoverPrimitive.Trigger>

function PopoverTrigger(props: PopoverTriggerProps) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

type PopoverPortalProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Portal>,
  "forceMount"
>

function PopoverPortal(props: PopoverPortalProps) {
  const { isOpen } = usePopover()

  return (
    <AnimatePresence>
      {isOpen && (
        <PopoverPrimitive.Portal
          data-slot="popover-portal"
          forceMount
          {...props}
        />
      )}
    </AnimatePresence>
  )
}

type PopoverContentProps = Omit<
  React.ComponentProps<typeof PopoverPrimitive.Content>,
  "forceMount" | "asChild"
> &
  HTMLMotionProps<"div">

function PopoverContent({
  transition = { damping: 25, stiffness: 300, type: "spring" },
  children,
  ...props
}: PopoverContentProps) {
  // The positioning + focus/escape/pointer handlers ride in `...props` (kept
  // optional, not re-passed as explicit `undefined` — exactOptionalPropertyTypes).
  // `asChild` forwards the HTML/motion ones onto motion.div via the Slot; Radix
  // consumes the popover ones. Mirrors the dialog primitive's approach.
  return (
    <PopoverPrimitive.Content asChild forceMount {...props}>
      <motion.div
        animate={{ opacity: 1, scale: 1 }}
        data-slot="popover-content"
        exit={{ opacity: 0, scale: 0.5 }}
        initial={{ opacity: 0, scale: 0.5 }}
        key="popover-content"
        transition={transition}
      >
        {children}
      </motion.div>
    </PopoverPrimitive.Content>
  )
}

type PopoverAnchorProps = React.ComponentProps<typeof PopoverPrimitive.Anchor>

function PopoverAnchor({ ...props }: PopoverAnchorProps) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

type PopoverArrowProps = React.ComponentProps<typeof PopoverPrimitive.Arrow>

function PopoverArrow(props: PopoverArrowProps) {
  return <PopoverPrimitive.Arrow data-slot="popover-arrow" {...props} />
}

type PopoverCloseProps = React.ComponentProps<typeof PopoverPrimitive.Close>

function PopoverClose(props: PopoverCloseProps) {
  return <PopoverPrimitive.Close data-slot="popover-close" {...props} />
}

export {
  Popover,
  PopoverAnchor,
  type PopoverAnchorProps,
  PopoverArrow,
  type PopoverArrowProps,
  PopoverClose,
  type PopoverCloseProps,
  PopoverContent,
  type PopoverContentProps,
  type PopoverContextType,
  PopoverPortal,
  type PopoverPortalProps,
  type PopoverProps,
  PopoverTrigger,
  type PopoverTriggerProps,
  usePopover,
}
