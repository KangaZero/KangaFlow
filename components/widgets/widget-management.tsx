"use client"

import { usePathname } from "next/navigation"
import type { JSX } from "react"
import { AlarmWidget } from "@/components/widgets/alarm-widget"
import { CalendarWidget } from "@/components/widgets/calendar-widget"
import { MediaPlayer } from "@/components/widgets/media-player"
import { NotesWidget } from "@/components/widgets/notes-widget"
import type { AppPath } from "@/lib/globalStates"

export const AVAILABLE_WIDGETS = [
  { element: MediaPlayer, global: true, name: "media-player" },
  { element: NotesWidget, global: false, name: "notes" },
  { element: AlarmWidget, global: false, name: "alarm" },
  { element: CalendarWidget, global: false, name: "calendar" },
] as const satisfies readonly {
  element: () => JSX.Element
  global: boolean
  name: string
}[]

export type AvailableWidgetName = (typeof AVAILABLE_WIDGETS)[number]["name"]

export const WIDGET_NAMES: AvailableWidgetName[] = AVAILABLE_WIDGETS.map(
  (widget) => widget.name
)

export function WidgetManagement(): React.JSX.Element {
  const currentPath = usePathname() as AppPath

  const rest = currentPath
    .replace(/^\/(?:en|ja)(?=\/|$)/, "")
    .replace(/\/$/, "")

  const isEnvironment = rest.startsWith("/environment")

  return (
    <>
      {AVAILABLE_WIDGETS.filter(
        (widget) => ("global" in widget && widget.global) || isEnvironment
      ).map(({ name, element: Widget }) => (
        <Widget key={name} />
      ))}
    </>
  )
}
