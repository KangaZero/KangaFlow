// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  getTemperatureColor,
  getWeatherIconKey,
  isWmoCode,
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

  it("maps temperature to distinct cold/hot oklch colours", () => {
    const cold = getTemperatureColor(-5)
    const hot = getTemperatureColor(35)
    expect(cold).toContain("oklch")
    expect(hot).toContain("oklch")
    expect(cold).not.toBe(hot)
  })
})
