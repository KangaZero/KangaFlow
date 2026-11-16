// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

export type HighlightParts = { before: string; match: string; after: string }

/**
 * Split `text` around the first occurrence of `needle`, so a known term (e.g.
 * the employer's name) can be styled inside a translated sentence. Returns
 * null when the term is absent (e.g. the Japanese string uses katakana), and
 * the caller renders the text unstyled.
 */
export function splitAround(
  text: string,
  needle: string
): HighlightParts | null {
  if (needle === "") return null
  const at = text.indexOf(needle)
  if (at === -1) return null
  return {
    after: text.slice(at + needle.length),
    before: text.slice(0, at),
    match: needle,
  }
}
