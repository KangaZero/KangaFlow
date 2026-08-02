"use client"

import type * as React from "react"
import { useCallback, useRef } from "react"

import { useVimInput } from "@/lib/hooks/use-vim-input"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"

// Modal vim editing applies only to free-text inputs; pickers/toggles (time,
// number, color, checkbox, file…) and an explicit `disableVim` opt out. Vim is
// still gated behind the global `vimMode` setting, so this is inert by default.
const VIM_INPUT_TYPES = new Set<string | undefined>([
  undefined,
  "email",
  "search",
  "tel",
  "text",
  "url",
])

function Input({
  className,
  disableVim,
  ref,
  type,
  ...props
}: React.ComponentProps<"input"> & { disableVim?: boolean }) {
  const { vimMode } = useGlobalStates()
  const innerRef = useRef<HTMLInputElement>(null)
  // Merge our internal ref (the vim hook needs the element) with any caller ref.
  const setRef = useCallback(
    (node: HTMLInputElement | null) => {
      innerRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref)
        (ref as React.RefObject<HTMLInputElement | null>).current = node
    },
    [ref]
  )
  useVimInput(innerRef, {
    enabled: vimMode && disableVim !== true && VIM_INPUT_TYPES.has(type),
  })

  return (
    <input
      className={cn(
        "h-7 w-full min-w-0 rounded-md border border-input bg-input/20 px-2 py-0.5 text-sm outline-none transition-colors file:inline-flex file:h-6 file:border-0 file:bg-transparent file:font-medium file:text-foreground file:text-xs/relaxed placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      data-slot="input"
      ref={setRef}
      type={type}
      {...props}
    />
  )
}

export { Input }
