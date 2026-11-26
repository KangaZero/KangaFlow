"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/terminal-dialog.css"

import { useReducedMotion } from "motion/react"
import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog"
import { EscCloseLabel } from "@/components/ui/esc-close-label"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { SOURCE_FILES } from "@/lib/terminal/source"
import { paletteForTheme } from "@/lib/terminal/theme"
import { DEFAULT_THEME } from "@/lib/themes"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// xterm reaches for `document` at import time, so the body is loaded client-only
// (ssr:false) — allowed here because this shell is itself a client component. The
// shell stays prerender-safe (only Dialog + a title) and pulls in xterm on open.
const TerminalBody = dynamic(
  () => import("@/components/terminal-body").then((m) => m.TerminalBody),
  { ssr: false }
)

export function TerminalDialog() {
  const { translate } = useLocale()
  const { resolvedTheme } = useTheme()
  const pathname = usePathname()
  const { animationPref, isTerminalOpen, setIsTerminalOpen, terminalFile } =
    useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const title = translate("terminal.title")

  return (
    <Dialog onOpenChange={setIsTerminalOpen} open={isTerminalOpen}>
      <DialogContent
        // gap-0: DialogContent's base classes include gap-4, which pushed the
        // zjstatus bar out of the fixed-height dialog (squeezed to 0px).
        className="terminal-dialog flex h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-0 overflow-y-hidden p-0 sm:max-w-[90vw]"
        data-reduced={reduced}
        showCloseButton={false}
        style={{
          background: paletteForTheme(resolvedTheme ?? DEFAULT_THEME).base,
        }}
      >
        {/* The real title stays sr-only and always mounted: TerminalBody loads
            lazily, so a title rendered inside it would be missing on the first
            frames. The visible tab below is a decorative copy. */}
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogClose
          aria-label={translate("terminal.closeLabel")}
          className="esc-close terminal-dialog__close"
        >
          <EscCloseLabel />
        </DialogClose>
        {isTerminalOpen ? (
          <TerminalBody
            files={SOURCE_FILES}
            initialFile={terminalFile}
            onClose={() => setIsTerminalOpen(false)}
            routePath={pathname}
            titleSlot={
              <span aria-hidden="true" className="terminal-dialog__tab">
                {title}
              </span>
            }
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
