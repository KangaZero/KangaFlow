// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import * as React from "react"

import { isWmoCode, type WmoCode } from "@/lib/weather"

// KangaFlow port of the portfolio query. The original used @tanstack/react-query;
// this repo doesn't depend on it (and shouldn't for a single call), so it's a
// plain client-side fetch hook returning the same `{ data }` surface the header
// date box consumes.

export type DailyWeatherForecast = {
  current: {
    temperature_2m: number
    is_day: number
    weather_code: WmoCode
  }
}

type GetWeatherParams = {
  latitude: number
  longitude: number
  timezone: string
  forecastDays: 1 | 3 | 5 | 7 | 10 | 11
}

type OpenMeteoCurrent = {
  current?: {
    temperature_2m?: number
    is_day?: number
    weather_code?: number
  }
}

export function getDailyWeatherForecast(props: GetWeatherParams): {
  data: DailyWeatherForecast | undefined
} {
  const { latitude, longitude, timezone, forecastDays } = props
  // biome-ignore lint/correctness/useHookAtTopLevel: this IS a hook (mirrors the portfolio's get* query API); it is only ever called at a component's top level.
  const [data, setData] = React.useState<DailyWeatherForecast | undefined>(
    undefined
  )

  // biome-ignore lint/correctness/useHookAtTopLevel: see above — hook, called at component top level.
  React.useEffect(() => {
    const controller = new AbortController()
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&models=jma_seamless&current=temperature_2m,is_day,weather_code&timezone=${timezone}&forecast_days=${forecastDays}`

    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Open-Meteo responded ${response.status}`)
        }
        const json = (await response.json()) as OpenMeteoCurrent
        const current = json.current
        if (
          current != null &&
          typeof current.temperature_2m === "number" &&
          typeof current.is_day === "number" &&
          typeof current.weather_code === "number" &&
          isWmoCode(current.weather_code)
        ) {
          setData({
            current: {
              is_day: current.is_day,
              temperature_2m: current.temperature_2m,
              weather_code: current.weather_code,
            },
          })
        }
      } catch {
        // Leave `data` undefined; the box renders its skeleton/fallback.
      }
    }

    void load()
    return () => controller.abort()
  }, [latitude, longitude, timezone, forecastDays])

  return { data }
}
