// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import * as React from "react"

import { isWmoCode, type WmoCode } from "@/lib/weather"

type WeatherData = {
  temperature: number
  code: WmoCode
  isDay: boolean
}

// Discriminated union so consumers narrow on `status` and get typed `data`.
export type WeatherState =
  | { status: "loading"; data: null }
  | { status: "success"; data: WeatherData }
  | { status: "error"; data: null }

// Only the fields we request from Open-Meteo's `current` block; all optional
// because the payload is untrusted at the type level.
type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number
    weather_code?: number
    is_day?: number
  }
}

// Live client-side fetch from Open-Meteo (no API key). Re-fetches if the
// coordinates change; aborts the in-flight request on unmount.
export function useWeather(latitude: number, longitude: number): WeatherState {
  const [state, setState] = React.useState<WeatherState>({
    data: null,
    status: "loading",
  })

  React.useEffect(() => {
    const controller = new AbortController()
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,is_day`

    async function load() {
      try {
        const response = await fetch(url, { signal: controller.signal })
        if (!response.ok) {
          throw new Error(`Open-Meteo responded ${response.status}`)
        }
        const json = (await response.json()) as OpenMeteoResponse
        const current = json.current
        if (
          current == null ||
          typeof current.temperature_2m !== "number" ||
          typeof current.weather_code !== "number" ||
          !isWmoCode(current.weather_code)
        ) {
          setState({ data: null, status: "error" })
          return
        }
        setState({
          data: {
            code: current.weather_code,
            isDay: current.is_day === 1,
            temperature: current.temperature_2m,
          },
          status: "success",
        })
      } catch {
        if (!controller.signal.aborted) {
          setState({ data: null, status: "error" })
        }
      }
    }

    void load()
    return () => controller.abort()
  }, [latitude, longitude])

  return state
}
