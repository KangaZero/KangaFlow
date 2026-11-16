// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  DESKTOP_GAP,
  desktopTransform,
  MIN_COLUMN_WIDTH,
  OVERVIEW_GAP,
  OVERVIEW_SCALE,
  overviewTransform,
  stripLayout,
} from "@/lib/niri-overview"

const VP = { height: 600, width: 1000 }

describe("desktopTransform", () => {
  it("puts the active workspace at full size in place", () => {
    expect(desktopTransform(1, 1, VP)).toEqual({ scale: 1, x: 0, y: 0 })
  })

  it("stacks neighbours off-screen above and below", () => {
    expect(desktopTransform(0, 1, VP).y).toBe(-(VP.height + DESKTOP_GAP))
    expect(desktopTransform(2, 1, VP).y).toBe(VP.height + DESKTOP_GAP)
  })
})

describe("overviewTransform", () => {
  it("centres the selected workspace at the overview scale", () => {
    const t = overviewTransform(1, 1, VP)
    expect(t.scale).toBe(OVERVIEW_SCALE)
    expect(t.x + (VP.width * t.scale) / 2).toBeCloseTo(VP.width / 2)
    expect(t.y + (VP.height * t.scale) / 2).toBeCloseTo(VP.height / 2)
  })

  it("spaces neighbours by one tile height plus the gap", () => {
    const step = VP.height * OVERVIEW_SCALE + OVERVIEW_GAP
    expect(
      overviewTransform(2, 1, VP).y - overviewTransform(1, 1, VP).y
    ).toBeCloseTo(step)
    expect(
      overviewTransform(1, 1, VP).y - overviewTransform(0, 1, VP).y
    ).toBeCloseTo(step)
  })

  it("moving the selection shifts every tile by the same step (the strip glides)", () => {
    const step = VP.height * OVERVIEW_SCALE + OVERVIEW_GAP
    for (const i of [0, 1, 2]) {
      expect(
        overviewTransform(i, 1, VP).y - overviewTransform(i, 2, VP).y
      ).toBeCloseTo(step)
    }
  })
})

describe("stripLayout", () => {
  const cols = [
    { floating: false, width: 0.5 },
    { floating: true, width: 0.5 },
    { floating: false, width: 0.1 },
  ]

  it("skips floating columns and enforces the minimum width", () => {
    const layout = stripLayout(cols, 0, 1000, true, 6, 6)
    expect(layout.tiled).toEqual([0, 2])
    expect(layout.widths).toEqual([500, MIN_COLUMN_WIDTH])
  })

  it("centre mode puts the focused column's midpoint at the strip midpoint", () => {
    const layout = stripLayout(cols, 2, 1000, true, 6, 6)
    // column 2 centre = pad + 500 + gap + 240/2 = 632 → offset 500 − 632
    expect(layout.offsetX).toBe(500 - 632)
  })

  it("non-centre mode pulls the focused column's left edge to the padding", () => {
    const layout = stripLayout(cols, 2, 1000, false, 6, 6)
    expect(layout.offsetX).toBe(6 - (632 - 120))
  })

  it("a floated focused column anchors on the first tiled column", () => {
    const layout = stripLayout(cols, 1, 1000, true, 6, 6)
    expect(layout.offsetX).toBe(500 - (6 + 250))
  })

  it("an empty workspace yields no columns and a zero offset", () => {
    expect(stripLayout([], 0, 1000, true, 6, 6)).toEqual({
      offsetX: 0,
      tiled: [],
      widths: [],
    })
  })
})
