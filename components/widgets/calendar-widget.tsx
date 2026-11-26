"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { useRef, useState } from "react"
import { type CaptionLabelProps, useDayPicker } from "react-day-picker"
import { enUS, ja } from "react-day-picker/locale"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { Calendar } from "@/components/ui/calendar"
import { CalendarDaysIcon } from "@/components/ui/calendar-days"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { useVimInput } from "@/lib/hooks/use-vim-input"
import { interpolate } from "@/lib/i18n"
import { isCommitEnter } from "@/lib/keyboard-events"
import { SPRING_LIST, SPRING_TAP } from "@/lib/motion"
import { asArrayOf, safeLocalStorage } from "@/lib/safe-storage"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

const STORAGE_KEY = "kangaflow:calendar-events"

type CalEvent = {
  id: string
  date: string // "YYYY-MM-DD"
  title: string
  color: string // Tailwind bg class token
}

// Picker order. Each name doubles as its i18n key (widgets.colors.*); the
// Tailwind class is what an event stores, so saved events keep working.
const EVENT_COLOR_NAMES = [
  "accent",
  "rose",
  "amber",
  "emerald",
  "sky",
  "violet",
] as const

type EventColorName = (typeof EVENT_COLOR_NAMES)[number]

const EVENT_COLORS = {
  accent: "bg-primary",
  amber: "bg-amber-500",
  emerald: "bg-emerald-500",
  rose: "bg-rose-500",
  sky: "bg-sky-500",
  violet: "bg-violet-500",
} as const satisfies Record<EventColorName, string>

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10)
}

// Stored data is untrusted: check every field instead of casting.
function isCalEvent(value: unknown): value is CalEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    typeof value.id === "string" &&
    "date" in value &&
    typeof value.date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.date) &&
    "title" in value &&
    typeof value.title === "string" &&
    "color" in value &&
    typeof value.color === "string"
  )
}

function loadEvents(): CalEvent[] {
  return safeLocalStorage.getJson<CalEvent[]>(
    STORAGE_KEY,
    [],
    asArrayOf(isCalEvent)
  )
}

function saveEvents(events: CalEvent[]): void {
  safeLocalStorage.setJson(STORAGE_KEY, events)
}

const MONTH_INDICES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const

