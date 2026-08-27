// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import type * as THREE from "three"
import { describe, expect, it } from "vitest"

import { panelShapes } from "@/components/canvasui/GlassObject"

/** Bounding box of a shape's outline, sampled densely enough for the arcs. */
function bounds(shape: THREE.Shape): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  const points = shape.getPoints(32)
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return {
    maxX: Math.max(...xs),
    maxY: Math.max(...ys),
    minX: Math.min(...xs),
    minY: Math.min(...ys),
  }
}

/**
 * Distance from the sharp top-right corner of the panel's bounding box to the
 * nearest point on the outline: 0 for a square corner, growing as the corner
 * is rounded away.
 */
function cornerGap(shape: THREE.Shape, aspect: number): number {
  const corner = { x: aspect / 2, y: 0.5 }
  return Math.min(
    ...shape
      .getPoints(32)
      .map((p) => Math.hypot(p.x - corner.x, p.y - corner.y))
  )
}

describe("panelShapes", () => {
  it("returns a single solid outline with no holes", () => {
    const shapes = panelShapes(0.95, 0.03)
    expect(shapes).toHaveLength(1)
    expect(shapes[0]?.holes).toHaveLength(0)
  })

  it("spans aspect x 1, centred on the origin", () => {
    const aspect = 0.95
    const shape = panelShapes(aspect, 0.03)[0]
    expect(shape).toBeDefined()
    if (!shape) return
    const box = bounds(shape)
    expect(box.minX).toBeCloseTo(-aspect / 2, 6)
    expect(box.maxX).toBeCloseTo(aspect / 2, 6)
    expect(box.minY).toBeCloseTo(-0.5, 6)
    expect(box.maxY).toBeCloseTo(0.5, 6)
  })

  it("keeps the bounding box across aspects", () => {
    for (const aspect of [0.25, 1, 3.5]) {
      const shape = panelShapes(aspect, 0.1)[0]
      expect(shape).toBeDefined()
      if (!shape) continue
      const box = bounds(shape)
      expect(box.maxX - box.minX).toBeCloseTo(aspect, 6)
      expect(box.maxY - box.minY).toBeCloseTo(1, 6)
    }
  })

  it("leaves square corners at radius 0", () => {
    const shape = panelShapes(2, 0)[0]
    expect(shape).toBeDefined()
    if (!shape) return
    expect(cornerGap(shape, 2)).toBeCloseTo(0, 6)
  })

  it("clamps degenerate radii instead of self-intersecting", () => {
    for (const radius of [-1, 0.5, 4]) {
      const shape = panelShapes(1.6, radius)[0]
      expect(shape).toBeDefined()
      if (!shape) continue
      const box = bounds(shape)
      expect(box.maxX - box.minX).toBeCloseTo(1.6, 6)
      expect(box.maxY - box.minY).toBeCloseTo(1, 6)
      expect(shape.getPoints(32).length).toBeGreaterThan(3)
    }
  })

  it("cuts deeper into the corners as the radius grows", () => {
    const tight = panelShapes(1, 0.02)[0]
    const round = panelShapes(1, 0.4)[0]
    expect(tight).toBeDefined()
    expect(round).toBeDefined()
    if (!(tight && round)) return
    expect(cornerGap(round, 1)).toBeGreaterThan(cornerGap(tight, 1))
  })
})
