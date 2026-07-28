"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Bell, Image as ImageIcon, Settings } from "lucide-react"
import type * as React from "react"
import { SiNixos } from "react-icons/si"

import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import type { Locale } from "@/lib/i18n"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

// A single workspace indicator ("pip"): whether it holds windows and whether it
// is the focused workspace. Purely presentational — the bar never owns this
// state, it renders whatever the parent hands down.
type WorkspacePip = {
  id: number
  occupied: boolean
  active: boolean
}
// Presentational recreation of the Noctalia v5 floating top bar for the web
// niri desktop. No timers, no fetching, no internal state — every value is a
// prop, so the parent (the niri view) stays the single source of truth. All
// colours come from the site's theme tokens, so it adapts to light/dark/
// terminal without any hardcoded hex.
export function NoctaliaBar(props: {
  workspaces: WorkspacePip[]
  activeWindowTitle: string
  clock: string // preformatted "HH:MM"
  keyboardLayout: Locale // e.g. "US" / "JA", synced to the locale
  onLauncher: () => void // distro-logo click opens launcher
  onWorkspace: (id: number) => void // click a pip to switch workspace
  onWallpaper: () => void // wallpaper button opens the wallpaper dialog
  onSettings: () => void // settings button opens the settings window
  opacity: number // bar background opacity (0..1), from settings.barOpacity
}): React.JSX.Element {
  const {
    workspaces,
    activeWindowTitle,
    clock,
    keyboardLayout,
    onLauncher,
    onWorkspace,
    onWallpaper,
    onSettings,
    opacity,
  } = props
  const { translate } = useLocale()

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3",
        "rounded-xl border border-border px-2 py-1.5 shadow-lg backdrop-blur",
        "text-foreground text-xs"
      )}
      style={{
        backgroundColor: `color-mix(in oklch, var(--card) ${Math.round(opacity * 100)}%, transparent)`,
      }}
    >
      {/* LEFT: launcher logo + active window title */}
      <div className="flex min-w-0 items-center gap-2">
        <AnimatedTooltip
          label={translate("environment.bar.launcher")}
          shortcut={["Alt", "D"]}
          side="responsive"
        >
          <Button
            aria-label={translate("environment.bar.launcher")}
            className="rounded-full"
            onClick={onLauncher}
            size="icon-sm"
            variant="ghost"
          >
            <SiNixos />
          </Button>
        </AnimatedTooltip>
        <span className="max-w-36.25 truncate text-muted-foreground">
          {activeWindowTitle === "" ? "—" : activeWindowTitle}
        </span>
      </div>

      {/* CENTER: workspace pills, clock, settings, keyboard-layout badge */}
      <div className="flex items-center gap-2">
        <ul className="flex items-center gap-1">
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <button
                aria-label={`${translate("environment.bar.workspace")} ${ws.id}`}
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[0.625rem] tabular-nums leading-none transition-colors",
                  ws.active
                    ? "bg-primary text-primary-foreground"
                    : ws.occupied
                      ? "bg-muted text-foreground hover:bg-muted/70"
                      : "border border-border/50 bg-transparent text-muted-foreground hover:bg-muted/40"
                )}
                onClick={() => onWorkspace(ws.id)}
                type="button"
              >
                {ws.id}
              </button>
            </li>
          ))}
        </ul>
        <span className="text-muted-foreground tabular-nums">{clock}</span>
        <span className="rounded-sm border border-border/50 px-1 py-0.5 font-mono text-[0.625rem] text-muted-foreground uppercase leading-none">
          {keyboardLayout}
        </span>
      </div>

      {/* RIGHT: faux system monitor + notification bell */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-muted-foreground tabular-nums">
          CPU 12% MEM 43%
        </span>
        <AnimatedTooltip
          label={translate("environment.settings.wallpaper")}
          side="responsive"
        >
          <Button
            aria-label={translate("environment.settings.wallpaper")}
            className="rounded-full"
            onClick={onWallpaper}
            size="icon-sm"
            variant="ghost"
          >
            <ImageIcon />
          </Button>
        </AnimatedTooltip>
        <AnimatedTooltip
          label={translate("environment.settings.title")}
          shortcut={["Alt", "Shift", ","]}
          side="responsive"
        >
          <Button
            aria-label={translate("environment.settings.title")}
            className="rounded-full"
            onClick={onSettings}
            size="icon-sm"
            variant="ghost"
          >
            <Settings />
          </Button>
        </AnimatedTooltip>
        <AnimatedTooltip
          label={translate("environment.bar.notifications")}
          side="responsive"
        >
          <Button
            aria-label={translate("environment.bar.notifications")}
            className="rounded-full"
            size="icon-sm"
            variant="ghost"
          >
            <Bell />
          </Button>
        </AnimatedTooltip>
      </div>
    </header>
  )
}
