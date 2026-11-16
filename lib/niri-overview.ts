// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure layout maths for the niri environment: the live strip's column layout
// and the overview "zoom out" transforms. No React/DOM, so it's unit-testable
// and the view only feeds in measured sizes.

export type Viewport = { width: number; height: number }

/** A workspace tile's transform (origin top-left, full-viewport-sized box). */
export type TileTransform = { x: number; y: number; scale: number }

/** How far the overview zooms out (each workspace at 44% of the strip). */
export const OVERVIEW_SCALE = 0.44
/** On-screen gap between stacked workspaces in the overview (px). */
export const OVERVIEW_GAP = 34
/**
 * Gap between workspaces at full size (desktop). Neighbours sit just
 * off-screen above/below the active one, so zooming out reveals the strip
 * that was always there instead of fading new tiles in.
 */
export const DESKTOP_GAP = 60
/** Overview corner radius as it should READ on screen (px). */
export const OVERVIEW_RADIUS = 14

/**
 * Desktop (zoomed-in) placement: the active workspace fills the strip, the
 * others are stacked above/below it at full size, off-screen.
 */
export function desktopTransform(
  index: number,
  activeIndex: number,
  viewport: Viewport,
  gap: number = DESKTOP_GAP
): TileTransform {
  return { scale: 1, x: 0, y: (index - activeIndex) * (viewport.height + gap) }
}

/**
 * Overview (zoomed-out) placement: a vertical strip of workspaces at
 * `scale`, centred horizontally, with the selected one centred vertically.
 * Moving the selection glides the whole strip.
 */
export function overviewTransform(
  index: number,
  selectedIndex: number,
  viewport: Viewport,
  scale: number = OVERVIEW_SCALE,
  gap: number = OVERVIEW_GAP
): TileTransform {
  const tileHeight = viewport.height * scale
  return {
    scale,
    x: (viewport.width - viewport.width * scale) / 2,
    y:
      (viewport.height - tileHeight) / 2 +
      (index - selectedIndex) * (tileHeight + gap),
  }
}

export type StripColumn = { width: number; floating: boolean }

export type StripLayout = {
  /** Indices (into the input columns) of the tiled, non-floating columns. */
  tiled: number[]
  /** Pixel width of each tiled column, in `tiled` order. */
  widths: number[]
  /** Horizontal offset that brings the focused column into place. */
  offsetX: number
}

/** Narrowest a tiled column may render (px). */
export const MIN_COLUMN_WIDTH = 240

/**
 * The live strip's column layout: tiled column widths (a share of the strip,
 * at least MIN_COLUMN_WIDTH) and the x offset that centres the focused column
 * (centre mode) or pulls its left edge to the padding (otherwise). A floated
 * focused column keeps the strip anchored on its first tiled column.
 */
export function stripLayout(
  columns: readonly StripColumn[],
  focused: number,
  stripWidth: number,
  centerAligned: boolean,
  pad: number,
  gap: number
): StripLayout {
  const tiled = columns.flatMap((col, index) => (col.floating ? [] : [index]))
  const widths = tiled.map((index) =>
    Math.max(MIN_COLUMN_WIDTH, (columns[index]?.width ?? 0) * stripWidth)
  )
  let cursor = pad
  const centers = widths.map((w) => {
    const center = cursor + w / 2
    cursor += w + gap
    return center
  })
  const focusedTiledPos = tiled.indexOf(focused)
  const focusedPos = focusedTiledPos === -1 ? 0 : focusedTiledPos
  const focusedCenter = centers[focusedPos] ?? stripWidth / 2
  const focusedWidth = widths[focusedPos] ?? 0
  const offsetX = centerAligned
    ? stripWidth / 2 - focusedCenter
    : pad - (focusedCenter - focusedWidth / 2)
  return { offsetX, tiled, widths }
}