// Module-level so DayPicker always gets a stable reference — inlining it
// inside CalendarWidget would recreate it each render and remount the caption.
function CaptionLabelPicker({ id }: CaptionLabelProps): React.JSX.Element {
  const { months, goToMonth, dayPickerProps } = useDayPicker()
  const { translate } = useLocale()
  const current = months[0]?.date ?? new Date()
  const localeCode = dayPickerProps.locale?.code ?? "en-US"
  const [open, setOpen] = useState(false)

  const year = current.getFullYear()
  const monthIdx = current.getMonth()

  const label = current.toLocaleString(localeCode, {
    month: "long",
    year: "numeric",
  })

  const monthNames = MONTH_INDICES.map((i) =>
    new Date(2024, i, 1).toLocaleString(localeCode, { month: "short" })
  )

  function pickMonth(m: number): void {
    goToMonth(new Date(year, m, 1))
    setOpen(false)
  }

  function shiftYear(dir: 1 | -1): void {
    goToMonth(new Date(year + dir, monthIdx, 1))
  }

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button
          className="hover:bg-accent hover:text-accent-foreground flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium transition-colors"
          id={id}
          type="button"
        >
          {label}
          <ChevronDown className="size-3 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="center" className="w-52 p-3" side="bottom">
        {/* Year navigation */}
        <div className="mb-3 flex items-center justify-between">
          <button
            aria-label={translate("widgets.calendar.previousYear")}
            className="hover:bg-accent hover:text-accent-foreground rounded p-1 transition-colors"
            onClick={() => shiftYear(-1)}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium tabular-nums">{year}</span>
          <button
            aria-label={translate("widgets.calendar.nextYear")}
            className="hover:bg-accent hover:text-accent-foreground rounded p-1 transition-colors"
            onClick={() => shiftYear(1)}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        {/* 4×3 month grid */}
        <div className="grid grid-cols-4 gap-1">
          {monthNames.map((name, i) => (
            <button
              className={cn(
                "hover:bg-accent hover:text-accent-foreground rounded px-1 py-1.5 text-xs transition-colors",
                i === monthIdx &&
                  "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground"
              )}
              key={name}
              onClick={() => pickMonth(i)}
              type="button"
            >
              {name}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export function CalendarWidget(): React.JSX.Element {
  const { isCalendarOpen, setIsCalendarOpen, envSettings, vimMode } =
    useGlobalStates()
  const { locale, translate } = useLocale()
  const calLocale = locale === "ja" ? ja : enUS
  const wd = envSettings.widgetDefaults.calendar
  const [events, setEvents] = useState<CalEvent[]>(loadEvents)
  const [selected, setSelected] = useState<Date | undefined>(new Date())
  const [month, setMonth] = useState(() => new Date())
  const [newTitle, setNewTitle] = useState("")
  const [newColor, setNewColor] = useState<string>(EVENT_COLORS.accent)
  const eventRef = useRef<HTMLInputElement>(null)
  useVimInput(eventRef, { enabled: vimMode })

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
      anchor={wd.anchor}
      defaultHeight={480}
      defaultOffset={wd.offset}
      defaultWidth={340}
      icon={<CalendarDaysIcon size={14} />}
      isOpen={isCalendarOpen}
      minHeight={380}
      minWidth={300}
      onClose={() => setIsCalendarOpen(false)}
      storageKey="calendar-widget"
      title={translate("widgets.calendar.title")}
    >
      <div className="flex h-full flex-col gap-0">
        {/* Month picker — fill the window width. Overriding classNames.root
            drops the base `w-fit`; a larger --cell-size lets the flex grid
            expand to the full 340px instead of collapsing to ~192px. */}
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key={`${month.getFullYear()}-${month.getMonth()}`}
            transition={{ duration: 0.15, ease: "easeInOut" }}
          >
            <Calendar
              className="w-full rounded-none border-0 p-2 [--cell-size:--spacing(9)]"
              classNames={{
                month: "flex w-full flex-col gap-3",
                month_grid: "w-full border-collapse",
                months: "relative w-full",
                root: "w-full",
              }}
              components={{ CaptionLabel: CaptionLabelPicker }}
              locale={calLocale}
              mode="single"
              modifiers={hasEventModifier}
              modifiersClassNames={{
                hasEvent: "font-bold underline decoration-primary decoration-2",
              }}
              month={month}
              onMonthChange={setMonth}
              onSelect={setSelected}
              selected={selected}
            />
          </motion.div>
        </AnimatePresence>

        {/* Day event list */}
        <div className="border-border flex flex-col gap-2 border-t p-3">
          <p className="text-muted-foreground text-xs font-medium">
            {selected
              ? selected.toLocaleDateString(locale, {
                  day: "numeric",
                  month: "long",
                  weekday: "short",
                })
              : translate("widgets.calendar.noDateSelected")}
          </p>

          <AnimatePresence initial={false}>
            {dayEvents.map((ev) => (
              <motion.div
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2"
                exit={{ opacity: 0, x: -8 }}
                initial={{ opacity: 0, x: -8 }}
                key={ev.id}
                transition={SPRING_LIST}
              >
                <span
                  className={cn("size-2 shrink-0 rounded-full", ev.color)}
                />
                <span className="flex-1 truncate text-sm">{ev.title}</span>
                <motion.button
                  aria-label={interpolate(
                    translate("widgets.calendar.deleteEvent"),
                    {
                      title: ev.title,
                    }
                  )}
                  className="text-muted-foreground hover:text-destructive rounded p-0.5"
                  onClick={() => deleteEvent(ev.id)}
                  transition={SPRING_TAP}
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
              {EVENT_COLOR_NAMES.map((name) => {
                const c = EVENT_COLORS[name]
                return (
                  <motion.button
                    aria-label={interpolate(translate("widgets.colorOption"), {
                      color: translate(`widgets.colors.${name}`),
                    })}
                    className={cn(
                      "size-4 rounded-full",
                      c,
                      newColor === c &&
                        "ring-ring scale-125 ring-2 ring-offset-1"
                    )}
                    key={c}
                    onClick={() => setNewColor(c)}
                    transition={SPRING_TAP}
                    type="button"
                    whileHover={{ scale: newColor === c ? 1.25 : 1.2 }}
                    whileTap={{ scale: 0.85 }}
                  />
                )
              })}
            </div>
            <input
              className="border-border bg-muted/40 placeholder:text-muted-foreground focus:ring-ring min-w-0 flex-1 rounded border px-2 py-1 text-xs focus:ring-1 focus:outline-none"
              data-env-part="field"
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => {
                if (isCommitEnter(e.nativeEvent)) addEvent()
              }}
              placeholder={translate("widgets.calendar.addEventPlaceholder")}
              ref={eventRef}
              type="text"
              value={newTitle}
            />
            <motion.button
              aria-label={translate("widgets.calendar.addEvent")}
              className="border-border bg-muted/40 hover:bg-muted rounded border p-1"
              data-env-part="key flat"
              onClick={addEvent}
              transition={SPRING_TAP}
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
