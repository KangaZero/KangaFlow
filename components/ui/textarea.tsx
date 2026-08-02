"use client"

import type * as React from "react"
import { useCallback, useRef } from "react"

import { useVimInput } from "@/lib/hooks/use-vim-input"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"

function Textarea({
  className,
  disableVim,
  ref,
  ...props
}: React.ComponentProps<"textarea"> & { disableVim?: boolean }) {
  const { vimMode } = useGlobalStates()
  const innerRef = useRef<HTMLTextAreaElement>(null)
  // Merge our internal ref (the vim hook needs the element) with any caller ref.
  const setRef = useCallback(
    (node: HTMLTextAreaElement | null) => {
      innerRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref)
        (ref as React.RefObject<HTMLTextAreaElement | null>).current = node
    },
    [ref]
  )
  useVimInput(innerRef, { enabled: vimMode && disableVim !== true })

  return (
    <textarea
      className={cn(
        "field-sizing-content flex min-h-16 w-full resize-none rounded-md border border-input bg-input/20 px-2 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 md:text-xs/relaxed dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40",
        className
      )}
      data-slot="textarea"
      ref={setRef}
      {...props}
    />
  )
}

export { Textarea }
