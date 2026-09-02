// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// Projection + geometry helpers for the vendored Tokyo ward map. Pure functions
// only: the React side (components/tokyo-map) just turns these into <path> data.

import {
  type LonLat,
  TOKYO_WARD_BOUNDS,
  TOKYO_WARDS,
  type Ward,
  type WardRing,
} from "@/lib/tokyo-map-data"

export type Bounds = {
  readonly east: number
  readonly north: number
  readonly south: number
  readonly west: number
}

export type Point = { readonly x: number; readonly y: number }

export type Projection = {
  readonly height: number
  readonly project: (lonLat: LonLat) => Point
  readonly width: number
}

const DEFAULT_WIDTH = 1000
const DEGREES_TO_RADIANS = Math.PI / 180
const PATH_PRECISION = 1

// `person.locationCoordinates` is [lat, lon] (what map APIs take); GeoJSON is
// [lon, lat]. One conversion point rather than silent axis swaps at call sites.
export function toLonLat(
  point: readonly [latitude: number, longitude: number]
): LonLat {
  const [latitude, longitude] = point
  return [longitude, latitude]
}

// Web Mercator's vertical axis. Plain equirectangular would squash Tokyo
// noticeably at 35.7°N — the shape only stays conformal with the log-tangent.
function mercatorY(latitude: number): number {
  return Math.log(Math.tan(Math.PI / 4 + (latitude * DEGREES_TO_RADIANS) / 2))
}

/**
 * Fit `bounds` to an SVG viewBox `width` wide. Height falls out of the
 * projection rather than being passed in, so the aspect ratio is always the
 * true one and nothing has to be corrected downstream.
 */
export function createProjection(
  bounds: Bounds = TOKYO_WARD_BOUNDS,
  width: number = DEFAULT_WIDTH
): Projection {
  const top = mercatorY(bounds.north)
  const bottom = mercatorY(bounds.south)
  // x and y share one scale factor — that is what conformality means here.
  const scale = width / ((bounds.east - bounds.west) * DEGREES_TO_RADIANS)

  return {
    height: (top - bottom) * scale,
    project: ([longitude, latitude]) => ({
      x: (longitude - bounds.west) * DEGREES_TO_RADIANS * scale,
      y: (top - mercatorY(latitude)) * scale,
    }),
    width,
  }
}

export function ringToPath(ring: WardRing, projection: Projection): string {
  let path = ""
  for (const [index, lonLat] of ring.entries()) {
    const { x, y } = projection.project(lonLat)
    path += `${index === 0 ? "M" : "L"}${x.toFixed(PATH_PRECISION)} ${y.toFixed(PATH_PRECISION)}`
  }
  return `${path}Z`
}

/** Even-odd ray casting: does a horizontal ray from `point` cross the ring an odd number of times? */
export function isPointInRing(point: LonLat, ring: WardRing): boolean {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const current = ring[i]
    const previous = ring[j]
    if (current == null || previous == null) {
      continue
    }
    const [xi, yi] = current
    const [xj, yj] = previous
    const straddles = yi > y !== yj > y
    if (straddles && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** Which ward contains `point`, or null when it falls in the bay or outside Tokyo. */
export function findWardAt(
  point: LonLat,
  wards: readonly Ward[] = TOKYO_WARDS
): Ward | null {
  return (
    wards.find((ward) =>
      ward.rings.some((ring) => isPointInRing(point, ring))
    ) ?? null
  )
}

/** `35.6605°N 139.7250°E` — hemisphere letters, no signs. */
export function formatCoordinates(
  point: readonly [latitude: number, longitude: number],
  digits = 4
): string {
  const [latitude, longitude] = point
  const northSouth = latitude >= 0 ? "N" : "S"
  const eastWest = longitude >= 0 ? "E" : "W"
  return `${Math.abs(latitude).toFixed(digits)}°${northSouth} ${Math.abs(longitude).toFixed(digits)}°${eastWest}`
}
