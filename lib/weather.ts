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
