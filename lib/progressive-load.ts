// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The blur-up loading state machine shared by <ProgressiveImage> and
// useProgressiveBackground. Pure (no React/DOM; `servedFromCache` only reads
// the Performance timeline) so it is unit-testable.
//
//   pending   rendered on the server: the real image is visible over its
//             placeholder until the client decides (it may already be loaded)
//   loading   placeholder only; the real image is held at opacity 0
//   revealing the real image is decoded and fading in (opacity only)
//   ready     the fade finished (or was skipped): placeholder removed
//   error     the real image failed: the placeholder stays

export const LOAD_PHASES = [
  "pending",
  "loading",
  "revealing",
  "ready",
  "error",
] as const
export type LoadPhase = (typeof LOAD_PHASES)[number]

export type LoadEvent =
  /** At mount the image was already decoded/cached: show it, no fade. */
  | "cached"
  /** At mount the image was still downloading. */
  | "incomplete"
  /** `load` fired and `decode()` settled. */
  | "decoded"
  /** `error` fired, or the image was already broken at mount. */
  | "failed"
  /** The opacity fade ended. */
  | "revealed"

export function nextLoadPhase(phase: LoadPhase, event: LoadEvent): LoadPhase {
  switch (event) {
    case "cached":
      return phase === "error" ? phase : "ready"
    case "incomplete":
      return phase === "pending" ? "loading" : phase
    case "decoded":
      // Still "pending" = it finished before the client looked: it is
      // already on screen, so skip the fade rather than hide it first.
      if (phase === "pending") return "ready"
      return phase === "loading" ? "revealing" : phase
    case "failed":
      return phase === "ready" ? phase : "error"
    case "revealed":
      return phase === "revealing" ? "ready" : phase
  }
}

/**
 * A load that settles this soon after it started was local (a warm reload
 * clears the in-memory image cache, so `complete` is false at mount even though
 * the bytes are on disk). Fading in from a placeholder there would just be a
 * placeholder flash, so such loads count as cached and appear at once.
 */
export const INSTANT_LOAD_MS = 150

export type Settled = {
  /** Time from mount/preload start to decoded. */
  elapsedMs: number
  /** The response came from the HTTP cache (see `isCacheHit`). */
  fromCache: boolean
}

/** The event for a load that has finished and decoded. */
export const settledEvent = ({ elapsedMs, fromCache }: Settled): LoadEvent =>
  fromCache || elapsedMs < INSTANT_LOAD_MS ? "cached" : "decoded"

/**
 * Resource Timing marks a response served from the HTTP cache with a zero
 * `transferSize` (nothing crossed the network) but a non-zero body. This
 * catches lazy images that start loading long after mount, where elapsed time
 * says nothing about the cache.
 */
export const isCacheHit = (
  entry: Pick<PerformanceResourceTiming, "decodedBodySize" | "transferSize">
): boolean => entry.transferSize === 0 && entry.decodedBodySize > 0

/** Whether the latest fetch of `url` (absolute) was an HTTP cache hit. */
export function servedFromCache(url: string): boolean {
  const entry = performance.getEntriesByName(url, "resource").at(-1)
  return entry instanceof PerformanceResourceTiming && isCacheHit(entry)
}

/** The subset of HTMLImageElement read at mount (keeps this module DOM-free). */
export type ImageSnapshot = { complete: boolean; naturalWidth: number }

/**
 * Classifies an image the moment it mounts. `complete` alone is not enough:
 * it is also true for a broken image, which has no intrinsic width.
 */
export function mountEvent({
  complete,
  naturalWidth,
}: ImageSnapshot): LoadEvent {
  if (!complete) return "incomplete"
  return naturalWidth > 0 ? "cached" : "failed"
}
