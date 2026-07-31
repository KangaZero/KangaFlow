"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import type { TranslationKey } from "@/lib/i18n"
import { useLocale } from "@/providers/locale-provider"

// The niri environment's tiling binds (Alt is the compositor modifier). Keys are
// display tokens; the description is an i18n key. Matches the binds handled in
// keymap.ts + environment-view's key capture.
const SHORTCUTS: readonly {
  keys: readonly string[]
  label: TranslationKey
}[] = [
  { keys: ["Alt", "D"], label: "environment.help.launcher" },
  { keys: ["Alt", "↵"], label: "environment.help.terminal" },
  { keys: ["Alt", "Shift", "↵"], label: "environment.help.browser" },
  { keys: ["Alt", "Shift", ","], label: "environment.help.settings" },
  { keys: ["Alt", "Shift", "O"], label: "environment.help.overview" },
  { keys: ["Alt", "H", "L"], label: "environment.help.focusColumn" },
  { keys: ["Alt", "J", "K"], label: "environment.help.focusWindow" },
  { keys: ["Alt", "Shift", "H", "L"], label: "environment.help.moveColumn" },
  { keys: ["Alt", "Shift", "J", "K"], label: "environment.help.moveWindow" },
  { keys: ["Alt", "1–3"], label: "environment.help.workspace" },
  { keys: ["Alt", "Shift", "1–3"], label: "environment.help.moveToWorkspace" },
  { keys: ["Alt", "Shift", "Q"], label: "environment.help.close" },
  { keys: ["Alt", "F"], label: "environment.help.fullscreen" },
  { keys: ["Alt", "Z"], label: "environment.help.centerAlign" },
  { keys: ["Alt", "R"], label: "environment.help.cycleWidth" },
  { keys: ["Alt", "-", "="], label: "environment.help.resize" },
  { keys: ["Alt", "T"], label: "environment.help.float" },
  { keys: ["?"], label: "environment.help.help" },
] as const

// Toggled with `?` inside the niri environment. Follows the site settings dialog
// layout/responsiveness (animate-ui dialog, responsive card grid).
export function NiriHelpDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { translate } = useLocale()
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg md:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{translate("environment.help.title")}</DialogTitle>
          <DialogDescription>
            {translate("environment.help.description")}
          </DialogDescription>
        </DialogHeader>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {SHORTCUTS.map((s) => (
            <li
              className="flex items-center justify-between gap-3 rounded-md border border-border p-3"
              key={s.label}
            >
              <span className="text-sm">{translate(s.label)}</span>
              <KbdGroup>
                {s.keys.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </KbdGroup>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
