// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { BAR_POSITIONS } from "@/components/niri/settings"
import { barTooltipSide, trackProgress } from "@/lib/niri-bar"

describe("barTooltipSide", () => {
  it("always opens away from the bar's screen edge", () => {
    expect(barTooltipSide("top")).toBe("bottom")
    expect(barTooltipSide("bottom")).toBe("top")
    expect(barTooltipSide("left")).toBe("right")
    expect(barTooltipSide("right")).toBe("left")
  })

  it("covers every configurable bar position", () => {
    for (const position of BAR_POSITIONS) {
      expect(barTooltipSide(position)).not.toBe(position)
    }
  })
})

describe("trackProgress", () => {
  it("is the played fraction, clamped to 0..1", () => {
    expect(trackProgress(30, 120)).toBe(0.25)
    expect(trackProgress(500, 120)).toBe(1)
    expect(trackProgress(-5, 120)).toBe(0)
  })

  it("is 0 for unknown durations or non-finite times", () => {
    expect(trackProgress(30, 0)).toBe(0)
    expect(trackProgress(Number.NaN, 120)).toBe(0)
  })
})
