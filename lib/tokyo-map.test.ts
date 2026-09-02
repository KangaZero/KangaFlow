// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { person } from "@/lib/person"
import {
  createProjection,
  findWardAt,
  formatCoordinates,
  isPointInRing,
  ringToPath,
  toLonLat,
} from "@/lib/tokyo-map"
import {
  type LonLat,
  TOKYO_WARD_BOUNDS,
  TOKYO_WARDS,
} from "@/lib/tokyo-map-data"

const HOME: LonLat = toLonLat(person.locationCoordinates)

describe("toLonLat", () => {
  it("swaps [lat, lon] into GeoJSON order", () => {
    expect(toLonLat([35.66, 139.72])).toEqual([139.72, 35.66])
  })
})

describe("createProjection", () => {
  const projection = createProjection()

  it("anchors the north-west corner at the viewBox origin", () => {
    const { x, y } = projection.project([
      TOKYO_WARD_BOUNDS.west,
      TOKYO_WARD_BOUNDS.north,
    ])
    expect(x).toBeCloseTo(0, 6)
    expect(y).toBeCloseTo(0, 6)
  })

  it("stretches the east edge to the full width", () => {
    const { x } = projection.project([
      TOKYO_WARD_BOUNDS.east,
      TOKYO_WARD_BOUNDS.north,
    ])
    expect(x).toBeCloseTo(projection.width, 6)
  })

  it("derives a positive height that grows with latitude span", () => {
    expect(projection.height).toBeGreaterThan(0)
    const wider = createProjection({
      ...TOKYO_WARD_BOUNDS,
      south: TOKYO_WARD_BOUNDS.south - 0.5,
    })
    expect(wider.height).toBeGreaterThan(projection.height)
  })

  it("is conformal: a square degree-box is taller than it is wide at 35°N", () => {
    // Mercator stretches latitude by 1/cos(φ) ≈ 1.23 at Tokyo. An
    // equirectangular projection would return exactly 1.0 here and shear the map.
    const square = createProjection({
      east: 140,
      north: 36,
      south: 35,
      west: 139,
    })
    expect(square.height / square.width).toBeCloseTo(1.229, 2)
  })
})

describe("ringToPath", () => {
  it("emits a closed SVG path", () => {
    const projection = createProjection(
      { east: 1, north: 1, south: 0, west: 0 },
      100
    )
    const path = ringToPath(
      [
        [0, 0],
        [1, 0],
        [1, 1],
      ],
      projection
    )
    expect(path.startsWith("M")).toBe(true)
    expect(path.endsWith("Z")).toBe(true)
    expect(path.match(/L/g)).toHaveLength(2)
  })
})

describe("isPointInRing", () => {
  const square: LonLat[] = [
    [0, 0],
    [2, 0],
    [2, 2],
    [0, 2],
  ]

  it("detects inside and outside", () => {
    expect(isPointInRing([1, 1], square)).toBe(true)
    expect(isPointInRing([3, 1], square)).toBe(false)
    expect(isPointInRing([1, 3], square)).toBe(false)
  })
})

describe("findWardAt", () => {
  it("locates the workplace in Minato", () => {
    expect(findWardAt(HOME)?.name).toBe("Minato")
    expect(findWardAt(HOME)?.nameJa).toBe("港区")
  })

  it("returns null out in Tokyo Bay", () => {
    expect(findWardAt([139.9, 35.55])).toBeNull()
  })
})

describe("ward data", () => {
  it("covers all 23 special wards with non-empty rings", () => {
    expect(TOKYO_WARDS).toHaveLength(23)
    for (const ward of TOKYO_WARDS) {
      expect(ward.rings.length).toBeGreaterThan(0)
      for (const ring of ward.rings) {
        expect(ring.length).toBeGreaterThan(2)
      }
    }
  })

  it("stays inside its own declared bounds", () => {
    for (const ward of TOKYO_WARDS) {
      for (const ring of ward.rings) {
        for (const [longitude, latitude] of ring) {
          expect(longitude).toBeGreaterThanOrEqual(TOKYO_WARD_BOUNDS.west)
          expect(longitude).toBeLessThanOrEqual(TOKYO_WARD_BOUNDS.east)
          expect(latitude).toBeGreaterThanOrEqual(TOKYO_WARD_BOUNDS.south)
          expect(latitude).toBeLessThanOrEqual(TOKYO_WARD_BOUNDS.north)
        }
      }
    }
  })
})

describe("formatCoordinates", () => {
  it("formats with hemisphere letters instead of signs", () => {
    expect(formatCoordinates([35.660504, 139.724981])).toBe(
      "35.6605°N 139.7250°E"
    )
    expect(formatCoordinates([-33.8688, -151.2093], 2)).toBe("33.87°S 151.21°W")
  })
})
