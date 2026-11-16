"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Quiet, native-feeling tooltip for the environment top bar. The site-wide
// AnimatedTooltip carries the rebel/ransom styling, which the desktop
// environment deliberately avoids. Small glass label, opens after 400ms on
// hover and instantly on keyboard focus (Radix behaviour), optional shortcut
// chips, and it always opens AWAY from the screen edge the bar sits on.

import { Tooltip as TooltipPrimitive } from "radix-ui"
import type * as React from "react"

import type { TooltipSide } from "@/lib/niri-bar"
import { Z_LAYERS } from "@/lib/z-order"

export { barTooltipSide } from "@/lib/niri-bar"

export function BarTooltip({
  label,
  shortcut,
  side,
  children,
}: {
  label: string
  shortcut?: readonly string[] | undefined
  side: TooltipSide
  children: React.ReactElement
}): React.JSX.Element {
  return (
    <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={200}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="border-border/60 bg-card/90 text-foreground data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-closed:animate-out data-closed:fade-out-0 inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] leading-tight font-medium shadow-[0_6px_16px_-8px_rgb(0_0_0/0.45)] backdrop-blur-md"
            collisionPadding={8}
            side={side}
            sideOffset={8}
            style={{ zIndex: Z_LAYERS.popover }}
          >
            {label}
            {shortcut?.map((key) => (
              <kbd
                className="bg-foreground/8 text-muted-foreground rounded-[4px] px-1 py-0.5 font-mono text-[9.5px] leading-none font-semibold"
                key={key}
              >
                {key}
              </kbd>
            ))}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
