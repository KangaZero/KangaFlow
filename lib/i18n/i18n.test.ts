// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { interpolate, isLocale, t } from "@/lib/i18n"

describe("i18n t()", () => {
  it("returns the string for the requested locale", () => {
    expect(t("theme.terminal", "en")).toBe("Terminal theme")
    expect(t("theme.terminal", "ja")).toBe("ターミナルテーマ")
  })

  it("defaults to English when no locale is given", () => {
    expect(t("weather.loading")).toBe("Fetching weather…")
  })

  it("resolves array leaves and deep nested keys", () => {
    expect(t("headerDate.days", "en")).toHaveLength(7)
    expect(t("weather.conditions.0.day", "en")).toBe("Sunny")
    expect(t("weather.conditions.0.night", "ja")).toBe("快晴")
  })

  it("narrows locales", () => {
    expect(isLocale("ja")).toBe(true)
    expect(isLocale("de")).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })
})

describe("interpolate()", () => {
  it("fills known placeholders and repeats", () => {
    expect(interpolate("{n} of {n} {what}", { n: 3, what: "cards" })).toBe(
      "3 of 3 cards"
    )
  })

  it("leaves unknown names and non-word braces alone", () => {
    expect(interpolate("{missing} m{a-z}", {})).toBe("{missing} m{a-z}")
  })
})
