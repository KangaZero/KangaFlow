// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { useEffect, useState } from "react"

import { safeLocalStorage } from "@/lib/safe-storage"
import { getVisitorTimeZone } from "@/lib/timezone"
import {
  buildCurrentWeatherUrl,
  type CachedWeather,
  type CurrentWeather,
  type ForecastDays,
  parseCurrentWeather,
  readCachedWeather,
  type WeatherState,
} from "@/lib/weather"

// Plain client-side fetch hook (no react-query for a single call). URL
// building, validation and cache freshness are pure helpers in lib/weather.

/** Open-Meteo normally answers in ~2s; past this, show the error state. */
const FETCH_TIMEOUT_MS = 8000

// Bump when the cached shape changes so old entries are ignored, not misread.
const CACHE_VERSION = "v2"

type WeatherForecastOptions = {
  forecastDays: ForecastDays
  latitude: number
  longitude: number
}

export function useWeatherForecast({
  forecastDays,
  latitude,
  longitude,
}: WeatherForecastOptions): WeatherState {
  const [state, setState] = useState<WeatherState>({ status: "loading" })

  useEffect(() => {
    // Resolved inside the effect, never at module scope: the static export
    // pre-renders on the build machine, whose zone is not the visitor's.
    const timeZone = getVisitorTimeZone()
    const cacheKey = `kangaflow:weather:${CACHE_VERSION}:${latitude},${longitude},${timeZone ?? "auto"},${forecastDays}`

    const cached = safeLocalStorage.getJson<CurrentWeather | null>(
      cacheKey,
      null,
      (raw) => readCachedWeather(raw, Date.now())
    )
    if (cached) {
      setState({ status: "success", weather: cached })
      return
    }
    setState({ status: "loading" })

    // Two reasons to stop: the effect is torn down (unmount / new coords), or
    // the API hangs. One combined signal aborts the fetch for either.
    const teardown = new AbortController()
    const signal = AbortSignal.any([
      teardown.signal,
      AbortSignal.timeout(FETCH_TIMEOUT_MS),
    ])

    async function load(): Promise<CurrentWeather | null> {
      try {
        const response = await fetch(
          buildCurrentWeatherUrl({
            forecastDays,
            latitude,
            longitude,
            timeZone,
          }),
          { signal }
        )
        if (!response.ok) {
          return null
        }
        const body: unknown = await response.json()
        const weather = parseCurrentWeather(body)
        if (weather) {
          const entry: CachedWeather = { body, fetchedAt: Date.now() }
          safeLocalStorage.setJson(cacheKey, entry)
        }
        return weather
      } catch {
        // Network failure, timeout or teardown abort — all end up as null.
        return null
      }
    }

    void load().then((weather) => {
      // Torn down: this effect's result is stale, so it must not write state.
      if (teardown.signal.aborted) {
        return
      }
      setState(weather ? { status: "success", weather } : { status: "error" })
    })

    return () => teardown.abort()
  }, [forecastDays, latitude, longitude])

  return state
}
