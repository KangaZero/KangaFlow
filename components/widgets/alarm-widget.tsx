"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  AlarmClock,
  Check,
  Flag,
  Hourglass,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Timer as TimerIcon,
  Trash2,
  X,
} from "lucide-react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { Counter } from "@/components/Counter"
import { AlarmClockIcon } from "@/components/ui/alarm-clock"
import { BellIcon, type BellIconHandle } from "@/components/ui/bell"
import { Button } from "@/components/ui/button"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { useVimInput } from "@/lib/hooks/use-vim-input"
import { SPRING_LIST, SPRING_PILL, SPRING_TAP } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"
import { useNotifications } from "@/providers/notifications-provider"

const STORAGE_KEY = "kangaflow:alarms"

// ── Mode segmented control ────────────────────────────────────────────────
const MODES = [
  { icon: AlarmClock, key: "alarm", label: "Alarm" },
  { icon: TimerIcon, key: "stopwatch", label: "Stopwatch" },
  { icon: Hourglass, key: "timer", label: "Timer" },
] as const

type Mode = (typeof MODES)[number]["key"]

function ModeTabs({
  mode,
  onChange,
}: {
  mode: Mode
  onChange: (m: Mode) => void
}): React.JSX.Element {
  return (
    <div className="flex gap-1 rounded-lg bg-muted/40 p-1">
      {MODES.map((m) => (
        <button
          className="relative flex-1 rounded-md px-2 py-1.5 font-medium text-xs"
          key={m.key}
          onClick={() => onChange(m.key)}
          type="button"
        >
          {mode === m.key ? (
            <motion.span
              className="absolute inset-0 rounded-md bg-background shadow-sm"
              layoutId="alarm-mode-pill"
              transition={SPRING_PILL}
            />
          ) : null}
          <span
            className={cn(
              "relative flex items-center justify-center gap-1",
              mode === m.key ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <m.icon className="size-3.5" />
            {m.label}
          </span>
        </button>
      ))}
    </div>
  )
}

// ── Animated digit display (react-bits Counter, one rolling pair per unit) ──
function DigitPair({
  fontSize,
  value,
}: {
  value: number
  fontSize: number
}): React.JSX.Element {
  return (
    <Counter
      fontSize={fontSize}
      gap={0}
      gradientHeight={0}
      horizontalPadding={0}
      places={[10, 1]}
      value={Math.max(0, Math.min(99, value))}
    />
  )
}

function ClockDisplay({
  centis,
  fontSize = 44,
  muted = false,
  segments,
}: {
  segments: readonly { key: string; value: number }[]
  fontSize?: number
  centis?: number
  muted?: boolean
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "flex items-baseline justify-center font-semibold tabular-nums",
        muted && "text-muted-foreground"
      )}
    >
      {segments.map((seg, i) => (
        <span className="flex items-baseline" key={seg.key}>
          {i > 0 ? (
            <span className="px-0.5" style={{ fontSize }}>
              :
            </span>
          ) : null}
          <DigitPair fontSize={fontSize} value={seg.value} />
        </span>
      ))}
      {centis != null ? (
        <span
          className="ml-0.5 self-end text-muted-foreground"
          style={{ fontSize: Math.round(fontSize * 0.45) }}
        >
          .{String(centis).padStart(2, "0")}
        </span>
      ) : null}
    </div>
  )
}

// ── Alarm model + persistence ─────────────────────────────────────────────
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

// mm:ss(.cc) label for the stopwatch display, laps, and the "stopped at"
// notification. Centiseconds are dropped for the notification (withCentis=false).
function formatStopwatch(ms: number, withCentis = true): string {
  const total = Math.floor(ms / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, "0")
  const ss = String(total % 60).padStart(2, "0")
  if (!withCentis) return `${mm}:${ss}`
  const cc = String(Math.floor((ms % 1000) / 10)).padStart(2, "0")
  return `${mm}:${ss}.${cc}`
}

function nowParts(): { h: number; m: number; s: number } {
  const d = new Date()
  return { h: d.getHours(), m: d.getMinutes(), s: d.getSeconds() }
}

// Wall clock, ticking each second (drives both the display and alarm matching).
function useClockParts(): { h: number; m: number; s: number } {
  const [parts, setParts] = useState(nowParts)
  useEffect(() => {
    const id = window.setInterval(() => setParts(nowParts()), 1000)
    return () => window.clearInterval(id)
  }, [])
  return parts
}

// ── Stopwatch (drift-free via performance.now() deltas) ────────────────────
type Stopwatch = {
  elapsed: number
  running: boolean
  laps: number[]
  start: () => void
  pause: () => void
  lap: () => void
  reset: () => void
}

