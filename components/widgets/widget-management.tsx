"use client"

import { usePathname } from "next/navigation"
import type { JSX } from "react"
import { AlarmWidget } from "@/components/widgets/alarm-widget"
import { CalendarWidget } from "@/components/widgets/calendar-widget"
import { KeyboardWidget } from "@/components/widgets/keyboard-widget"
import { MediaPlayer } from "@/components/widgets/media-player"
import { NotesWidget } from "@/components/widgets/notes-widget"
import { pageFromPathname } from "@/lib/pages"
import { type AvailableWidgetName, widgetsOnPage } from "@/lib/widgets"

// Name → element. A Record over AvailableWidgetName, so a widget added to the
// registry in lib/widgets without an element here fails the build.
const WIDGET_ELEMENTS = {
  alarm: AlarmWidget,
  calendar: CalendarWidget,
  keyboard: KeyboardWidget,
  "media-player": MediaPlayer,
  notes: NotesWidget,
} as const satisfies Record<AvailableWidgetName, () => JSX.Element | null>

export function WidgetManagement(): React.JSX.Element {
  const page = pageFromPathname(usePathname())

  return (
    <>
      {widgetsOnPage(page).map((name) => {
        const Widget = WIDGET_ELEMENTS[name]
        return <Widget key={name} />
      })}
    </>
  )
}
