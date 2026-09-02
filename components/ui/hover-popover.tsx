"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import type * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"

// Radix's HoverCard is hover-only: no click-to-pin, no dismiss-on-outside-click,
// and its grace period is too short to cross the gap to the card. This builds
// the portfolio's behaviour on top of Popover instead, which already ships the
// dismissable layer (outside pointerdown + Escape):
//
//   mouse in  → open after OPEN_DELAY_MS
//   mouse out → close after CLOSE_DELAY_MS, cancelled by entering the card
//   click     → pin: hover-out no longer closes it
//   pinned    → only an outside click, Escape, or another trigger click closes
//
// Touch devices never fire the pointer handlers (pointerType guard), so tapping
// falls straight through to the click/pin path.

const OPEN_DELAY_MS = 150
const CLOSE_DELAY_MS = 400

type PopoverContentProps = React.ComponentProps<typeof PopoverContent>

type HoverPopoverProps = {
  align?: PopoverContentProps["align"]
  children: React.ReactNode
  className?: string
  closeDelay?: number
  onOpenChange?: (open: boolean) => void
  openDelay?: number
  side?: PopoverContentProps["side"]
  sideOffset?: number
  trigger: React.ReactNode
}

export function HoverPopover({
  align = "center",
  children,
  className,
  closeDelay = CLOSE_DELAY_MS,
  onOpenChange,
  openDelay = OPEN_DELAY_MS,
  side,
  sideOffset,
  trigger,
}: HoverPopoverProps) {
  const [open, setOpen] = useState(false)
  // Pinned lives in a ref, not state: nothing renders from it, and the close
  // timer must read the value at fire time rather than the one it closed over.
  const pinnedRef = useRef(false)
  const timerRef = useRef<number | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => clearTimer, [clearTimer])

  const changeOpen = useCallback(
    (next: boolean) => {
      setOpen(next)
      onOpenChange?.(next)
    },
    [onOpenChange]
  )

  const handlePointerEnter = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType !== "mouse") {
        return
      }
      clearTimer()
      timerRef.current = window.setTimeout(() => changeOpen(true), openDelay)
    },
    [changeOpen, clearTimer, openDelay]
  )

  const handlePointerLeave = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType !== "mouse" || pinnedRef.current) {
        return
      }
      clearTimer()
      timerRef.current = window.setTimeout(() => {
        if (!pinnedRef.current) {
          changeOpen(false)
        }
      }, closeDelay)
    },
    [changeOpen, clearTimer, closeDelay]
  )

  // preventDefault stops Radix's own open-toggle (its trigger composes handlers
  // with checkForDefaultPrevented), so a click pins instead of toggling a card
  // hover already opened.
  const handleTriggerClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault()
      clearTimer()
      const next = !pinnedRef.current
      pinnedRef.current = next
      changeOpen(next)
    },
    [changeOpen, clearTimer]
  )

  // Radix reports outside pointerdown and Escape through here.
  const handleOpenChange = useCallback(
    (next: boolean) => {
      clearTimer()
      pinnedRef.current = next && pinnedRef.current
      changeOpen(next)
    },
    [changeOpen, clearTimer]
  )

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger
        asChild
        onClick={handleTriggerClick}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
      >
        {trigger}
      </PopoverTrigger>
      <PopoverContent
        align={align}
        className={className}
        onOpenAutoFocus={(event) => {
          // Hover must not steal focus; a deliberate click still may.
          if (!pinnedRef.current) {
            event.preventDefault()
          }
        }}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        {...(side == null ? {} : { side })}
        {...(sideOffset == null ? {} : { sideOffset })}
      >
        {children}
      </PopoverContent>
    </Popover>
  )
}
