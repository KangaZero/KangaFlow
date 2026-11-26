"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import "@/components/niri/noctalia-bar.css"

import { Image as ImageIcon, Settings } from "lucide-react"
import { LayoutGroup, motion } from "motion/react"
import type * as React from "react"
import { SiNixos } from "react-icons/si"
import { Counter } from "@/components/Counter"
import { BAR_ICON_BUTTON } from "@/components/niri/bar-styles"
import { BarTooltip, barTooltipSide } from "@/components/niri/bar-tooltip"
import { MediaMiniPill } from "@/components/niri/media-mini-pill"
import { NotificationCenter } from "@/components/niri/notification-center"
import { type BorderRadius, DAIJI } from "@/components/niri/settings"
import { SystemStatus } from "@/components/niri/system-status"
import type { Locale } from "@/lib/i18n"
import { SPRING_PILL } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"
import { useNotifications } from "@/providers/notifications-provider"

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

// Titles longer than this fade out at the end instead of being cut hard.
const TITLE_FADE_FROM = 28

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
    return (
      <span
        className="text-foreground font-medium tabular-nums"
        data-env-part="clock"
      >
        {time}
      </span>
    )
  }
  return (
    <span
      aria-label={time}
      className={cn(
        "text-foreground flex items-center font-medium tabular-nums",
        vertical && "flex-col"
      )}
      data-env-part="clock"
      role="img"
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
      {vertical ? null : (
        <span aria-hidden className="text-muted-foreground mx-px">
          :
        </span>
      )}
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

// Hairline divider between bar groups (rotates for vertical bars).
function BarSeparator({ vertical }: { vertical: boolean }): React.JSX.Element {
  return (
    <span
      aria-hidden
      className={cn(
        "bg-foreground/10 shrink-0",
        vertical ? "h-px w-4" : "h-4 w-px"
      )}
      data-env-part="bar-sep"
    />
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
  const { notify } = useNotifications()
  const isV = orientation === "vertical"
  const otherLayout = keyboardLayout === "en" ? "ja" : "en"
  // Every bar tooltip opens toward the desktop (one helper, no per-call ternaries).
  const tipSide = barTooltipSide(barPosition)
  const title = activeWindowTitle === "" ? "—" : activeWindowTitle

  function switchLocale(): void {
    setLocale(otherLayout)
    notify(
      translate(
        otherLayout === "en"
          ? "notifications.localeSwitchedToEn"
          : "notifications.localeSwitchedToJa"
      )
    )
  }

  return (
    <header
      className={cn(
        "noctalia-bar glass-ink text-foreground rounded-(--env-radius) bg-[color-mix(in_oklch,var(--card)_var(--env-bar-alpha),transparent)] text-xs backdrop-blur-md backdrop-saturate-150",
        isV
          ? "flex h-full w-11 flex-col items-center justify-between gap-3 py-2"
          : // 1fr · auto · 1fr keeps the workspace cluster centred whatever the
            // side groups' widths; the right column never shrinks below its
            // content, so the title side absorbs any squeeze.
            "grid h-10 grid-cols-[minmax(0,1fr)_auto_minmax(max-content,1fr)] items-center gap-4 px-2"
      )}
      // Radius and opacity as variables, not inline border-radius/background:
      // an inline style would beat the KangaFlow skin (skin-kangaflow.css).
      data-edge={barPosition}
      data-env-surface="bar"
      style={
        {
          "--env-bar-alpha": `${Math.round(opacity * 100)}%`,
          "--env-radius": `${barRadius}px`,
        } as React.CSSProperties
      }
    >
      {/* LEFT: launcher logo + active window title */}
      <div className={cn("flex min-w-0 items-center gap-2", isV && "flex-col")}>
        <BarTooltip
          label={translate("environment.bar.launcher")}
          shortcut={["Alt", "D"]}
          side={tipSide}
        >
          <button
            aria-label={translate("environment.bar.launcher")}
            className={cn(
              BAR_ICON_BUTTON,
              "text-primary-ink hover:text-primary-ink"
            )}
            data-env-part="bar-launcher"
            onClick={onLauncher}
            type="button"
          >
            <SiNixos />
          </button>
        </BarTooltip>
        <span
          className={cn(
            "text-muted-foreground truncate",
            isV ? "max-h-30 [writing-mode:vertical-rl]" : "max-w-55",
            title.length > TITLE_FADE_FROM && "bar-title-fade text-clip"
          )}
          data-env-part="bar-title"
          data-vertical={isV}
          title={activeWindowTitle === "" ? undefined : activeWindowTitle}
        >
          {title}
        </span>
      </div>

      {/* CENTER: workspace pills, clock, keyboard-layout badge */}
      <div className={cn("flex items-center gap-3", isV && "flex-col")}>
        <LayoutGroup id={`bar-workspaces-${barPosition}`}>
          <ul className={cn("flex items-center gap-1", isV && "flex-col")}>
            {workspaces.map((ws) => (
              // `layout="position"`: when the active pip widens, its
              // neighbours slide over (transform) instead of jumping.
              <motion.li key={ws.id} layout="position" transition={SPRING_PILL}>
                <button
                  aria-current={ws.active ? "true" : undefined}
                  aria-label={`${translate("environment.bar.workspace")} ${ws.id}`}
                  className={cn(
                    "group focus-visible:ring-primary focus-visible:ring-offset-card relative flex items-center justify-center overflow-hidden rounded-full text-[0.625rem] leading-none tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    // The active pip is wider, so it reads without relying on colour.
                    ws.active ? (isV ? "h-7.5 w-5" : "h-5 w-7.5") : "size-5",
                    ws.active
                      ? "text-primary-foreground"
                      : ws.occupied
                        ? "bg-foreground/10 text-foreground"
                        : "text-muted-foreground shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_16%,transparent)]"
                  )}
                  data-env-part="pill"
                  onClick={() => onWorkspace(ws.id)}
                  type="button"
                >
                  {ws.active ? (
                    // One highlight shared via layoutId: it glides to the
                    // newly focused workspace instead of blinking.
                    <motion.span
                      aria-hidden
                      className="bg-primary pointer-events-none absolute inset-0 rounded-full shadow-[0_2px_8px_-3px_var(--primary)]"
                      data-env-part="pill-fill"
                      layoutId="bar-active-workspace"
                      transition={SPRING_PILL}
                    />
                  ) : null}
                  <span
                    aria-hidden
                    className={cn(
                      "bg-primary pointer-events-none absolute bottom-0 left-1/2 aspect-square w-[140%] -translate-x-1/2 rounded-full",
                      CIRCLE_REVEAL
                    )}
                  />
                  <span className="relative z-10 grid place-items-center">
                    <span className="col-start-1 row-start-1 transition-transform duration-300 ease-out group-hover:translate-y-[-150%]">
                      {ws.id}
                    </span>
                    <span
                      aria-hidden
                      // Transparent until hover too: in a vertical bar the active pip is
                      // taller, so a translate alone would let the 大字 peek out.
                      className="text-primary-foreground col-start-1 row-start-1 translate-y-[150%] opacity-0 transition-[transform,opacity] duration-300 ease-out group-hover:translate-y-0 group-hover:opacity-100"
                    >
                      {DAIJI[ws.id] ?? String(ws.id)}
                    </span>
                  </span>
                </button>
              </motion.li>
            ))}
          </ul>
        </LayoutGroup>
        <BarClock time={clock} vertical={isV} />
        <button
          aria-label={`${translate("nav.language")} → ${otherLayout.toUpperCase()}`}
          className={cn(
            "group text-muted-foreground focus-visible:ring-primary focus-visible:ring-offset-card relative grid place-items-center overflow-hidden rounded-[5px] font-mono text-[0.625rem] leading-none font-semibold uppercase shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_14%,transparent)] transition-shadow outline-none hover:shadow-[inset_0_0_0_1px_var(--primary)] focus-visible:ring-2 focus-visible:ring-offset-2",
            isV
              ? "min-h-5.5 w-5 py-1.25 [writing-mode:vertical-rl]"
              : "h-5 min-w-5.5 px-1.25"
          )}
          data-env-part="bar-kbl"
          onClick={switchLocale}
          type="button"
        >
          <span
            aria-hidden
            className={cn(
              "bg-primary pointer-events-none absolute bottom-0 left-1/2 aspect-square w-[140%] -translate-x-1/2",
              CIRCLE_REVEAL
            )}
          />
          <span className="relative z-10 grid place-items-center">
            <span
              className={cn(
                "col-start-1 row-start-1 transition-transform duration-300 ease-out",
                isV
                  ? "group-hover:translate-x-[-150%]"
                  : "group-hover:translate-y-[-150%]"
              )}
            >
              {keyboardLayout}
            </span>
            <span
              aria-hidden
              className={cn(
                "text-primary-foreground col-start-1 row-start-1 transition-transform duration-300 ease-out group-hover:translate-x-0 group-hover:translate-y-0",
                isV ? "translate-x-[150%]" : "translate-y-[150%]"
              )}
            >
              {otherLayout}
            </span>
          </span>
        </button>
      </div>

      {/* RIGHT: media control (in flow), system status, wallpaper, settings, bell */}
      <div
        className={cn(
          "flex items-center gap-2",
          isV ? "flex-col" : "justify-self-end"
        )}
      >
        <MediaMiniPill
          barPosition={barPosition}
          barRadius={barRadius}
          vertical={isV}
        />
        <BarSeparator vertical={isV} />
        <SystemStatus vertical={isV} />
        <BarTooltip
          label={translate("environment.settings.wallpaper")}
          side={tipSide}
        >
          <button
            aria-label={translate("environment.settings.wallpaper")}
            className={BAR_ICON_BUTTON}
            data-env-part="bar-btn"
            onClick={onWallpaper}
            type="button"
          >
            <ImageIcon />
          </button>
        </BarTooltip>
        <BarTooltip
          label={translate("environment.settings.title")}
          shortcut={["Alt", "Shift", ","]}
          side={tipSide}
        >
          <button
            aria-label={translate("environment.settings.title")}
            className={BAR_ICON_BUTTON}
            data-env-part="bar-btn"
            onClick={onSettings}
            type="button"
          >
            <Settings />
          </button>
        </BarTooltip>
        <NotificationCenter
          barPosition={barPosition}
          orientation={orientation}
        />
      </div>
    </header>
  )
}
