"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  AlarmClock,
  Bell,
  CheckCircle2,
  Hourglass,
  Info,
  type LucideIcon,
  Timer as TimerIcon,
  X,
} from "lucide-react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import type * as React from "react"
import { useState } from "react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import type { WidgetId } from "@/components/niri/settings"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import type { NotificationType } from "@/lib/notifications"
import { formatRelativeTime } from "@/lib/notifications"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"
import { useNotifications } from "@/providers/notifications-provider"

const CARD_SPRING = {
  damping: 22,
  mass: 0.8,
  stiffness: 320,
  type: "spring",
} as const

const CONTENT_SPRING = { damping: 26, stiffness: 320, type: "spring" } as const

// Per-type card icon. `info` falls back to the bell.
const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  alarm: AlarmClock,
  info: Info,
  stopwatch: TimerIcon,
  success: CheckCircle2,
  timer: Hourglass,
}

// Snooze presets (minutes) offered on alarm-type notifications, paired with
// their i18n label key.
const SNOOZE_OPTIONS = [
  { key: "notifications.remindIn5", minutes: 5 },
  { key: "notifications.remindIn10", minutes: 10 },
  { key: "notifications.remindIn15", minutes: 15 },
] as const

export function NotificationCenter({
  orientation,
  barPosition,
}: {
  orientation: "horizontal" | "vertical"
  barPosition: "right" | "left" | "top" | "bottom"
}): React.JSX.Element {
  const { translate } = useLocale()
  const { notifications, unreadCount, dismiss, clearAll, markRead, remind } =
    useNotifications()
  const {
    setIsAlarmOpen,
    setIsCalendarOpen,
    setIsMediaPlayerOpen,
    setIsNotesOpen,
  } = useGlobalStates()
  const [open, setOpen] = useState(false)

  // target → widget open-setter, so a card click reveals the right widget.
  const openWidget: Record<WidgetId, (isOpen: boolean) => void> = {
    alarm: setIsAlarmOpen,
    calendar: setIsCalendarOpen,
    media: setIsMediaPlayerOpen,
    notes: setIsNotesOpen,
  }

  const isV = orientation === "vertical"
  const now = Date.now()

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <AnimatedTooltip
        label={translate("environment.bar.notifications")}
        side={barPosition === "left" ? "right" : "left"}
      >
        <PopoverTrigger asChild>
          <Button
            aria-label={translate("environment.bar.notifications")}
            className="relative rounded-full"
            size="icon-sm"
            variant="ghost"
          >
            <Bell />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 font-medium text-[0.5625rem] text-primary-foreground tabular-nums leading-none ring-2 ring-card">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </Button>
        </PopoverTrigger>
      </AnimatedTooltip>

      <PopoverContent
        align="end"
        className="w-80 p-0"
        side={isV ? "right" : "bottom"}
        sideOffset={8}
        transition={CONTENT_SPRING}
      >
        <div className="flex items-center justify-between border-border border-b px-3 py-2">
          <span className="font-semibold text-sm">
            {translate("notifications.title")}
          </span>
          {notifications.length > 0 ? (
            <button
              className="rounded px-1.5 py-0.5 text-muted-foreground text-xs transition-colors hover:text-foreground"
              onClick={clearAll}
              type="button"
            >
              {translate("notifications.clearAll")}
            </button>
          ) : null}
        </div>

        {notifications.length === 0 ? (
          <p className="px-3 py-6 text-center text-muted-foreground text-xs">
            {translate("notifications.empty")}
          </p>
        ) : (
          <div className="max-h-96 space-y-1.5 overflow-y-auto p-2">
            <LayoutGroup>
              <AnimatePresence initial={false}>
                {notifications.map((n) => {
                  const Icon = TYPE_ICON[n.type]
                  const clickable = n.target != null
                  return (
                    <motion.div
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={cn(
                        "flex flex-col gap-1.5 rounded-xl border p-2.5 transition-colors",
                        n.read
                          ? "border-border bg-muted/20"
                          : "border-primary/30 bg-primary/5"
                      )}
                      exit={{ opacity: 0, scale: 0.95, x: -8 }}
                      initial={{ opacity: 0, scale: 0.95, y: 8 }}
                      key={n.id}
                      layout
                      layoutId={n.id}
                      transition={CARD_SPRING}
                    >
                      <div className="flex items-start gap-2.5">
                        {/* biome-ignore lint/a11y/noStaticElementInteractions: the row is a secondary shortcut to open the widget; every action is also reachable via the dedicated buttons. */}
                        {/* biome-ignore lint/a11y/useKeyWithClickEvents: same — keyboard users reach the widget through the launcher/settings, this is a pointer affordance only. */}
                        <div
                          className={cn(
                            "flex flex-1 items-start gap-2.5 text-left",
                            clickable && "cursor-pointer"
                          )}
                          onClick={
                            clickable
                              ? () => {
                                  if (n.target != null) {
                                    openWidget[n.target](true)
                                  }
                                  markRead(n.id)
                                  setOpen(false)
                                }
                              : undefined
                          }
                        >
                          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                            <Icon className="size-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="break-words text-sm leading-snug">
                              {n.message}
                            </p>
                            <span className="text-[0.6875rem] text-muted-foreground tabular-nums">
                              {formatRelativeTime(n.createdAt, now)}
                            </span>
                          </div>
                        </div>
                        <motion.button
                          aria-label={translate("notifications.dismiss")}
                          className="rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                          onClick={() => dismiss(n.id)}
                          transition={CARD_SPRING}
                          type="button"
                          whileTap={{ scale: 0.8 }}
                        >
                          <X className="size-3.5" />
                        </motion.button>
                      </div>

                      {n.type === "alarm" ? (
                        <div className="flex items-center gap-1 pl-9">
                          <span className="text-[0.6875rem] text-muted-foreground">
                            {translate("notifications.remindMe")}
                          </span>
                          {SNOOZE_OPTIONS.map((opt) => (
                            <button
                              className="rounded-md border border-border bg-muted/40 px-1.5 py-0.5 text-[0.6875rem] transition-colors hover:bg-muted"
                              key={opt.minutes}
                              onClick={() => {
                                remind(opt.minutes, n.message, n.target, n.type)
                                dismiss(n.id)
                              }}
                              type="button"
                            >
                              {translate(opt.key)}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </LayoutGroup>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
