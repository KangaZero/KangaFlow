// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { interpolate, isLocale, t, translations } from "@/lib/i18n"

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

// Flatten a dictionary to [path, string] pairs (array leaves included).
function leaves(node: unknown, path = ""): [string, string][] {
  if (typeof node === "string") return [[path, node]]
  if (typeof node !== "object" || node === null) return []
  return Object.entries(node).flatMap(([key, value]) =>
    leaves(value, path === "" ? key : `${path}.${key}`)
  )
}

const placeholders = (text: string): string[] =>
  [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] ?? "").toSorted()

describe("dictionary placeholders", () => {
  // Types prove both locales have every key, but not that a translation kept
  // the `{name}` slots interpolate() fills — a dropped one renders blank.
  const ja = new Map(leaves(translations.ja))
  it.each(leaves(translations.en).filter(([, text]) => text.includes("{")))(
    "%s keeps its placeholders in ja",
    (path, text) => {
      expect(placeholders(ja.get(path) ?? "")).toEqual(placeholders(text))
    }
  )
})
