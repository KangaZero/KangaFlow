"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/page-code-button.css"

import { SquareCode } from "lucide-react"
import { useReducedMotion } from "motion/react"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// The terminal (xterm) is a dynamic chunk; start fetching it as soon as the
// button is pointed at or focused, so the click opens it without a network
// wait. import() is cached, so repeat calls are free.
function preloadTerminal(): void {
  void import("@/components/terminal-body")
}

// Floating "view this page's source" affordance (all themes). Opens the terminal
// dialog straight into `nvim` on the given repo file.
export function PageCodeButton({ file }: { file: string }) {
  const { translate } = useLocale()
  const { animationPref, setIsTerminalOpen, setTerminalFile } =
    useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())

  const label = translate("terminal.viewCode")

  return (
    <div className="fixed top-30 left-4 z-30">
      <AnimatedTooltip label={label} side="right">
        <Button
          aria-label={label}
          className="page-code-btn"
          data-reduced={reduced}
          onClick={() => {
            setTerminalFile(file)
            setIsTerminalOpen(true)
          }}
          onFocus={preloadTerminal}
          onPointerEnter={preloadTerminal}
          size="icon"
          variant="ghost"
        >
          <SquareCode />
        </Button>
      </AnimatedTooltip>
    </div>
  )
}
