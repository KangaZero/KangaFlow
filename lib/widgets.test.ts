// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { isWidgetName, WIDGET_NAMES, widgetsOnPage } from "@/lib/widgets"

describe("widgetsOnPage", () => {
  it("offers every widget on the environment", () => {
    expect(widgetsOnPage("environment")).toEqual(WIDGET_NAMES)
  })

  it("offers only global widgets elsewhere", () => {
    expect(widgetsOnPage("home")).toEqual(["media-player"])
    expect(widgetsOnPage(undefined)).toEqual(["media-player"])
  })
})

describe("isWidgetName", () => {
  it("accepts registry names and nothing else", () => {
    expect(isWidgetName("notes")).toBe(true)
    expect(isWidgetName("Notes")).toBe(false)
    expect(isWidgetName("toString")).toBe(false)
  })
})
