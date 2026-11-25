// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Ordering helpers for a hand of cards, generic over the id union so the
// projects hand and the achievement hands share one implementation (and one
// set of tests) while each stays typed to its own ids.

/**
 * A persisted card order (localStorage, untrusted) → a valid permutation of
 * `fallback`: unknown ids dropped, duplicates removed, missing ids appended in
 * fallback order. Anything that is not an array gives the fallback.
 */
export function parseOrder<Id extends string>(
  value: unknown,
  fallback: readonly Id[]
): Id[] {
  if (!Array.isArray(value)) return [...fallback]
  const seen = new Set<Id>()
  for (const item of value) {
    // find() both validates the untrusted item and narrows it to Id.
    const match = fallback.find((id) => id === item)
    if (match !== undefined) seen.add(match)
  }
  for (const id of fallback) seen.add(id)
  return [...seen]
}

/** Move `id` to slot `to` within `order` (clamped); returns a new array. */
export function moveInOrder<Id extends string>(
  order: readonly Id[],
  id: Id,
  to: number
): Id[] {
  const from = order.indexOf(id)
  if (from === -1) return [...order]
  const next = order.filter((item) => item !== id)
  next.splice(Math.max(0, Math.min(next.length, to)), 0, id)
  return next
}
