// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure helpers for the timeline page (no React/DOM): viewer stepping and which
// spine markers the scroll progress has passed.

/** Next index when stepping the viewer by `delta`, or `null` past either end (no wrap). */
export function stepIndex(
  current: number,
  delta: -1 | 1,
  length: number
): number | null {
  const next = current + delta
  return next >= 0 && next < length ? next : null
}

/**
 * How many entries the spine has reached. `starts` are each entry's top as a
 * fraction (0..1) of the list's height, in order; `progress` is the list's
 * scroll progress (Motion `scrollYProgress`). An entry counts once the drawn
 * spine reaches its top.
 */
export function passedCount(
  starts: readonly number[],
  progress: number
): number {
  let count = 0
  for (const start of starts) {
    if (progress + 1e-6 >= start) count++
    else break
  }
  return count
}
