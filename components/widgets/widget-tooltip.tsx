"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Calm tooltip for environment widgets. The site-wide AnimatedTooltip carries
// the rebel/ransom styling, which the desktop environment deliberately avoids;
// this wraps the shadcn (Radix) tooltip with the same `label` / `side` props so
// widget call sites stay one-line swaps.

import type * as React from "react"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Z_LAYERS } from "@/lib/z-order"

export function WidgetTooltip({
  label,
  side = "top",
  children,
}: {
  label: string
  side?: "top" | "bottom" | "left" | "right"
  children: React.ReactElement
}): React.JSX.Element {
  return (
    <TooltipProvider delayDuration={350}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        {/* Above the window band: floating widgets stack well over z-50. */}
        <TooltipContent
          side={side}
          sideOffset={6}
          style={{ zIndex: Z_LAYERS.popover }}
        >
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
