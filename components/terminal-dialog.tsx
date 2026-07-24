"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import dynamic from "next/dynamic"
import { useTheme } from "next-themes"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog"
import { paletteForTheme } from "@/lib/terminal/theme"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// xterm reaches for `document` at import time, so the body is loaded client-only
// (ssr:false) — allowed here because this shell is itself a client component. The
// shell stays prerender-safe (only Dialog + a title) and pulls in xterm on open.
const TerminalBody = dynamic(
  () => import("@/components/terminal-body").then((m) => m.TerminalBody),
  { ssr: false }
)

export function TerminalDialog({ files }: { files: Record<string, string> }) {
  const { translate } = useLocale()
  const { resolvedTheme } = useTheme()
  const { isTerminalOpen, setIsTerminalOpen, terminalFile } = useGlobalStates()

  return (
    <Dialog onOpenChange={setIsTerminalOpen} open={isTerminalOpen}>
      <DialogContent
        className="flex h-[90vh] w-[90vw] max-w-[90vw] flex-col overflow-y-hidden p-0 sm:max-w-[90vw]"
        style={{ background: paletteForTheme(resolvedTheme).base }}
      >
        <DialogTitle className="sr-only">
          {translate("terminal.title")}
        </DialogTitle>
        {isTerminalOpen ? (
          <TerminalBody
            files={files}
            initialFile={terminalFile}
            onClose={() => setIsTerminalOpen(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
