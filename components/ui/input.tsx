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
        "border-input bg-input/20 file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 h-7 w-full min-w-0 rounded-md border px-2 py-0.5 text-sm transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-xs/relaxed file:font-medium focus-visible:ring-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-2 md:text-xs/relaxed",
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
