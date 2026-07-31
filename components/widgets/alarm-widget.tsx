"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Plus, Trash2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { AlarmClockIcon } from "@/components/ui/alarm-clock"
import { BellIcon, type BellIconHandle } from "@/components/ui/bell"
import { Button } from "@/components/ui/button"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"

const TAP_SPRING = { damping: 18, stiffness: 500, type: "spring" } as const
const LIST_SPRING = { damping: 22, stiffness: 340, type: "spring" } as const

const STORAGE_KEY = "kangaflow:alarms"

type Alarm = {
  id: string
  time: string // "HH:MM" 24h
  label: string
  enabled: boolean
}

function loadAlarms(): Alarm[] {
  if (typeof window === "undefined") return []
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(raw) ? (raw as Alarm[]) : []
  } catch {
    return []
  }
}

function saveAlarms(alarms: Alarm[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms))
}

function nowHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
}

function useCurrentTime(): string {
  const [time, setTime] = useState(nowHHMM)
  useEffect(() => {
    const tick = (): void => setTime(nowHHMM())
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [])
  return time
}

export function AlarmWidget(): React.JSX.Element {
  const { isAlarmOpen, setIsAlarmOpen } = useGlobalStates()
  const [alarms, setAlarms] = useState<Alarm[]>(loadAlarms)
  const [newTime, setNewTime] = useState("08:00")
  const [newLabel, setNewLabel] = useState("")
  const [firing, setFiring] = useState<string | null>(null)
  const bellRef = useRef<BellIconHandle>(null)

  const currentTime = useCurrentTime()

  const updateAlarms = (next: Alarm[]): void => {
    setAlarms(next)
    saveAlarms(next)
  }

  const addAlarm = (): void => {
    const alarm: Alarm = {
      enabled: true,
      id: crypto.randomUUID(),
      label: newLabel.trim() || "Alarm",
      time: newTime,
    }
    updateAlarms([...alarms, alarm])
    setNewLabel("")
  }

  const toggleAlarm = (id: string): void =>
    updateAlarms(
      alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    )

  const deleteAlarm = (id: string): void =>
    updateAlarms(alarms.filter((a) => a.id !== id))

  // Check for firing alarms every minute (currentTime changes every second but
  // alarm times are minute-precision — only trigger once per minute).
  useEffect(() => {
    const active = alarms.find((a) => a.enabled && a.time === currentTime)
    if (!active || firing === active.id) return
    setFiring(active.id)
    bellRef.current?.startAnimation()
    const id = window.setTimeout(() => {
      setFiring(null)
      bellRef.current?.stopAnimation()
    }, 5000)
    return () => window.clearTimeout(id)
  }, [currentTime, alarms, firing])

  return (
    <DraggableWindow
      defaultHeight={340}
      defaultWidth={300}
      icon={<AlarmClockIcon size={14} />}
      isOpen={isAlarmOpen}
      minHeight={240}
      minWidth={260}
      onClose={() => setIsAlarmOpen(false)}
      positionClassName="bottom-4 left-4"
      storageKey="alarm-widget"
      title="Alarm"
    >
      <div className="flex flex-col gap-3 p-3">
        {/* Current time display */}
        <div className="flex items-center justify-between">
          <span className="font-mono font-semibold text-2xl tabular-nums">
            {currentTime}
          </span>
          <BellIcon
            className={cn(
              "text-muted-foreground transition-colors",
              firing != null && "text-primary"
            )}
            ref={bellRef}
            size={20}
          />
        </div>

        {/* Alarm list */}
        <div className="flex flex-col gap-1.5">
          <AnimatePresence initial={false}>
            {alarms.map((alarm) => (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors",
                  alarm.id === firing
                    ? "border-primary/40 bg-primary/10"
                    : "border-border bg-muted/30",
                  !alarm.enabled && "opacity-50"
                )}
                exit={{ opacity: 0, x: -8 }}
                initial={{ opacity: 0, x: -8 }}
                key={alarm.id}
                transition={LIST_SPRING}
              >
                <button
                  className="flex flex-1 flex-col text-left"
                  onClick={() => toggleAlarm(alarm.id)}
                  type="button"
                >
                  <span className="font-mono font-semibold text-sm tabular-nums">
                    {alarm.time}
                  </span>
                  <span className="truncate text-muted-foreground text-xs">
                    {alarm.label}
                  </span>
                </button>
                <motion.button
                  aria-label={`Delete ${alarm.label}`}
                  className="rounded p-1 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteAlarm(alarm.id)}
                  transition={TAP_SPRING}
                  type="button"
                  whileTap={{ scale: 0.8 }}
                >
                  <Trash2 className="size-3.5" />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Add alarm */}
        <div className="flex flex-col gap-1.5 border-border border-t pt-2">
          <input
            className="w-full rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setNewTime(e.target.value)}
            type="time"
            value={newTime}
          />
          <input
            className="w-full rounded-md border border-border bg-muted/40 px-2 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addAlarm()
            }}
            placeholder="Label (optional)"
            type="text"
            value={newLabel}
          />
          <motion.div
            transition={TAP_SPRING}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
          >
            <Button className="w-full gap-1.5" onClick={addAlarm} size="sm">
              <Plus className="size-4" />
              Add alarm
            </Button>
          </motion.div>
        </div>
      </div>
    </DraggableWindow>
  )
}
