"use client"

import {
  Accordion as AccordionPrimitive,
  type AccordionRootChangeEventDetails,
  type AccordionValue,
} from "@base-ui/react/accordion"
import {
  AnimatePresence,
  type HTMLMotionProps,
  type MotionStyle,
  motion,
  type TargetAndTransition,
} from "motion/react"
import type * as React from "react"
import { useControlledState } from "@/hooks/use-controlled-state"
import { getStrictContext } from "@/lib/get-strict-context"

type AccordionContextType = {
  value: AccordionValue<unknown>
  setValue: (
    value: AccordionValue<unknown>,
    eventDetails: AccordionRootChangeEventDetails
  ) => void
}

type AccordionItemContextType = {
  isOpen: boolean
}

const [AccordionProvider, useAccordion] =
  getStrictContext<AccordionContextType>("AccordionContext")

const [AccordionItemProvider, useAccordionItem] =
  getStrictContext<AccordionItemContextType>("AccordionItemContext")

/** Stable identity so an uncontrolled root never re-seeds state with a new array. */
const EMPTY_VALUE: AccordionValue<unknown> = []

type AccordionProps = React.ComponentProps<typeof AccordionPrimitive.Root>

function Accordion(props: AccordionProps) {
  const [value, setValue] = useControlledState<
    AccordionValue<unknown>,
    [AccordionRootChangeEventDetails]
  >({
    defaultValue: props.defaultValue ?? EMPTY_VALUE,
    onChange: props.onValueChange,
    value: props.value,
  })

  return (
    <AccordionProvider value={{ setValue, value }}>
      <AccordionPrimitive.Root
        data-slot="accordion"
        {...props}
        onValueChange={setValue}
      />
    </AccordionProvider>
  )
}

type AccordionItemProps = React.ComponentProps<typeof AccordionPrimitive.Item>

function AccordionItem(props: AccordionItemProps) {
  const { value } = useAccordion()
  const isOpen = value.includes(props.value)

  return (
    <AccordionItemProvider value={{ isOpen }}>
      <AccordionPrimitive.Item data-slot="accordion-item" {...props} />
    </AccordionItemProvider>
  )
}

type AccordionHeaderProps = React.ComponentProps<
  typeof AccordionPrimitive.Header
>

function AccordionHeader(props: AccordionHeaderProps) {
  return <AccordionPrimitive.Header data-slot="accordion-header" {...props} />
}

type AccordionTriggerProps = React.ComponentProps<
  typeof AccordionPrimitive.Trigger
>

function AccordionTrigger(props: AccordionTriggerProps) {
  return <AccordionPrimitive.Trigger data-slot="accordion-trigger" {...props} />
}

const PANEL_MASK =
  "linear-gradient(black var(--mask-stop), transparent var(--mask-stop))"

const PANEL_STYLE: MotionStyle = {
  maskImage: PANEL_MASK,
  overflow: "hidden",
  WebkitMaskImage: PANEL_MASK,
}

const PANEL_COLLAPSED: TargetAndTransition = {
  "--mask-stop": "0%",
  height: 0,
  opacity: 0,
  y: 20,
}

const PANEL_EXPANDED: TargetAndTransition = {
  "--mask-stop": "100%",
  height: "auto",
  opacity: 1,
  y: 0,
}

type AccordionPanelProps = Omit<
  React.ComponentProps<typeof AccordionPrimitive.Panel>,
  "keepMounted" | "render"
> &
  HTMLMotionProps<"div"> & {
    keepRendered?: boolean
  }

function AccordionPanel({
  transition = { duration: 0.35, ease: "easeInOut" },
  hiddenUntilFound,
  keepRendered = false,
  ...props
}: AccordionPanelProps) {
  const { isOpen } = useAccordionItem()

  if (!(keepRendered || isOpen)) {
    return <AnimatePresence />
  }

  return (
    <AnimatePresence>
      <AccordionPrimitive.Panel
        hidden={false}
        {...(hiddenUntilFound !== undefined ? { hiddenUntilFound } : {})}
        keepMounted
        render={
          <motion.div
            animate={isOpen ? PANEL_EXPANDED : PANEL_COLLAPSED}
            data-slot="accordion-panel"
            exit={PANEL_COLLAPSED}
            initial={PANEL_COLLAPSED}
            key="accordion-panel"
            style={PANEL_STYLE}
            transition={transition}
            {...props}
          />
        }
      />
    </AnimatePresence>
  )
}

export {
  Accordion,
  AccordionHeader,
  type AccordionHeaderProps,
  AccordionItem,
  type AccordionItemContextType,
  type AccordionItemProps,
  AccordionPanel,
  type AccordionPanelProps,
  type AccordionProps,
  AccordionTrigger,
  type AccordionTriggerProps,
  useAccordionItem,
}
