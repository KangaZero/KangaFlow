// Single source of truth for the notifications model + persistence. Pure,
// SSR-safe helpers (no React/DOM) so they can be unit-tested and imported from
// the build-time render. Mirrors the try/catch + field-by-field normalize
// pattern used in `lib/notes.ts`.

import { WIDGET_IDS, type WidgetId } from "@/components/niri/settings"

// What kind of event produced a notification (drives the list icon + accent).
export type NotificationType =
  | "info"
  | "alarm"
  | "timer"
  | "stopwatch"
  | "success"

// Which widget a notification opens when clicked (null = not actionable).
export type NotificationTarget = WidgetId | null

export type AppNotification = {
  id: string
  message: string
  type: NotificationType
  target: NotificationTarget
  createdAt: number // epoch ms
  read: boolean
}

// A one-shot deferred notification ("remind me in N min"). Fires when the wall
// clock reaches `fireAt`, then it is removed — reminders never recur.
export type Reminder = {
  id: string
  fireAt: number // epoch ms
  message: string
  type: NotificationType
  target: NotificationTarget
}

export const NOTIFICATIONS_STORAGE_KEY = "kangaflow:notifications"
export const REMINDERS_STORAGE_KEY = "kangaflow:reminders"

const NOTIFICATION_TYPES: readonly NotificationType[] = [
  "info",
  "alarm",
  "timer",
  "stopwatch",
  "success",
]

function isNotificationType(value: unknown): value is NotificationType {
  return (
    typeof value === "string" &&
    (NOTIFICATION_TYPES as readonly string[]).includes(value)
  )
}

// null is a valid target (a non-actionable notification), so it must survive
// normalization — only unknown strings fall back to null.
function isTarget(value: unknown): value is NotificationTarget {
  return (
    value === null ||
    (typeof value === "string" &&
      (WIDGET_IDS as readonly string[]).includes(value))
  )
}

export function createNotification(
  message: string,
  target: NotificationTarget = null,
  type: NotificationType = "info"
): AppNotification {
  return {
    createdAt: Date.now(),
    id: crypto.randomUUID(),
    message,
    read: false,
    target,
    type,
  }
}

// Compact "time since" label for a notification card. `now` is injected (not
// read from the clock) so the bucket boundaries are deterministically testable.
export function formatRelativeTime(ms: number, now: number): string {
  const age = now - ms
  if (age < 60_000) return "just now" // first minute (and any clock-skew negative)
  if (age < 3_600_000) return `${Math.floor(age / 60_000)}m`
  if (age < 86_400_000) return `${Math.floor(age / 3_600_000)}h`
  return `${Math.floor(age / 86_400_000)}d`
}

// Split reminders into the ones whose time has come (fireAt <= now) and the
// rest. Kept pure so the provider can fire `due` and persist `pending`.
export function dueReminders(
  reminders: readonly Reminder[],
  now: number
): { due: Reminder[]; pending: Reminder[] } {
  const due: Reminder[] = []
  const pending: Reminder[] = []
  for (const reminder of reminders) {
    if (reminder.fireAt <= now) {
      due.push(reminder)
    } else {
      pending.push(reminder)
    }
  }
  return { due, pending }
}

// Coerce an unknown/partial stored record into a valid AppNotification.
function normalizeNotification(raw: unknown): AppNotification {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >
  return {
    createdAt: typeof o.createdAt === "number" ? o.createdAt : Date.now(),
    id: typeof o.id === "string" ? o.id : crypto.randomUUID(),
    message: typeof o.message === "string" ? o.message : "",
    read: typeof o.read === "boolean" ? o.read : false,
    target: isTarget(o.target) ? o.target : null,
    type: isNotificationType(o.type) ? o.type : "info",
  }
}

function normalizeReminder(raw: unknown): Reminder {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >
  return {
    fireAt: typeof o.fireAt === "number" ? o.fireAt : Date.now(),
    id: typeof o.id === "string" ? o.id : crypto.randomUUID(),
    message: typeof o.message === "string" ? o.message : "",
    target: isTarget(o.target) ? o.target : null,
    type: isNotificationType(o.type) ? o.type : "info",
  }
}

export function loadNotifications(): AppNotification[] {
  if (typeof window === "undefined") return []
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(raw) ? raw.map(normalizeNotification) : []
  } catch {
    return []
  }
}

export function saveNotifications(notifications: AppNotification[]): void {
  window.localStorage.setItem(
    NOTIFICATIONS_STORAGE_KEY,
    JSON.stringify(notifications)
  )
}

export function loadReminders(): Reminder[] {
  if (typeof window === "undefined") return []
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(REMINDERS_STORAGE_KEY) ?? "[]"
    )
    return Array.isArray(raw) ? raw.map(normalizeReminder) : []
  } catch {
    return []
  }
}

export function saveReminders(reminders: Reminder[]): void {
  window.localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders))
}
