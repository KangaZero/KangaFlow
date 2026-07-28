"use client"

import {
  type HTMLMotionProps,
  isMotionComponent,
  type MotionValue,
  motion,
} from "motion/react"
import * as React from "react"
import { cn } from "@/lib/utils"

type AnyProps = Record<string, unknown>

type DOMMotionProps<T extends HTMLElement = HTMLElement> = Omit<
  HTMLMotionProps<keyof HTMLElementTagNameMap>,
  "ref"
> & { ref?: React.Ref<T> | undefined }

type WithAsChild<Base extends object> =
  | (Base & { asChild: true; children: React.ReactElement })
  | (Base & { asChild?: false | undefined })

type SlotProps<T extends HTMLElement = HTMLElement> = {
  // Matches motion.div's children (incl. MotionValue) so `Slot | motion.div`
  // unions type-check; non-elements are handled at runtime (isValidElement).
  children?: React.ReactNode | MotionValue<number> | MotionValue<string>
} & DOMMotionProps<T>

function mergeRefs<T>(
  ...refs: (React.Ref<T> | undefined)[]
): React.RefCallback<T> {
  return (node) => {
    refs.forEach((ref) => {
      if (!ref) return
      if (typeof ref === "function") {
        ref(node)
      } else {
        ;(ref as React.RefObject<T | null>).current = node
      }
    })
  }
}

function mergeProps<T extends HTMLElement>(
  childProps: AnyProps,
  slotProps: DOMMotionProps<T>
): AnyProps {
  const merged: AnyProps = { ...childProps, ...slotProps }

  if (childProps.className || slotProps.className) {
    merged.className = cn(
      childProps.className as string,
      slotProps.className as string
    )
  }

  if (childProps.style || slotProps.style) {
    merged.style = {
      ...(childProps.style as React.CSSProperties),
      ...(slotProps.style as React.CSSProperties),
    }
  }

  return merged
}

function Slot<T extends HTMLElement = HTMLElement>({
  children,
  ref,
  ...props
}: SlotProps<T>) {
  // Validate BEFORE touching `.type`/`.props` so the access is type-safe (no
  // `any`); the useMemo stays unconditional to satisfy the rules of hooks.
  const element = React.isValidElement<AnyProps>(children) ? children : null
  const type = element?.type

  const Base = React.useMemo<React.ElementType>(() => {
    if (type == null) return motion.div
    const isAlreadyMotion =
      typeof type === "object" && type !== null && isMotionComponent(type)
    return isAlreadyMotion
      ? (type as React.ElementType)
      : motion.create(type as React.ElementType)
  }, [type])

  if (!element) return null

  const { ref: childRef, ...childProps } = element.props

  const mergedProps = mergeProps(childProps, props)

  return (
    <Base {...mergedProps} ref={mergeRefs(childRef as React.Ref<T>, ref)} />
  )
}

export {
  type AnyProps,
  type DOMMotionProps,
  Slot,
  type SlotProps,
  type WithAsChild,
}
