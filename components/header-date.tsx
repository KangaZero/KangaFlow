"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import * as React from "react"

import { useLocale } from "@/components/locale-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { useWeather, type WeatherState } from "@/hooks/use-weather"
import type { Translate } from "@/lib/i18n"
import {
  getTemperatureColor,
  getWeatherIconKey,
  WEATHER_ICON,
} from "@/lib/weather"

// Default location: Tokyo (matches the app's JA locale and the portfolio's
// origin). Overridable via props.
const DEFAULT_LATITUDE = 35.6762
const DEFAULT_LONGITUDE = 139.6503

function WeatherReadout({
  weather,
  translate,
}: {
  weather: WeatherState
  translate: Translate
}) {
  if (weather.status === "loading") {
    return <Skeleton className="h-4 w-28" />
  }
  if (weather.status === "error") {
    return (
      <span className="text-muted-foreground">
        {translate("weather.unavailable")}
      </span>
    )
  }

  const { temperature, code, isDay } = weather.data
  const Icon = WEATHER_ICON[getWeatherIconKey(code, isDay)]
  const description = translate(
    `weather.conditions.${code}.${isDay ? "day" : "night"}`
  )

  return (
    <span className="flex items-center gap-1.5">
      <Icon className="size-4" />
      <span style={{ color: getTemperatureColor(temperature) }}>
        {Math.round(temperature)}°
      </span>
      <span className="text-muted-foreground">{description}</span>
    </span>
  )
}

export function HeaderDate({
  latitude = DEFAULT_LATITUDE,
  longitude = DEFAULT_LONGITUDE,
  onReveal,
}: {
  latitude?: number
  longitude?: number
  // Fired the first time the box is hovered (wired to the "Snoopy Detective"
  // achievement by the achievements provider — Workstream F).
  onReveal?: () => void
}) {
  const { translate } = useLocale()
  const weather = useWeather(latitude, longitude)
  const [now, setNow] = React.useState<Date | null>(null)

  // Resolve the date on the client so the server render (unknown timezone)
  // cannot mismatch and warn during hydration.
  React.useEffect(() => {
    setNow(new Date())
  }, [])

  const days = translate("headerDate.days")
  const months = translate("headerDate.months")

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: hover is a progressive enhancement (an achievement easter egg); all real content stays keyboard-reachable.
    <div
      className="flex items-center gap-3 font-mono text-xs"
      onMouseEnter={onReveal}
    >
      <span className="flex flex-col">
        {now == null ? (
          <>
            <Skeleton className="h-4 w-16" />
            <Skeleton className="mt-1 h-3 w-24" />
          </>
        ) : (
          <>
            <span className="font-medium text-foreground">
              {days[now.getDay()] ?? ""}
            </span>
            <span className="text-muted-foreground">
              {`${months[now.getMonth()] ?? ""} ${now.getDate()} ${now.getFullYear()}`}
            </span>
          </>
        )}
      </span>
      <WeatherReadout translate={translate} weather={weather} />
    </div>
  )
}
