"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog"
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
  const { isTerminalOpen, setIsTerminalOpen, terminalFile } = useGlobalStates()

  return (
    <Dialog onOpenChange={setIsTerminalOpen} open={isTerminalOpen}>
      <DialogContent
        // gap-0: DialogContent's base classes include gap-4, which pushed the
        // zjstatus bar out of the fixed-height dialog (squeezed to 0px).
        className="flex h-[90vh] w-[90vw] max-w-[90vw] flex-col gap-0 overflow-y-hidden p-0 sm:max-w-[90vw]"
        style={{
          background: paletteForTheme(resolvedTheme ?? DEFAULT_THEME).base,
        }}
      >
        <DialogTitle className="sr-only">
          {translate("terminal.title")}
        </DialogTitle>
        {isTerminalOpen ? (
          <TerminalBody
            files={SOURCE_FILES}
            initialFile={terminalFile}
            onClose={() => setIsTerminalOpen(false)}
            routePath={pathname}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
