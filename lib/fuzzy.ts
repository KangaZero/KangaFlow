// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// fzf-style fuzzy matching: a query matches a target when all of its characters
// appear in the target in order (not necessarily contiguous). A match carries a
// score so results can be ranked best-first. Case-insensitive. Built in-house —
// the haystack is a small in-memory list, so a dependency (fuse.js) isn't
// warranted.

/**
 * Score how well `query` fuzzy-matches `target`.
 *
 * @returns a score (higher = better) when every query character is found in
 *   order, or `null` when there is no match. An empty query matches everything
 *   with score 0.
 */
export function fuzzyScore(query: string, target: string): number | null {
  const q = query.trim().toLowerCase()
  if (q === "") return 0

  const t = target.toLowerCase()

  // Greedily walk the target, consuming each query char in order. `matched`
  // records where each query char landed, so the score can reason about how
  // tight the match is.
  const matched: number[] = []
  let qi = 0
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) {
      matched.push(ti)
      qi++
    }
  }

  // Some query chars were never found → the target has no such subsequence.
  if (qi < q.length) return null

  // Rank the match: reward a match that starts early, sits on word boundaries,
  // runs contiguously, and spans few characters. Higher = tighter/better.
  let score = 0
  const first = matched[0] ?? 0
  const last = matched.at(-1) ?? 0

  score -= first // earlier first hit is better
  score -= last - first - (matched.length - 1) // gaps between hits are costly

  for (let i = 0; i < matched.length; i++) {
    const idx = matched[i] ?? 0
    if (i > 0 && matched[i - 1] === idx - 1) score += 8 // contiguous run
    const prev = idx > 0 ? t[idx - 1] : " "
    if (idx === 0 || prev === " " || prev === "-" || prev === "_") score += 6
  }

  return score
}
