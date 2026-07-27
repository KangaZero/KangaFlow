"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Bell, Settings, Squirrel } from "lucide-react"
import type * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// A single workspace indicator ("pip"): whether it holds windows and whether it
// is the focused workspace. Purely presentational — the bar never owns this
// state, it renders whatever the parent hands down.
type WorkspacePip = { id: number; occupied: boolean; active: boolean }

// Presentational recreation of the Noctalia v5 floating top bar for the web
// niri desktop. No timers, no fetching, no internal state — every value is a
// prop, so the parent (the niri view) stays the single source of truth. All
// colours come from the site's theme tokens, so it adapts to light/dark/
// terminal without any hardcoded hex.
export function NoctaliaBar(props: {
  workspaces: WorkspacePip[]
  activeWindowTitle: string
  clock: string // preformatted "HH:MM"
  onLauncher: () => void // distro-logo click opens launcher
}): React.JSX.Element {
  const { workspaces, activeWindowTitle, clock, onLauncher } = props

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3",
        "rounded-xl border border-border bg-card/80 px-2 py-1.5 shadow-lg backdrop-blur",
        "text-foreground text-xs"
      )}
    >
      {/* LEFT: launcher logo + active window title */}
      <div className="flex min-w-0 items-center gap-2">
        <Button
          aria-label="Launcher"
          className="rounded-full"
          onClick={onLauncher}
          size="icon-sm"
          variant="ghost"
        >
          <Squirrel />
        </Button>
        <span className="max-w-[145px] truncate text-muted-foreground">
          {activeWindowTitle === "" ? "—" : activeWindowTitle}
        </span>
      </div>

      {/* CENTER: workspace pills, clock, settings, keyboard-layout badge */}
      <div className="flex items-center gap-2">
        <ul className="flex items-center gap-1">
          {workspaces.map((ws) => (
            <li key={ws.id}>
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[0.625rem] tabular-nums leading-none",
                  ws.active
                    ? "bg-primary text-primary-foreground"
                    : ws.occupied
                      ? "bg-muted text-foreground"
                      : "border border-border/50 bg-transparent text-muted-foreground"
                )}
              >
                {ws.id}
              </span>
            </li>
          ))}
        </ul>
        <span className="text-muted-foreground tabular-nums">{clock}</span>
        <Settings aria-hidden className="size-3.5 text-muted-foreground" />
        <span className="rounded-sm border border-border/50 px-1 py-0.5 font-mono text-[0.625rem] text-muted-foreground leading-none">
          US
        </span>
      </div>

      {/* RIGHT: faux system monitor + notification bell */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-muted-foreground tabular-nums">
          CPU 12% MEM 43%
        </span>
        <Button
          aria-label="Notifications"
          className="rounded-full"
          size="icon-sm"
          variant="ghost"
        >
          <Bell />
        </Button>
      </div>
    </header>
  )
}