function useStopwatch(): Stopwatch {
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [laps, setLaps] = useState<number[]>([])
  const baseRef = useRef(0) // accumulated ms from previous runs
  const startRef = useRef(0) // performance.now() at the current run's start
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    startRef.current = performance.now()
    const tick = (): void => {
      setElapsed(baseRef.current + (performance.now() - startRef.current))
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [running])

  // Live elapsed at the instant of the call (avoids the up-to-one-frame lag of
  // the `elapsed` state when capturing a lap while running).
  const liveElapsed = (): number =>
    running ? baseRef.current + (performance.now() - startRef.current) : elapsed

  return {
    elapsed,
    lap: (): void => setLaps((prev) => [...prev, liveElapsed()]),
    laps,
    pause: (): void => {
      if (!running) return
      baseRef.current += performance.now() - startRef.current
      setRunning(false)
    },
    reset: (): void => {
      baseRef.current = 0
      setElapsed(0)
      setLaps([])
      setRunning(false)
    },
    running,
    start: (): void => setRunning(true),
  }
}

// ── Timer (countdown, drift-free via an absolute end timestamp) ────────────
type CountdownTimer = {
  remaining: number
  running: boolean
  durationMs: number
  start: () => void
  pause: () => void
  reset: () => void
  setDuration: (ms: number) => void
}

