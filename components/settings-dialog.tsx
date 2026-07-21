"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import {
  DEFAULT_SHORTCUTS,
  formatShortcut,
  IS_MAC,
  type Shortcut,
  shortcutSignature,
} from "@/lib/shortcuts"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// A single modifier rendered as a pressed/unpressed toggle button.
function ModifierToggle({
  ariaLabel,
  label,
  onToggle,
  pressed,
}: {
  ariaLabel: string
  label: string
  onToggle: () => void
  pressed: boolean
}) {
  return (
    <Button
      aria-label={ariaLabel}
      aria-pressed={pressed}
      className="min-w-9 font-mono"
      onClick={onToggle}
      size="sm"
      type="button"
      variant={pressed ? "default" : "outline"}
    >
      {label}
    </Button>
  )
}

// ConfigPane-style shortcut editor in an animate-ui dialog. Bindings live in
// global state (persisted to localStorage); edits apply live. An empty key or a
// modifier-less binding is flagged (bare keys would fire while typing), and
// duplicate combinations are surfaced (both would fire on the same press).
export function SettingsDialog() {
  const { translate } = useLocale()
  const { isSettingsOpen, setIsSettingsOpen, shortcuts, setShortcuts } =
    useGlobalStates()

  const patch = (action: Shortcut["action"], next: Partial<Shortcut>) =>
    setShortcuts(
      shortcuts.map((s) => (s.action === action ? { ...s, ...next } : s))
    )

  const counts = new Map<string, number>()
  for (const s of shortcuts) {
    if (!s.character) continue
    const sig = shortcutSignature(s)
    counts.set(sig, (counts.get(sig) ?? 0) + 1)
  }

  const dirty = JSON.stringify(shortcuts) !== JSON.stringify(DEFAULT_SHORTCUTS)

  const metaLabel = IS_MAC ? "⌘" : "Ctrl"
  const altLabel = IS_MAC ? "⌥" : "Alt"
  const shiftLabel = IS_MAC ? "⇧" : "Shift"

  return (
    <Dialog onOpenChange={setIsSettingsOpen} open={isSettingsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translate("settings.title")}</DialogTitle>
          <DialogDescription>
            {translate("settings.description")}
          </DialogDescription>
        </DialogHeader>

        <ul className="flex flex-col divide-y divide-border">
          {shortcuts.map((s) => {
            const label = translate(`settings.actions.${s.action}`)
            const empty = s.character === ""
            const noModifier = !(s.hasMetaOrCtrlKey || s.hasAltOrOptionKey)
            const duplicate =
              !empty && (counts.get(shortcutSignature(s)) ?? 0) > 1
            const invalid = empty || noModifier || duplicate
            const tokens = formatShortcut(s)

            return (
              <li
                className="flex flex-wrap items-center gap-3 py-3"
                key={s.action}
              >
                <div className="min-w-40 flex-1">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    {translate("settings.currentLabel")}
                    {tokens.length > 0 ? (
                      <KbdGroup>
                        {tokens.map((token) => (
                          <Kbd key={token}>{token}</Kbd>
                        ))}
                      </KbdGroup>
                    ) : (
                      <span>…</span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <ModifierToggle
                    ariaLabel={`${label} — ${metaLabel}`}
                    label={metaLabel}
                    onToggle={() =>
                      patch(s.action, {
                        hasMetaOrCtrlKey: !s.hasMetaOrCtrlKey,
                      })
                    }
                    pressed={s.hasMetaOrCtrlKey}
                  />
                  <ModifierToggle
                    ariaLabel={`${label} — ${altLabel}`}
                    label={altLabel}
                    onToggle={() =>
                      patch(s.action, {
                        hasAltOrOptionKey: !s.hasAltOrOptionKey,
                      })
                    }
                    pressed={s.hasAltOrOptionKey}
                  />
                  <ModifierToggle
                    ariaLabel={`${label} — ${shiftLabel}`}
                    label={shiftLabel}
                    onToggle={() =>
                      patch(s.action, { hasShiftKey: !s.hasShiftKey })
                    }
                    pressed={s.hasShiftKey}
                  />
                  <span className="text-muted-foreground">+</span>
                  <input
                    aria-invalid={invalid}
                    aria-label={`${label} — ${translate("settings.keyLabel")}`}
                    className={cn(
                      "h-9 w-10 rounded-md border bg-background text-center text-sm uppercase focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
                      invalid ? "border-destructive" : "border-input"
                    )}
                    maxLength={1}
                    onChange={(event) =>
                      patch(s.action, {
                        character: event.target.value.slice(-1).toLowerCase(),
                      })
                    }
                    type="text"
                    value={s.character}
                  />
                </div>

                {invalid ? (
                  <p className="w-full text-destructive text-xs" role="alert">
                    {empty
                      ? translate("settings.errors.empty")
                      : noModifier
                        ? translate("settings.errors.noModifier")
                        : translate("settings.errors.duplicate")}
                  </p>
                ) : null}
              </li>
            )
          })}
        </ul>

        <DialogFooter>
          <Button
            disabled={!dirty}
            onClick={() => setShortcuts([...DEFAULT_SHORTCUTS])}
            type="button"
            variant="outline"
          >
            {translate("settings.resetToDefaults")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
