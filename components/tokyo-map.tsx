"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useMemo } from "react"

import {
  createProjection,
  findWardAt,
  ringToPath,
  toLonLat,
} from "@/lib/tokyo-map"
import { TOKYO_WARDS } from "@/lib/tokyo-map-data"
import { cn } from "@/lib/utils"

// Marker radii are in viewBox units (the projection is 1000 wide), so they scale
// with the map instead of with the rendered pixel size.
const MARKER_RADIUS = 9
const PULSE_RADIUS = 20

export function TokyoMap({
  className,
  label,
  point,
}: {
  className?: string
  label: string
  /** `[latitude, longitude]`, matching `person.locationCoordinates`. */
  point: readonly [latitude: number, longitude: number]
}) {
  const { home, marker, projection, wards } = useMemo(() => {
    const nextProjection = createProjection()
    const lonLat = toLonLat(point)
    return {
      home: findWardAt(lonLat),
      marker: nextProjection.project(lonLat),
      projection: nextProjection,
      wards: TOKYO_WARDS.map((ward) => ({
        name: ward.name,
        paths: ward.rings.map((ring) => ringToPath(ring, nextProjection)),
      })),
    }
  }, [point])

  return (
    <svg
      aria-label={label}
      className={cn("h-auto w-full rounded-sm bg-muted/40", className)}
      role="img"
      viewBox={`0 0 ${projection.width} ${projection.height}`}
    >
      {wards.map((ward) =>
        ward.paths.map((path) => (
          <path
            className={cn(
              "stroke-[1.5] stroke-border",
              // The ward the office sits in reads as the figure; the rest is ground.
              ward.name === home?.name
                ? "fill-primary/25"
                : "fill-muted-foreground/15"
            )}
            d={path}
            key={path}
          />
        ))
      )}
      <circle
        className="fill-primary/30"
        cx={marker.x}
        cy={marker.y}
        r={PULSE_RADIUS}
      />
      <circle
        className="fill-primary stroke-[3] stroke-background"
        cx={marker.x}
        cy={marker.y}
        r={MARKER_RADIUS}
      />
    </svg>
  )
}