function useTimer(onExpire: () => void): CountdownTimer {
  const [durationMs, setDurationMs] = useState(5 * 60_000)
  const [remaining, setRemaining] = useState(5 * 60_000)
  const [running, setRunning] = useState(false)
  const endRef = useRef(0)
  const rafRef = useRef<number | null>(null)
  const expireRef = useRef(onExpire)
  expireRef.current = onExpire

  // biome-ignore lint/correctness/useExhaustiveDependencies: `remaining` is captured once at start; adding it would restart the loop every frame
  useEffect(() => {
    if (!running) return
    endRef.current = performance.now() + remaining
    const tick = (): void => {
      const left = endRef.current - performance.now()
      if (left <= 0) {
        setRemaining(0)
        setRunning(false)
        expireRef.current()
        return
      }
      setRemaining(left)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [running])

  return {
    durationMs,
    pause: (): void => setRunning(false),
    remaining,
    reset: (): void => {
      setRemaining(durationMs)
      setRunning(false)
    },
    running,
    setDuration: (ms: number): void => {
      setDurationMs(ms)
      if (!running) setRemaining(ms)
    },
    start: (): void => {
      if (remaining > 0) setRunning(true)
    },
  }
}

export function AlarmWidget(): React.JSX.Element {
  const { isAlarmOpen, setIsAlarmOpen, envSettings, vimMode } =
    useGlobalStates()
  const { translate } = useLocale()
  const { notify, remind } = useNotifications()
  const wd = envSettings.widgetDefaults.alarm
  const [mode, setMode] = useState<Mode>("alarm")

  const [alarms, setAlarms] = useState<Alarm[]>(loadAlarms)
  const [newTime, setNewTime] = useState("08:00")
  const [newLabel, setNewLabel] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [firing, setFiring] = useState<string | null>(null)
  const bellRef = useRef<BellIconHandle>(null)
  const labelRef = useRef<HTMLInputElement>(null)
  useVimInput(labelRef, { enabled: vimMode })

  const { h, m, s } = useClockParts()
  const stopwatch = useStopwatch()

  const ringBell = (): void => {
    bellRef.current?.startAnimation()
    window.setTimeout(() => bellRef.current?.stopAnimation(), 5000)
    notify(translate("notifications.timerDone"), "alarm", "timer")
  }
  const timer = useTimer(ringBell)

  const updateAlarms = (next: Alarm[]): void => {
    setAlarms(next)
    saveAlarms(next)
  }

  const resetForm = (): void => {
    setEditingId(null)
    setNewLabel("")
  }

  // Add a new alarm, or commit an in-place edit when `editingId` is set.
  const addAlarm = (): void => {
    const label = newLabel.trim() || translate("widgets.alarm.defaultLabel")
    if (editingId != null) {
      updateAlarms(
        alarms.map((a) =>
          a.id === editingId ? { ...a, label, time: newTime } : a
        )
      )
    } else {
      updateAlarms([
        ...alarms,
        { enabled: true, id: crypto.randomUUID(), label, time: newTime },
      ])
    }
    resetForm()
  }

  const startEdit = (alarm: Alarm): void => {
    setEditingId(alarm.id)
    setNewTime(alarm.time)
    setNewLabel(alarm.label)
  }

  const toggleAlarm = (id: string): void =>
    updateAlarms(
      alarms.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    )

  const deleteAlarm = (id: string): void => {
    updateAlarms(alarms.filter((a) => a.id !== id))
    if (id === editingId) resetForm()
  }

  // Pause the stopwatch and announce the split; starting has no notification.
  const toggleStopwatch = (): void => {
    if (stopwatch.running) {
      stopwatch.pause()
      if (stopwatch.elapsed > 0) {
        notify(
          translate("notifications.stopwatchStopped").replace(
            "{time}",
            formatStopwatch(stopwatch.elapsed, false)
          ),
          "alarm",
          "stopwatch"
        )
      }
    } else {
      stopwatch.start()
    }
  }

  // Fire a matching alarm once per minute (HH:MM equality, seconds ignored).
  const currentHHMM = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
  useEffect(() => {
    const active = alarms.find((a) => a.enabled && a.time === currentHHMM)
    if (!active || firing === active.id) return
    setFiring(active.id)
    bellRef.current?.startAnimation()
    notify(active.label, "alarm", "alarm")
    const id = window.setTimeout(() => {
      setFiring(null)
      bellRef.current?.stopAnimation()
    }, 5000)
    return () => window.clearTimeout(id)
  }, [currentHHMM, alarms, firing, notify])

  // Derived display values for stopwatch / timer.
  const swTotal = Math.floor(stopwatch.elapsed / 1000)
  const swCentis = Math.floor((stopwatch.elapsed % 1000) / 10)
  const tmTotal = Math.ceil(timer.remaining / 1000)

  return (
    <DraggableWindow
      anchor={wd.anchor}
      defaultHeight={380}
      defaultOffset={wd.offset}
      defaultWidth={300}
      icon={<AlarmClockIcon size={14} />}
      isOpen={isAlarmOpen}
      minHeight={300}
      minWidth={260}
      onClose={() => setIsAlarmOpen(false)}
      storageKey="alarm-widget"
      title="Clock"
    >
      <div className="flex flex-col gap-3 p-3">
        <LayoutGroup>
          <ModeTabs mode={mode} onChange={setMode} />
        </LayoutGroup>

        {/* ALARM ───────────────────────────────────────────────── */}
        {mode === "alarm" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-center gap-3">
              <ClockDisplay
                fontSize={38}
                segments={[
                  { key: "h", value: h },
                  { key: "m", value: m },
                  { key: "s", value: s },
                ]}
              />
              <BellIcon
                className={cn(
                  "shrink-0 text-muted-foreground transition-colors",
                  firing != null && "text-primary"
                )}
                ref={bellRef}
                size={20}
              />
            </div>

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
                      alarm.id === editingId && "ring-2 ring-ring",
                      !alarm.enabled && "opacity-50"
                    )}
                    exit={{ opacity: 0, x: -8 }}
                    initial={{ opacity: 0, x: -8 }}
                    key={alarm.id}
                    transition={SPRING_LIST}
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
                      aria-label={translate("widgets.alarm.edit")}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      onClick={() => startEdit(alarm)}
                      transition={SPRING_TAP}
                      type="button"
                      whileTap={{ scale: 0.8 }}
                    >
                      <Pencil className="size-3.5" />
                    </motion.button>
                    <motion.button
                      aria-label={translate("widgets.alarm.delete")}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      onClick={() => deleteAlarm(alarm.id)}
                      transition={SPRING_TAP}
                      type="button"
                      whileTap={{ scale: 0.8 }}
                    >
                      <Trash2 className="size-3.5" />
                    </motion.button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

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
                placeholder={translate("widgets.alarm.labelPlaceholder")}
                ref={labelRef}
                type="text"
                value={newLabel}
              />
              <div className="flex gap-1.5">
                {editingId != null ? (
                  <Button
                    className="gap-1.5"
                    onClick={resetForm}
                    size="sm"
                    variant="outline"
                  >
                    <X className="size-4" />
                    {translate("widgets.alarm.cancel")}
                  </Button>
                ) : null}
                <motion.div
                  className="flex-1"
                  transition={SPRING_TAP}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <Button
                    className="w-full gap-1.5"
                    onClick={addAlarm}
                    size="sm"
                  >
                    {editingId != null ? (
                      <Check className="size-4" />
                    ) : (
                      <Plus className="size-4" />
                    )}
                    {editingId != null
                      ? translate("widgets.alarm.save")
                      : translate("widgets.alarm.add")}
                  </Button>
                </motion.div>
              </div>
            </div>

            {/* Remind me in N minutes — schedules a one-shot reminder. */}
            <div className="flex flex-wrap items-center gap-1.5 border-border border-t pt-2">
              <span className="text-muted-foreground text-xs">
                {translate("notifications.remindMe")}
              </span>
              {(
                [
                  { key: "notifications.remindIn5", minutes: 5 },
                  { key: "notifications.remindIn10", minutes: 10 },
                  { key: "notifications.remindIn15", minutes: 15 },
                  { key: "notifications.remindIn30", minutes: 30 },
                ] as const
              ).map((opt) => (
                <motion.button
                  className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs transition-colors hover:bg-muted"
                  key={opt.minutes}
                  onClick={() =>
                    remind(
                      opt.minutes,
                      translate("notifications.reminder"),
                      "alarm",
                      "alarm"
                    )
                  }
                  transition={SPRING_TAP}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                >
                  {translate(opt.key)}
                </motion.button>
              ))}
            </div>
          </div>
        ) : null}

        {/* STOPWATCH ───────────────────────────────────────────── */}
        {mode === "stopwatch" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-4">
            <ClockDisplay
              centis={swCentis}
              segments={[
                { key: "m", value: Math.floor(swTotal / 60) },
                { key: "s", value: swTotal % 60 },
              ]}
            />
            <div className="flex items-center gap-2">
              <motion.div
                transition={SPRING_TAP}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
              >
                <Button className="gap-1.5" onClick={toggleStopwatch} size="sm">
                  {stopwatch.running ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {stopwatch.running ? "Pause" : "Start"}
                </Button>
              </motion.div>
              <motion.div
                transition={SPRING_TAP}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
              >
                {/* While running the secondary action captures a lap; when
                    stopped it resets (both disabled at zero elapsed). */}
                <Button
                  className="gap-1.5"
                  disabled={stopwatch.elapsed === 0}
                  onClick={stopwatch.running ? stopwatch.lap : stopwatch.reset}
                  size="sm"
                  variant="outline"
                >
                  {stopwatch.running ? (
                    <>
                      <Flag className="size-4" />
                      {translate("widgets.alarm.lap")}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="size-4" />
                      Reset
                    </>
                  )}
                </Button>
              </motion.div>
            </div>

            {stopwatch.laps.length > 0 ? (
              <div className="max-h-32 w-full space-y-1 overflow-y-auto px-1">
                <AnimatePresence initial={false}>
                  {stopwatch.laps.map((lapMs, i) => (
                    <motion.div
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between rounded-md bg-muted/30 px-2.5 py-1 font-mono text-xs tabular-nums"
                      exit={{ opacity: 0 }}
                      initial={{ opacity: 0, y: -6 }}
                      // biome-ignore lint/suspicious/noArrayIndexKey: laps are append-only and never reordered, so the index is a stable identity.
                      key={i}
                      transition={SPRING_LIST}
                    >
                      <span className="text-muted-foreground">
                        {translate("widgets.alarm.lap")} {i + 1}
                      </span>
                      <span>{formatStopwatch(lapMs)}</span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* TIMER ────────────────────────────────────────────────── */}
        {mode === "timer" ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-6 py-4">
            <ClockDisplay
              muted={timer.remaining === 0}
              segments={[
                { key: "m", value: Math.floor(tmTotal / 60) },
                { key: "s", value: tmTotal % 60 },
              ]}
            />

            {timer.running ? null : (
              <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                <input
                  aria-label="Minutes"
                  className="w-14 rounded-md border border-border bg-muted/40 px-2 py-1 text-center font-mono text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  max={99}
                  min={0}
                  onChange={(e) =>
                    timer.setDuration(
                      Number(e.target.value) * 60_000 +
                        (timer.durationMs % 60_000)
                    )
                  }
                  type="number"
                  value={Math.floor(timer.durationMs / 60_000)}
                />
                min
                <input
                  aria-label="Seconds"
                  className="w-14 rounded-md border border-border bg-muted/40 px-2 py-1 text-center font-mono text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  max={59}
                  min={0}
                  onChange={(e) =>
                    timer.setDuration(
                      Math.floor(timer.durationMs / 60_000) * 60_000 +
                        Number(e.target.value) * 1000
                    )
                  }
                  type="number"
                  value={Math.floor((timer.durationMs % 60_000) / 1000)}
                />
                sec
              </div>
            )}

            <div className="flex items-center gap-2">
              <motion.div
                transition={SPRING_TAP}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
              >
                <Button
                  className="gap-1.5"
                  disabled={timer.remaining === 0 && !timer.running}
                  onClick={timer.running ? timer.pause : timer.start}
                  size="sm"
                >
                  {timer.running ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                  {timer.running ? "Pause" : "Start"}
                </Button>
              </motion.div>
              <motion.div
                transition={SPRING_TAP}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
              >
                <Button
                  className="gap-1.5"
                  onClick={timer.reset}
                  size="sm"
                  variant="outline"
                >
                  <RotateCcw className="size-4" />
                  Reset
                </Button>
              </motion.div>
            </div>
          </div>
        ) : null}
      </div>
    </DraggableWindow>
  )
}
