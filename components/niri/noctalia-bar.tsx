"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Image as ImageIcon, Settings } from "lucide-react"
import type * as React from "react"
import { SiNixos } from "react-icons/si"
import { Counter } from "@/components/Counter"
import { MediaMiniPill } from "@/components/niri/media-mini-pill"
import { NotificationCenter } from "@/components/niri/notification-center"
import type { BorderRadius } from "@/components/niri/settings"
import { SystemStatus } from "@/components/niri/system-status"
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

// Same circle-reveal CSS as site-header's PillHover.
const CIRCLE_REVEAL =
  "origin-bottom scale-0 transition-transform duration-300 ease-out group-hover:scale-100"

// Daiji (大字) — traditional formal Japanese numerals shown on hover.
const DAIJI: Record<number, string> = {
  1: "壱",
  2: "弐",
  3: "参",
  4: "肆",
  5: "伍",
  6: "陸",
  7: "柒",
  8: "捌",
  9: "玖",
  10: "拾",
}
// Clock built on the react-bits Counter — "HH:MM" split into two fixed-2-digit
// rolling counters. Falls back to plain text if the format is unexpected.
function BarClock({
  time,
  vertical = false,
}: {
  time: string
  vertical?: boolean
}): React.JSX.Element {
  const [h, m] = time.split(":")
  const hours = Number(h)
  const minutes = Number(m)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return <span className="text-muted-foreground tabular-nums">{time}</span>
  }
  return (
    <span
      className={cn(
        "flex items-center text-muted-foreground tabular-nums",
        vertical && "flex-col"
      )}
    >
      <Counter
        fontSize={13}
        gap={0}
        gradientHeight={0}
        horizontalPadding={0}
        places={[10, 1]}
        value={hours}
        vertical={vertical}
      />
      <span>:</span>
      <Counter
        fontSize={13}
        gap={0}
        gradientHeight={0}
        horizontalPadding={0}
        places={[10, 1]}
        value={minutes}
        vertical={vertical}
      />
    </span>
  )
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
  barRadius: BorderRadius // bar corner radius in px, from settings.barRadius
  orientation: "horizontal" | "vertical" // layout axis (vertical = left/right bar)
  barPosition: "bottom" | "left" | "right" | "top"
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
    barRadius,
    orientation,
    barPosition,
  } = props
  const { translate, setLocale } = useLocale()
  const isV = orientation === "vertical"
  const otherLayout = keyboardLayout === "en" ? "ja" : "en"

  return (
    <header
      className={cn(
        "flex justify-between gap-3 border border-border px-2 py-1.5 text-foreground text-xs shadow-lg backdrop-blur",
        isV ? "h-full flex-col items-center" : "items-center"
      )}
      style={{
        backgroundColor: `color-mix(in oklch, var(--card) ${Math.round(opacity * 100)}%, transparent)`,
        borderRadius: `${barRadius}px`,
      }}
    >
      {/* LEFT: launcher logo + active window title */}
      {/* TODO(human): derive every bar tooltip's side from barPosition
          (left→right, right→left, top→bottom, bottom→top) via one helper,
          instead of the per-tooltip left/right ternaries below. */}
      <div className={cn("flex min-w-0 items-center gap-2", isV && "flex-col")}>
        <AnimatedTooltip
          label={translate("environment.bar.launcher")}
          shortcut={["Alt", "D"]}
          side={barPosition !== "right" ? "right" : "left"}
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
        <span
          className={cn(
            "truncate text-muted-foreground",
            isV ? "max-h-36.25 [writing-mode:vertical-rl]" : "max-w-36.25"
          )}
        >
          {activeWindowTitle === "" ? "—" : activeWindowTitle}
        </span>
      </div>

      {/* CENTER: workspace pills, clock, settings, keyboard-layout badge */}
      <div className={cn("flex items-center gap-2", isV && "flex-col")}>
        <ul className={cn("flex items-center gap-1", isV && "flex-col")}>
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <button
                aria-label={`${translate("environment.bar.workspace")} ${ws.id}`}
                className={cn(
                  "group relative flex size-5 items-center justify-center overflow-hidden rounded-full text-[0.625rem] tabular-nums leading-none transition-colors",
                  ws.active
                    ? "bg-primary text-primary-foreground"
                    : ws.occupied
                      ? "bg-muted text-foreground"
                      : "border border-border/50 bg-transparent text-muted-foreground"
                )}
                onClick={() => onWorkspace(ws.id)}
                type="button"
              >
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute bottom-0 left-1/2 aspect-square w-[140%] -translate-x-1/2 rounded-full bg-primary",
                    CIRCLE_REVEAL
                  )}
                />
                <span className="relative z-10 grid place-items-center">
                  <span className="col-start-1 row-start-1 transition-transform duration-300 ease-out group-hover:translate-y-[-150%]">
                    {ws.id}
                  </span>
                  <span
                    aria-hidden
                    className="col-start-1 row-start-1 translate-y-[150%] text-primary-foreground transition-transform duration-300 ease-out group-hover:translate-y-0"
                  >
                    {DAIJI[ws.id] ?? String(ws.id)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
        <BarClock time={clock} vertical={isV} />
        <MediaMiniPill
          barPosition={barPosition}
          barRadius={barRadius}
          vertical={isV}
        />
        <button
          aria-label={`${translate("nav.language")} → ${otherLayout.toUpperCase()}`}
          className={cn(
            "group relative overflow-hidden rounded-sm border border-border/50 p-1 font-mono text-[0.625rem] text-muted-foreground uppercase leading-none transition-colors hover:border-primary",
            isV && "[writing-mode:vertical-rl]"
          )}
          onClick={() => setLocale(otherLayout)}
          type="button"
        >
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute bottom-0 left-1/2 aspect-square w-[140%] -translate-x-1/2 bg-primary",
              CIRCLE_REVEAL
            )}
          />
          <span className="relative z-10 grid place-items-center">
            <span className="col-start-1 row-start-1 transition-transform duration-300 ease-out group-hover:translate-y-[-150%]">
              {keyboardLayout}
            </span>
            <span
              aria-hidden
              className="col-start-1 row-start-1 translate-y-[150%] text-primary-foreground transition-transform duration-300 ease-out group-hover:translate-y-0"
            >
              {otherLayout}
            </span>
          </span>
        </button>
      </div>

      {/* RIGHT: faux system monitor + notification bell */}
      <div className={cn("flex items-center gap-2", isV && "flex-col")}>
        <SystemStatus vertical={isV} />
        <AnimatedTooltip
          label={translate("environment.settings.wallpaper")}
          side={barPosition === "left" ? "right" : "left"}
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
          side={barPosition === "left" ? "right" : "left"}
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
        <NotificationCenter
          barPosition={barPosition}
          orientation={orientation}
        />
      </div>
    </header>
  )
}
