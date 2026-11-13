// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  type LucideIcon,
  Moon,
  Snowflake,
  Sun,
} from "lucide-react"

import { isRecord } from "@/lib/typescript-hooks/is-record"

// WMO weather-interpretation codes emitted by Open-Meteo. This is the single
// source of truth for the code union; the i18n `weather.conditions.*` keys and
// the icon map below must both cover exactly this set.
export const WMO_CODES = [
  0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77,
  80, 81, 82, 85, 86, 95, 96, 99,
] as const

export type WmoCode = (typeof WMO_CODES)[number]

export function isWmoCode(value: number): value is WmoCode {
  return (WMO_CODES as readonly number[]).includes(value)
}

// Named icon slots (decoupled from lucide so the mapping reads by intent).
export type WeatherIconKey =
  | "clearDay"
  | "clearNight"
  | "cloudy"
  | "cloudyDay"
  | "cloudyNight"
  | "foggy"
  | "rainy"
  | "drizzle"
  | "snowflake"
  | "thunderstorm"

export const WEATHER_ICON: Record<WeatherIconKey, LucideIcon> = {
  clearDay: Sun,
  clearNight: Moon,
  cloudy: Cloud,
  cloudyDay: CloudSun,
  cloudyNight: CloudMoon,
  drizzle: CloudDrizzle,
  foggy: CloudFog,
  rainy: CloudRain,
  snowflake: Snowflake,
  thunderstorm: CloudLightning,
}

// Code -> icon slot, split by day/night (only clear/partly-cloudy differ).
// Snow showers (85/86) use `snowflake` (the portfolio's stray `snow` slot was
// not in the icon-key union — normalized here).
const WMO_ICON: Record<
  WmoCode,
  { day: WeatherIconKey; night: WeatherIconKey }
> = {
  0: { day: "clearDay", night: "clearNight" },
  1: { day: "clearDay", night: "clearNight" },
  2: { day: "cloudyDay", night: "cloudyNight" },
  3: { day: "cloudy", night: "cloudy" },
  45: { day: "foggy", night: "foggy" },
  48: { day: "foggy", night: "foggy" },
  51: { day: "drizzle", night: "drizzle" },
  53: { day: "drizzle", night: "drizzle" },
  55: { day: "drizzle", night: "drizzle" },
  56: { day: "drizzle", night: "drizzle" },
  57: { day: "drizzle", night: "drizzle" },
  61: { day: "rainy", night: "rainy" },
  63: { day: "rainy", night: "rainy" },
  65: { day: "rainy", night: "rainy" },
  66: { day: "rainy", night: "rainy" },
  67: { day: "rainy", night: "rainy" },
  71: { day: "snowflake", night: "snowflake" },
  73: { day: "snowflake", night: "snowflake" },
  75: { day: "snowflake", night: "snowflake" },
  77: { day: "snowflake", night: "snowflake" },
  80: { day: "rainy", night: "rainy" },
  81: { day: "rainy", night: "rainy" },
  82: { day: "rainy", night: "rainy" },
  85: { day: "snowflake", night: "snowflake" },
  86: { day: "snowflake", night: "snowflake" },
  95: { day: "thunderstorm", night: "thunderstorm" },
  96: { day: "thunderstorm", night: "thunderstorm" },
  99: { day: "thunderstorm", night: "thunderstorm" },
}

export function getWeatherIconKey(
  code: WmoCode,
  isDay: boolean
): WeatherIconKey {
  const pair = WMO_ICON[code]
  return isDay ? pair.day : pair.night
}

// Map a Celsius temperature to a colour token, cold (blue) → hot (red). Values
// live in globals.css (`--temp-*`); this stays pure and bucketed so it is
// trivially unit-testable. `switch (true)` matches top-down, so each case only
// needs its upper bound; default catches NaN (missing forecast data).
export function getTemperatureColor(celsius: number): string {
  switch (true) {
    case celsius <= 0:
      return "var(--temp-cold)"
    case celsius <= 15:
      return "var(--temp-cool)"
    case celsius <= 25:
      return "var(--temp-warm)"
    case celsius > 25:
      return "var(--temp-hot)"
    default:
      return "var(--temp-unknown)"
  }
}

// ── Open-Meteo current-weather query ────────────────────────────────────────
// Pure pieces of the fetch so they are unit-testable; the React hook in
// api/queries/useWeatherForecast only wires them to fetch + storage.
// API reference: https://open-meteo.com/en/docs

/** UI-facing weather. Open-Meteo's snake_case stays inside this module. */
export type CurrentWeather = {
  code: WmoCode
  isDay: boolean
  temperature: number
}

/** "error" is distinct from "loading" so a failed fetch never shows a skeleton forever. */
export type WeatherState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "success"; weather: CurrentWeather }

export type ForecastDays = 1 | 3 | 5 | 7 | 10 | 11

export type CurrentWeatherQuery = {
  forecastDays: ForecastDays
  latitude: number
  longitude: number
  /** Visitor's IANA zone; `undefined` lets Open-Meteo resolve it from the coordinates. */
  timeZone: string | undefined
}

export const OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

/** Open-Meteo refreshes roughly hourly, so a finer cache only wastes requests. */
export const WEATHER_CACHE_TTL_MS = 60 * 60 * 1000

const CURRENT_FIELDS = ["temperature_2m", "is_day", "weather_code"] as const

// URLSearchParams percent-encodes every value (the "/" in "Europe/London", the
// commas in the field list), which a template literal silently did not.
export function buildCurrentWeatherUrl(query: CurrentWeatherQuery): URL {
  const url = new URL(OPEN_METEO_FORECAST_URL)
  url.search = new URLSearchParams({
    current: CURRENT_FIELDS.join(","),
    forecast_days: String(query.forecastDays),
    latitude: String(query.latitude),
    longitude: String(query.longitude),
    models: "jma_seamless",
    timezone: query.timeZone ?? "auto",
  }).toString()
  return url
}

/**
 * Validates an Open-Meteo response body (network or cache — both are
 * `unknown`) and maps it to `CurrentWeather`. `null` on any shape mismatch.
 */
export function parseCurrentWeather(body: unknown): CurrentWeather | null {
  if (!isRecord(body) || !isRecord(body.current)) {
    return null
  }
  const { temperature_2m, is_day, weather_code } = body.current
  if (
    typeof temperature_2m !== "number" ||
    !Number.isFinite(temperature_2m) ||
    (is_day !== 0 && is_day !== 1) ||
    typeof weather_code !== "number" ||
    !isWmoCode(weather_code)
  ) {
    return null
  }
  return {
    code: weather_code,
    isDay: is_day === 1,
    temperature: temperature_2m,
  }
}

/** What the hook persists: the raw body, re-validated on every read. */
export type CachedWeather = { body: unknown; fetchedAt: number }

/**
 * A cached entry is usable only if it is under the TTL old and its body still
 * passes `parseCurrentWeather` — so a corrupt or old-shape entry refetches
 * instead of crashing the header.
 */
export function readCachedWeather(
  raw: unknown,
  now: number
): CurrentWeather | null {
  if (!isRecord(raw) || typeof raw.fetchedAt !== "number") {
    return null
  }
  const age = now - raw.fetchedAt
  if (age < 0 || age > WEATHER_CACHE_TTL_MS) {
    return null
  }
  return parseCurrentWeather(raw.body)
}
