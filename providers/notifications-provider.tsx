"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import * as React from "react"

import {
  type AppNotification,
  createNotification,
  dueReminders,
  loadNotifications,
  loadReminders,
  type NotificationTarget,
  type NotificationType,
  type Reminder,
  saveNotifications,
  saveReminders,
} from "@/lib/notifications"

// Cap the stored history so localStorage can't grow without bound; the newest
// notifications are kept (list is newest-first).
const MAX_NOTIFICATIONS = 50

// How often we sweep for reminders that came due while the page is open.
const TICK_MS = 15_000

type NotificationsContextValue = {
  notifications: AppNotification[]
  unreadCount: number
  notify: (
    message: string,
    target?: NotificationTarget,
    type?: NotificationType
  ) => void
  remind: (
    minutes: number,
    message: string,
    target?: NotificationTarget,
    type?: NotificationType
  ) => void
  dismiss: (id: string) => void
  clearAll: () => void
  markRead: (id: string) => void
}

const NotificationsContext =
  React.createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [notifications, setNotifications] = React.useState<AppNotification[]>(
    []
  )
  const [reminders, setReminders] = React.useState<Reminder[]>([])
  const [hydrated, setHydrated] = React.useState(false)

  // Latest arrays, readable synchronously inside stable callbacks (so notify /
  // remind can keep empty-dep useCallback identities). Mirrors the ref pattern
  // in achievements-provider.tsx.
  const notificationsRef = React.useRef(notifications)
  notificationsRef.current = notifications
  const remindersRef = React.useRef(reminders)
  remindersRef.current = reminders

  const notify = React.useCallback(
    (
      message: string,
      target: NotificationTarget = null,
      type: NotificationType = "info"
    ) => {
      const next = [
        createNotification(message, target, type),
        ...notificationsRef.current,
      ].slice(0, MAX_NOTIFICATIONS)
      notificationsRef.current = next
      setNotifications(next)
    },
    []
  )

  const remind = React.useCallback(
    (
      minutes: number,
      message: string,
      target: NotificationTarget = null,
      type: NotificationType = "info"
    ) => {
      const reminder: Reminder = {
        fireAt: Date.now() + minutes * 60_000,
        id: crypto.randomUUID(),
        message,
        target,
        type,
      }
      const next = [...remindersRef.current, reminder]
      remindersRef.current = next
      setReminders(next)
    },
    []
  )

  const dismiss = React.useCallback((id: string) => {
    const next = notificationsRef.current.filter((n) => n.id !== id)
    notificationsRef.current = next
    setNotifications(next)
  }, [])

  const clearAll = React.useCallback(() => {
    notificationsRef.current = []
    setNotifications([])
  }, [])

  const markRead = React.useCallback((id: string) => {
    const next = notificationsRef.current.map((n) =>
      n.id === id ? { ...n, read: true } : n
    )
    notificationsRef.current = next
    setNotifications(next)
  }, [])

  // Promote every reminder whose time has come into a real notification and
  // drop it from the pending list. Shared by the mount catch-up and the tick.
  const fireDueReminders = React.useCallback((now: number) => {
    const { due, pending } = dueReminders(remindersRef.current, now)
    if (due.length === 0) return
    const created = due.map((r) =>
      createNotification(r.message, r.target, r.type)
    )
    const nextNotifications = [...created, ...notificationsRef.current].slice(
      0,
      MAX_NOTIFICATIONS
    )
    notificationsRef.current = nextNotifications
    remindersRef.current = pending
    setNotifications(nextNotifications)
    setReminders(pending)
  }, [])

  // Hydrate both arrays once on mount, firing any reminder that came due while
  // the page was closed (SSR-safe: we start empty, then load post-mount).
  React.useEffect(() => {
    const loadedNotifications = loadNotifications()
    const loadedReminders = loadReminders()
    const { due, pending } = dueReminders(loadedReminders, Date.now())
    const created = due.map((r) =>
      createNotification(r.message, r.target, r.type)
    )
    const initialNotifications = [...created, ...loadedNotifications].slice(
      0,
      MAX_NOTIFICATIONS
    )
    notificationsRef.current = initialNotifications
    remindersRef.current = pending
    setNotifications(initialNotifications)
    setReminders(pending)
    setHydrated(true)
  }, [])

  // Persist after hydration so the empty initial state never clobbers storage.
  React.useEffect(() => {
    if (hydrated) saveNotifications(notifications)
  }, [notifications, hydrated])

  React.useEffect(() => {
    if (hydrated) saveReminders(reminders)
  }, [reminders, hydrated])

  // Sweep for reminders coming due while the page is open.
  React.useEffect(() => {
    if (!hydrated) return
    const id = window.setInterval(() => fireDueReminders(Date.now()), TICK_MS)
    return () => window.clearInterval(id)
  }, [hydrated, fireDueReminders])

  const unreadCount = React.useMemo(
    () => notifications.reduce((count, n) => (n.read ? count : count + 1), 0),
    [notifications]
  )

  const value = React.useMemo<NotificationsContextValue>(
    () => ({
      clearAll,
      dismiss,
      markRead,
      notifications,
      notify,
      remind,
      unreadCount,
    }),
    [clearAll, dismiss, markRead, notifications, notify, remind, unreadCount]
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications(): NotificationsContextValue {
  const context = React.useContext(NotificationsContext)
  if (context == null) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider"
    )
  }
  return context
}
