// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// Pure set logic behind the "Social Stalker" achievement: it unlocks once every
// entry in `person.socials` has been opened at least once. Lives outside the
// provider so the transition is unit-testable, and mirrors `applyUnlock`'s
// contract — a no-op returns the SAME array reference, which is the dedupe
// signal callers key their state updates off.

export function addVisitedSocial(
  visited: readonly string[],
  name: string
): readonly string[] {
  return visited.includes(name) ? visited : [...visited, name]
}

export function hasVisitedEverySocial(
  visited: readonly string[],
  all: readonly string[]
): boolean {
  return all.length > 0 && all.every((name) => visited.includes(name))
}

/** Drops names that are no longer in the catalogue (socials come and go). */
export function reconcileVisitedSocials(
  visited: readonly string[],
  all: readonly string[]
): readonly string[] {
  return visited.filter((name) => all.includes(name))
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}
