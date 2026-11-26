// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// Fraction of the viewport height, from the top, that counts as "reading
// here": a section becomes current once its top edge scrolls above this line.
export const ACTIVE_SECTION_LINE = 0.3

/**
 * Index of the section being read. `tops` are each section's top edge in
 * viewport coordinates (getBoundingClientRect().top), `null` for a section that
 * is not in the DOM. The current section is the last one whose top has crossed
 * `line`; at the bottom of the page it is the last section present, so a short
 * final section still becomes current. Falls back to 0.
 */
export function pickActiveSection(
  tops: readonly (number | null)[],
  line: number,
  atBottom: boolean
): number {
  let active = 0
  tops.forEach((top, index) => {
    if (top === null) return
    if (atBottom || top <= line) active = index
  })
  return active
}
