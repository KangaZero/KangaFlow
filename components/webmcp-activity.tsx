"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Bot } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"

import { isReducedMotion } from "@/lib/isReducedMotion"
import type { WebMcpToolName } from "@/lib/webmcp"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

/**
 * A small pill that names the tool a browser AI agent is running right now,
 * so a visitor can tell the page is being driven rather than glitching. The
 * live region sits outside AnimatePresence: it must exist BEFORE its text
 * changes, or screen readers never announce the update.
 */
export function WebMcpActivity({ tool }: { tool: WebMcpToolName | null }) {
  const { translate } = useLocale()
  const { animationPref } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 sm:bottom-6"
      role="status"
    >
      <AnimatePresence>
        {tool ? (
          <motion.p
            animate={{ opacity: 1, y: 0 }}
            className="bg-popover text-popover-foreground border-border flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-xs shadow-md"
            exit={{ opacity: 0, y: 6 }}
            initial={reduced ? false : { opacity: 0, y: 6 }}
            // One stable key: back-to-back calls swap the label in place
            // instead of stacking an exiting pill per tool.
            key="webmcp-activity"
            transition={{ duration: reduced ? 0 : 0.2 }}
          >
            <Bot aria-hidden="true" className="text-primary size-3.5" />
            <span className="text-muted-foreground">
              {translate("webmcp.activity")}
            </span>
            <span>{translate(`webmcp.tools.${tool}`)}</span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
