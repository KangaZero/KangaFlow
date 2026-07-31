"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Plus, Trash2 } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useState } from "react"
import { Calendar } from "@/components/ui/calendar"
import { CalendarDaysIcon } from "@/components/ui/calendar-days"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"

const TAP_SPRING = { damping: 18, stiffness: 500, type: "spring" } as const
const LIST_SPRING = { damping: 22, stiffness: 340, type: "spring" } as const

const STORAGE_KEY = "kangaflow:calendar-events"

type CalEvent = {
  id: string
  date: string // "YYYY-MM-DD"
  title: string
  color: string // Tailwind bg class token
}

const EVENT_COLORS = [
  "bg-primary",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-sky-500",
  "bg-violet-500",
] as const

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function loadEvents(): CalEvent[] {
  if (typeof window === "undefined") return []
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(raw) ? (raw as CalEvent[]) : []
  } catch {
    return []
  }
}

function saveEvents(events: CalEvent[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events))
}

export function CalendarWidget(): React.JSX.Element {
  const { isCalendarOpen, setIsCalendarOpen } = useGlobalStates()
  const [events, setEvents] = useState<CalEvent[]>(loadEvents)
  const [selected, setSelected] = useState<Date | undefined>(new Date())
  const [newTitle, setNewTitle] = useState("")
  const [newColor, setNewColor] = useState<string>(EVENT_COLORS[0])

  const updateEvents = (next: CalEvent[]): void => {
    setEvents(next)
    saveEvents(next)
  }

  const selectedKey = selected ? toDateKey(selected) : null
  const dayEvents = events.filter((e) => e.date === selectedKey)

  const addEvent = (): void => {
    if (!selectedKey || !newTitle.trim()) return
    const ev: CalEvent = {
      color: newColor,
      date: selectedKey,
      id: crypto.randomUUID(),
      title: newTitle.trim(),
    }
    updateEvents([...events, ev])
    setNewTitle("")
  }

  const deleteEvent = (id: string): void =>
    updateEvents(events.filter((e) => e.id !== id))

  // Build a set of dates that have events for the calendar day modifier.
  const eventDates = new Set(events.map((e) => e.date))
  const hasEventModifier = {
    hasEvent: (d: Date) => eventDates.has(toDateKey(d)),
  }

  return (
    <DraggableWindow
      defaultHeight={480}
      defaultWidth={340}
      icon={<CalendarDaysIcon size={14} />}
      isOpen={isCalendarOpen}
      minHeight={380}
      minWidth={300}
      onClose={() => setIsCalendarOpen(false)}
      positionClassName="top-4 right-4"
      storageKey="calendar-widget"
      title="Calendar"
    >
      <div className="flex h-full flex-col gap-0">
        {/* Month picker — fill the window width. Overriding classNames.root
            drops the base `w-fit`; a larger --cell-size lets the flex grid
            expand to the full 340px instead of collapsing to ~192px. */}
        <Calendar
          className="w-full rounded-none border-0 p-2 [--cell-size:--spacing(9)]"
          classNames={{
            month: "flex w-full flex-col gap-3",
            month_grid: "w-full border-collapse",
            months: "w-full",
            root: "w-full",
          }}
          mode="single"
          modifiers={hasEventModifier}
          modifiersClassNames={{
            hasEvent: "font-bold underline decoration-primary decoration-2",
          }}
          onSelect={setSelected}
          selected={selected}
        />

        {/* Day event list */}
        <div className="flex flex-col gap-2 border-border border-t p-3">
          <p className="font-medium text-muted-foreground text-xs">
            {selected
              ? selected.toLocaleDateString(undefined, {
                  day: "numeric",
                  month: "long",
                  weekday: "short",
                })
              : "No date selected"}
          </p>

          <AnimatePresence initial={false}>
            {dayEvents.map((ev) => (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
                exit={{ opacity: 0, x: -8 }}
                initial={{ opacity: 0, x: -8 }}
                key={ev.id}
                transition={LIST_SPRING}
              >
                <span
                  className={cn("size-2 shrink-0 rounded-full", ev.color)}
                />
                <span className="flex-1 truncate text-sm">{ev.title}</span>
                <motion.button
                  aria-label={`Delete ${ev.title}`}
                  className="rounded p-0.5 text-muted-foreground hover:text-destructive"
                  onClick={() => deleteEvent(ev.id)}
                  transition={TAP_SPRING}
                  type="button"
                  whileTap={{ scale: 0.8 }}
                >
                  <Trash2 className="size-3" />
                </motion.button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add event */}
          <div className="flex gap-1.5">
            <div className="flex gap-1">
              {EVENT_COLORS.map((c) => (
                <motion.button
                  aria-label={`Color ${c}`}
                  className={cn(
                    "size-4 rounded-full",
                    c,
                    newColor === c && "scale-125 ring-2 ring-ring ring-offset-1"
                  )}
                  key={c}
                  onClick={() => setNewColor(c)}
                  transition={TAP_SPRING}
                  type="button"
                  whileHover={{ scale: newColor === c ? 1.25 : 1.2 }}
                  whileTap={{ scale: 0.85 }}
                />
              ))}
            </div>
            <input
              className="min-w-0 flex-1 rounded border border-border bg-muted/40 px-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addEvent()
              }}
              placeholder="Add event…"
              type="text"
              value={newTitle}
            />
            <motion.button
              aria-label="Add event"
              className="rounded border border-border bg-muted/40 p-1 hover:bg-muted"
              onClick={addEvent}
              transition={TAP_SPRING}
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.88 }}
            >
              <Plus className="size-3.5" />
            </motion.button>
          </div>
        </div>
      </div>
    </DraggableWindow>
  )
}
