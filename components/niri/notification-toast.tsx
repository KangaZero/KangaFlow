"use client"

import { AlertCircle, Bell, CheckCircle, Clock, Timer, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import type * as React from "react"
import { useCallback, useEffect, useRef, useState } from "react"
import { GLASS_SURFACE } from "@/components/niri/glass"
import type { ToastPosition } from "@/components/niri/settings"
import type { NotificationType } from "@/lib/notifications"
import { cn } from "@/lib/utils"
import { Z_LAYERS } from "@/lib/z-order"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useNotifications } from "@/providers/notifications-provider"

type ActiveToast = {
  id: string
  message: string
  type: NotificationType
  expiresAt: number
}

const TYPE_ICON: Record<
  NotificationType,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" }>
> = {
  alarm: AlertCircle,
  info: Bell,
  stopwatch: Clock,
  success: CheckCircle,
  timer: Timer,
}

const TYPE_COLOR: Record<NotificationType, string> = {
  alarm: "text-rose-500",
  info: "text-primary",
  stopwatch: "text-amber-500",
  success: "text-emerald-500",
  timer: "text-sky-500",
}

const TYPE_BG: Record<NotificationType, string> = {
  alarm: "bg-rose-500",
  info: "bg-primary",
  stopwatch: "bg-amber-500",
  success: "bg-emerald-500",
  timer: "bg-sky-500",
}

function positionClasses(pos: ToastPosition): string {
  const map: Record<ToastPosition, string> = {
    "bottom-left": "bottom-4 left-4 items-start",
    "bottom-right": "bottom-4 right-4 items-end",
    "top-left": "top-4 left-4 items-start",
    "top-right": "top-4 right-4 items-end",
  }
  return map[pos]
}

// Full off-screen slide: left positions enter/exit leftward, right positions rightward.
// Uses percentage of element width so the toast travels entirely off-screen regardless of viewport size.
function slideX(pos: ToastPosition): string {
  return pos === "top-left" || pos === "bottom-left" ? "-120%" : "120%"
}

function ToastItem({
  duration,
  glass,
  onClose,
  radius,
  toast,
}: {
  toast: ActiveToast
  glass: string
  radius: number
  duration: number
  onClose: (id: string) => void
}): React.JSX.Element {
  const Icon = TYPE_ICON[toast.type]
  const iconColor = TYPE_COLOR[toast.type]
  const barColor = TYPE_BG[toast.type]

  useEffect(() => {
    const remaining = toast.expiresAt - Date.now()
    if (remaining <= 0) {
      onClose(toast.id)
      return
    }
    const timer = setTimeout(() => onClose(toast.id), remaining)
    return () => clearTimeout(timer)
  }, [toast.id, toast.expiresAt, onClose])

  return (
    <div
      className={cn(
        "pointer-events-auto w-72 overflow-hidden shadow-xl",
        glass
      )}
      style={{ borderRadius: `${radius}px` }}
    >
      <div className="flex items-start gap-2.5 p-3">
        <Icon
          aria-hidden="true"
          className={cn("mt-0.5 size-4 shrink-0", iconColor)}
        />
        <p className="flex-1 text-foreground text-sm leading-snug">
          {toast.message}
        </p>
        <button
          aria-label="Dismiss"
          className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => onClose(toast.id)}
          type="button"
        >
          <X className="size-3.5" />
        </button>
      </div>
      {/* Progress bar shrinks linearly from full-width to zero over the toast lifetime. */}
      <motion.div
        animate={{ scaleX: 0 }}
        className={cn("h-0.5 origin-left", barColor)}
        initial={{ scaleX: 1 }}
        transition={{ duration: duration / 1000, ease: "linear" }}
      />
    </div>
  )
}

export function NotificationToast(): React.JSX.Element {
  const { markRead, notifications } = useNotifications()
  const { envSettings } = useGlobalStates()
  const { glass, toastDuration, toastMaxStack, toastPosition, windowRadius } =
    envSettings

  // IDs already promoted to toasts — prevents re-showing after re-renders.
  const shown = useRef<Set<string>>(new Set())
  const [active, setActive] = useState<ActiveToast[]>([])

  // Stable refs so the notifications effect doesn't need duration/maxStack as
  // deps (which would re-trigger on settings changes and re-show old toasts).
  const durationRef = useRef(toastDuration)
  durationRef.current = toastDuration
  const maxStackRef = useRef(toastMaxStack)
  maxStackRef.current = toastMaxStack

  useEffect(() => {
    const toShow: ActiveToast[] = []
    for (const n of notifications) {
      if (!n.read && !shown.current.has(n.id)) {
        shown.current.add(n.id)
        toShow.push({
          expiresAt: Date.now() + durationRef.current,
          id: n.id,
          message: n.message,
          type: n.type,
        })
      }
    }
    if (toShow.length === 0) return
    // Newest toast on top; reverse so array[0] is the most-recent arrival.
    setActive((prev) =>
      [...toShow.reverse(), ...prev].slice(0, maxStackRef.current)
    )
  }, [notifications])

  const handleClose = useCallback(
    (id: string) => {
      setActive((prev) => prev.filter((t) => t.id !== id))
      markRead(id)
    },
    [markRead]
  )

  const glassCls = GLASS_SURFACE[glass]
  const x = slideX(toastPosition)

  return (
    <div
      className={cn(
        "pointer-events-none fixed flex flex-col gap-2",
        positionClasses(toastPosition)
      )}
      style={{ zIndex: Z_LAYERS.toast }}
    >
      <AnimatePresence initial={false}>
        {active.map((t) => (
          <motion.div
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x }}
            initial={{ opacity: 0, x }}
            key={t.id}
            transition={{ duration: 0.25, ease: "easeInOut", type: "tween" }}
          >
            <ToastItem
              duration={toastDuration}
              glass={glassCls}
              onClose={handleClose}
              radius={windowRadius}
              toast={t}
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
