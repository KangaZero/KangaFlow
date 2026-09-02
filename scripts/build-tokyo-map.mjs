// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
//
// Regenerates lib/tokyo-map-data.ts from the Global Map of Japan (地球地図日本),
// published by the Geospatial Information Authority of Japan (GSI) and mirrored
// as GeoJSON by dataofjapan/land. Attribution is required — see the banner the
// generator writes into the output file and the credit line in the map UI.
//
//   node scripts/build-tokyo-map.mjs
//
// Committing the *generated* data (not the 6.4 MB source) keeps the bundle small
// and the build offline; re-run this only when the geometry needs refreshing.

import { writeFile } from "node:fs/promises"

const SOURCE =
  "https://raw.githubusercontent.com/dataofjapan/land/master/tokyo.geojson"
const OUTPUT = new URL("../lib/tokyo-map-data.ts", import.meta.url)

// Douglas–Peucker tolerance in degrees. ~0.0012° ≈ 120 m, which is well under one
// device pixel at the size this map renders.
const TOLERANCE = 0.0012
// Drop reclaimed islets and stray slivers below ~0.15 km².
const MIN_AREA_DEG2 = 1.4e-5
const PRECISION = 4

function perpendicularDistance([x, y], [x1, y1], [x2, y2]) {
  const dx = x2 - x1
  const dy = y2 - y1
  if (dx === 0 && dy === 0) {
    return Math.hypot(x - x1, y - y1)
  }
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy)
  const clamped = Math.max(0, Math.min(1, t))
  return Math.hypot(x - (x1 + clamped * dx), y - (y1 + clamped * dy))
}

function simplify(points, tolerance) {
  if (points.length < 3) {
    return points
  }
  const first = points[0]
  const last = points[points.length - 1]
  let index = -1
  let maxDistance = 0
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], first, last)
    if (distance > maxDistance) {
      index = i
      maxDistance = distance
    }
  }
  if (maxDistance <= tolerance) {
    return [first, last]
  }
  const left = simplify(points.slice(0, index + 1), tolerance)
  const right = simplify(points.slice(index), tolerance)
  return [...left.slice(0, -1), ...right]
}

function shoelaceArea(ring) {
  let total = 0
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[(i + 1) % ring.length]
    total += x1 * y2 - x2 * y1
  }
  return Math.abs(total) / 2
}

const round = (value) => Number(value.toFixed(PRECISION))

const response = await fetch(SOURCE)
if (!response.ok) {
  throw new Error(`Fetch failed: ${response.status} ${response.statusText}`)
}
const geojson = await response.json()

const wards = []
let bounds = null

for (const feature of geojson.features) {
  if (feature.properties.area_en !== "Tokubu") {
    continue
  }
  const { coordinates, type } = feature.geometry
  // Outer rings only: the holes in these wards are all below MIN_AREA_DEG2.
  const polygons = type === "Polygon" ? [coordinates] : coordinates
  const rings = []
  for (const polygon of polygons) {
    const outer = polygon[0]
    if (shoelaceArea(outer) < MIN_AREA_DEG2) {
      continue
    }
    const ring = simplify(outer, TOLERANCE).map(([lon, lat]) => {
      bounds ??= { east: lon, north: lat, south: lat, west: lon }
      bounds.east = Math.max(bounds.east, lon)
      bounds.north = Math.max(bounds.north, lat)
      bounds.south = Math.min(bounds.south, lat)
      bounds.west = Math.min(bounds.west, lon)
      return [round(lon), round(lat)]
    })
    rings.push(ring)
  }
  if (rings.length > 0) {
    wards.push({
      name: feature.properties.ward_en.replace(/ Ku$/, ""),
      nameJa: feature.properties.ward_ja,
      rings,
    })
  }
}

wards.sort((a, b) => a.name.localeCompare(b.name))

const points = wards.reduce(
  (total, ward) => total + ward.rings.reduce((n, ring) => n + ring.length, 0),
  0
)

const body = `// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
//
// GENERATED FILE — do not edit by hand. Run \`node scripts/build-tokyo-map.mjs\`.
//
// Geometry of Tokyo's 23 special wards, simplified to ${TOLERANCE}° (~30 m) and
// rounded to ${PRECISION} decimals: ${points} points across ${wards.length} wards.
//
// Source: 地球地図日本 (Global Map of Japan), Geospatial Information Authority of
// Japan, via github.com/dataofjapan/land. Attribution to 地球地図日本 is required;
// the map UI carries it as a visible credit line.

/** \`[longitude, latitude]\`, matching GeoJSON axis order. */
export type LonLat = readonly [longitude: number, latitude: number]

export type WardRing = readonly LonLat[]

export type Ward = {
  readonly name: string
  readonly nameJa: string
  /** Outer rings only — one per disjoint landmass (reclaimed islands included). */
  readonly rings: readonly WardRing[]
}

/** Bounding box of the geometry below, used as the map's default viewport. */
export const TOKYO_WARD_BOUNDS = {
  east: ${round(bounds.east)},
  north: ${round(bounds.north)},
  south: ${round(bounds.south)},
  west: ${round(bounds.west)},
} as const

export const TOKYO_WARDS: readonly Ward[] = ${JSON.stringify(wards)}
`

await writeFile(OUTPUT, body)
console.log(`wrote ${wards.length} wards / ${points} points`)
