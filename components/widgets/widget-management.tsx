"use client"

import dynamic from "next/dynamic"
import { usePathname } from "next/navigation"
import type { ComponentType } from "react"

import { MediaPlayer } from "@/components/widgets/media-player"
import { pageFromPathname } from "@/lib/pages"
import { type AvailableWidgetName, widgetsOnPage } from "@/lib/widgets"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Only the media player is global (lib/widgets); the other four render on the
// environment page alone, so they are split into their own chunks instead of
// shipping with every page's layout. SSR stays on: the environment page still
// prerenders them, and Next preloads their chunks there.
const AlarmWidget = dynamic(() =>
  import("@/components/widgets/alarm-widget").then((m) => m.AlarmWidget)
)
const CalendarWidget = dynamic(() =>
  import("@/components/widgets/calendar-widget").then((m) => m.CalendarWidget)
)
const KeyboardWidget = dynamic(() =>
  import("@/components/widgets/keyboard-widget").then((m) => m.KeyboardWidget)
)
const NotesWidget = dynamic(() =>
  import("@/components/widgets/notes-widget").then((m) => m.NotesWidget)
)

// Name → element. A Record over AvailableWidgetName, so a widget added to the
// registry in lib/widgets without an element here fails the build.
const WIDGET_ELEMENTS = {
  alarm: AlarmWidget,
  calendar: CalendarWidget,
  keyboard: KeyboardWidget,
  "media-player": MediaPlayer,
  notes: NotesWidget,
} as const satisfies Record<AvailableWidgetName, ComponentType>

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
