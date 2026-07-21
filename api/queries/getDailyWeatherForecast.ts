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

// Cache the forecast in localStorage and only hit the network once an hour from
// the last successful fetch (Open-Meteo updates ~hourly, so anything finer is
// wasted requests).
const ONE_HOUR_MS = 60 * 60 * 1000

// `lastUpdated` is an epoch timestamp (ms) so the "over an hour" check is a
// plain subtraction; `details` is the forecast payload.
type CachedForecast = { details: DailyWeatherForecast; lastUpdated: number }

// Returns the cached forecast only if it was stored under an hour ago; otherwise
// undefined so the caller fetches fresh. Guarded: private mode / corrupt JSON
// falls through to a network fetch rather than throwing.
function readFreshForecast(key: string): DailyWeatherForecast | undefined {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return undefined
    }
    const parsed = JSON.parse(raw) as Partial<CachedForecast>
    if (
      typeof parsed.lastUpdated !== "number" ||
      parsed.details == null ||
      Date.now() - parsed.lastUpdated > ONE_HOUR_MS
    ) {
      return undefined
    }
    return parsed.details
  } catch {
    return undefined
  }
}

function writeForecast(key: string, data: DailyWeatherForecast): void {
  try {
    const entry: CachedForecast = { details: data, lastUpdated: Date.now() }
    localStorage.setItem(key, JSON.stringify(entry))
  } catch {
    // Storage unavailable (private mode / quota) — caching is best-effort.
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
    const cacheKey = `kangaflow:weather:${latitude},${longitude},${timezone},${forecastDays}`
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&models=jma_seamless&current=temperature_2m,is_day,weather_code&timezone=${timezone}&forecast_days=${forecastDays}`

    // Under an hour old? Serve the cached forecast and skip the network.
    const cached = readFreshForecast(cacheKey)
    if (cached) {
      setData(cached)
      return () => controller.abort()
    }

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
          const forecast: DailyWeatherForecast = {
            current: {
              is_day: current.is_day,
              temperature_2m: current.temperature_2m,
              weather_code: current.weather_code,
            },
          }
          setData(forecast)
          writeForecast(cacheKey, forecast)
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
