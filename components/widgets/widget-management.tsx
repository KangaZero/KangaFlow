"use client"

import { usePathname } from "next/navigation"
import { AlarmWidget } from "@/components/widgets//alarm-widget"
import { NotesWidget } from "@/components/widgets//notes-widget"
import { CalendarWidget } from "@/components/widgets/calendar-widget"
import { MediaPlayer } from "@/components/widgets/media-player"
import type { AppPath } from "@/lib/globalStates"
// import { useGlobalStates } from "@/providers/global-state-provider"
// import { useLocale } from "@/providers/locale-provider"

export function WidgetManagement(): React.JSX.Element {
  const currentPath = usePathname() as AppPath
  // const { locale } = useLocale()

  const rest = currentPath
    .replace(/^\/(?:en|ja)(?=\/|$)/, "")
    .replace(/\/$/, "")
  // const home = `/${locale}`
  // const isHome = rest === ""
  // const isAchievements = rest.startsWith("/achievements")
  // const isTimeline = rest.startsWith("/timeline")
  const isEnvironment = rest.startsWith("/environment")
  // const other = locale === "en" ? "ja" : "en"

  return (
    <>
      <MediaPlayer />
      {isEnvironment && (
        <>
          <NotesWidget />
          <AlarmWidget />
          <CalendarWidget />
        </>
      )}
    </>
  )
}
