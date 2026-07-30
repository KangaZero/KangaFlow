"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { LiquidButton } from "@/components/animate-ui/components/buttons/liquid"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog"
import { Switch } from "@/components/animate-ui/components/radix/switch"
import { LocaleTransition } from "@/components/locale-transition"
import { Button } from "@/components/ui/button"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { ANIMATION_PREFS } from "@/lib/globalStates"
import {
  BARE_KEY_ACTIONS,
  DEFAULT_SHORTCUTS,
  formatShortcut,
  IS_MAC,
  type Shortcut,
  shortcutSignature,
} from "@/lib/shortcuts"
import { THEMES } from "@/lib/themes"
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
    <LiquidButton
      aria-label={ariaLabel}
      aria-pressed={pressed}
      className="min-w-9 font-mono"
      defaultPressed={pressed}
      onClick={onToggle}
      size="sm"
      type="button"
    >
      {label}
    </LiquidButton>
  )
}

// ConfigPane-style shortcut editor in an animate-ui dialog. Bindings live in
// global state (persisted to localStorage); edits apply live. An empty key or a
// modifier-less binding is flagged (bare keys would fire while typing), and
// duplicate combinations are surfaced (both would fire on the same press).
export function SettingsDialog() {
  const { translate } = useLocale()
  const {
    isSettingsOpen,
    setIsSettingsOpen,
    shortcuts,
    setShortcuts,
    showChromeInEnvironment,
    setShowChromeInEnvironment,
    animationPref,
    setAnimationPref,
    theme,
    toggleTheme,
  } = useGlobalStates()

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
      <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-lg md:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{translate("settings.title")}</DialogTitle>
          <DialogDescription>
            {translate("settings.description")}
          </DialogDescription>
        </DialogHeader>

        <LocaleTransition variant="fade">
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {shortcuts.map((s) => {
              const label = translate(
                `settings.actions.${s.action}` as "settings.actions.goHome"
              )
              const empty = s.character === ""
              // Bare keys are normally flagged (they'd fire mid-typing), but a
              // few actions (Vimium-style hints) are bare by design.
              const noModifier =
                !(s.hasMetaOrCtrlKey || s.hasAltOrOptionKey) &&
                !BARE_KEY_ACTIONS.has(s.action)
              const duplicate =
                !empty && (counts.get(shortcutSignature(s)) ?? 0) > 1
              const invalid = empty || noModifier || duplicate
              const tokens = formatShortcut(s)

              return (
                <li
                  className="flex flex-wrap items-center gap-3 rounded-md border border-border p-3"
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
        </LocaleTransition>

        <div className="flex items-center justify-between gap-3 border-border border-t py-3">
          <p className="font-medium text-sm">
            {translate("settings.showChromeInEnvironment")}
          </p>
          <Switch
            aria-pressed={showChromeInEnvironment}
            checked={showChromeInEnvironment}
            onClick={() => setShowChromeInEnvironment(!showChromeInEnvironment)}
          />
        </div>

        <div className="flex items-center justify-between gap-3 border-border border-t py-3">
          <p className="font-medium text-sm">{translate("theme.label")}</p>
          <div className="flex items-center gap-1.5">
            {THEMES.map((t) => (
              <Button
                aria-pressed={theme === t}
                key={t}
                onClick={() => void toggleTheme(t)}
                size="sm"
                type="button"
                variant={theme === t ? "default" : "outline"}
              >
                {translate(`theme.${t}`)}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-border border-t py-3">
          <p className="font-medium text-sm">
            {translate("settings.animation")}
          </p>
          <div className="flex items-center gap-1.5">
            {ANIMATION_PREFS.map((pref) => (
              <Button
                aria-pressed={animationPref === pref}
                key={pref}
                onClick={() => setAnimationPref(pref)}
                size="sm"
                type="button"
                variant={animationPref === pref ? "default" : "outline"}
              >
                {pref === "system"
                  ? translate("settings.animationSystem")
                  : pref === "on"
                    ? translate("settings.on")
                    : translate("settings.off")}
              </Button>
            ))}
          </div>
        </div>

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
