// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  buildCurrentWeatherUrl,
  getTemperatureColor,
  getWeatherIconKey,
  isWmoCode,
  parseCurrentWeather,
  readCachedWeather,
  WEATHER_CACHE_TTL_MS,
} from "@/lib/weather"

describe("weather", () => {
  it("splits clear sky into day/night icons", () => {
    expect(getWeatherIconKey(0, true)).toBe("clearDay")
    expect(getWeatherIconKey(0, false)).toBe("clearNight")
  })

  it("normalizes snow showers to the snowflake icon", () => {
    expect(getWeatherIconKey(85, true)).toBe("snowflake")
    expect(getWeatherIconKey(86, false)).toBe("snowflake")
  })

  it("guards WMO codes", () => {
    expect(isWmoCode(95)).toBe(true)
    expect(isWmoCode(1234)).toBe(false)
  })

  it("maps temperature to distinct cold/hot colour tokens", () => {
    const cold = getTemperatureColor(-5)
    const hot = getTemperatureColor(35)
    expect(cold).toContain("var(--temp-")
    expect(hot).toContain("var(--temp-")
    expect(cold).not.toBe(hot)
  })
})

const TOKYO = { forecastDays: 1, latitude: 35.66, longitude: 139.72 } as const

describe("buildCurrentWeatherUrl", () => {
  it("percent-encodes the visitor zone and the field list", () => {
    const url = buildCurrentWeatherUrl({ ...TOKYO, timeZone: "Europe/London" })
    expect(url.origin + url.pathname).toBe(
      "https://api.open-meteo.com/v1/forecast"
    )
    expect(url.search).toContain("timezone=Europe%2FLondon")
    expect(url.search).toContain(
      "current=temperature_2m%2Cis_day%2Cweather_code"
    )
    expect(url.searchParams.get("latitude")).toBe("35.66")
    expect(url.searchParams.get("forecast_days")).toBe("1")
  })

  it("lets Open-Meteo resolve the zone when the visitor's is unknown", () => {
    const url = buildCurrentWeatherUrl({ ...TOKYO, timeZone: undefined })
    expect(url.searchParams.get("timezone")).toBe("auto")
  })
})

const VALID_BODY = {
  current: { is_day: 1, temperature_2m: 18.1, weather_code: 3 },
}

describe("parseCurrentWeather", () => {
  it("maps a valid body to the UI shape", () => {
    expect(parseCurrentWeather(VALID_BODY)).toEqual({
      code: 3,
      isDay: true,
      temperature: 18.1,
    })
  })

  it.each([
    ["null", null],
    ["a string", "oops"],
    ["no current", {}],
    ["is_day out of range", { current: { ...VALID_BODY.current, is_day: 2 } }],
    [
      "unknown WMO code",
      { current: { ...VALID_BODY.current, weather_code: 4 } },
    ],
    [
      "temperature as string",
      { current: { ...VALID_BODY.current, temperature_2m: "18" } },
    ],
    [
      "non-finite temperature",
      { current: { ...VALID_BODY.current, temperature_2m: Number.NaN } },
    ],
  ])("rejects %s", (_label, body) => {
    expect(parseCurrentWeather(body)).toBeNull()
  })
})

describe("readCachedWeather", () => {
  const now = 1_000_000_000

  it("returns a fresh, valid entry", () => {
    const entry = { body: VALID_BODY, fetchedAt: now - 60_000 }
    expect(readCachedWeather(entry, now)?.temperature).toBe(18.1)
  })

  it("expires entries older than the TTL", () => {
    const entry = {
      body: VALID_BODY,
      fetchedAt: now - WEATHER_CACHE_TTL_MS - 1,
    }
    expect(readCachedWeather(entry, now)).toBeNull()
  })

  it("ignores entries stamped in the future (clock change)", () => {
    expect(
      readCachedWeather({ body: VALID_BODY, fetchedAt: now + 1 }, now)
    ).toBeNull()
  })

  it("refetches instead of trusting an old-shape or corrupt entry", () => {
    const oldShape = {
      details: { current: VALID_BODY.current },
      lastUpdated: now,
    }
    expect(readCachedWeather(oldShape, now)).toBeNull()
    expect(
      readCachedWeather({ body: { current: null }, fetchedAt: now }, now)
    ).toBeNull()
    expect(readCachedWeather("garbage", now)).toBeNull()
  })
})
