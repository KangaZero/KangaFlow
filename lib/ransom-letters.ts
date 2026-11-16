// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Splits a tooltip label into "ransom note" cut-out letters: each glyph gets a
// tag style, tilt, nudge and size. Seeded from the label, so a tooltip looks
// the same on every hover (random-per-render would read as a glitch).

import { hashString, mulberry32 } from "@/lib/bubbles"

export const RANSOM_KINDS = ["ink", "paper", "accent", "plain"] as const
export type RansomKind = (typeof RANSOM_KINDS)[number]

export type RansomToken =
  | {
      type: "glyph"
      key: string
      char: string
      /** Glyph index, ignoring spaces (drives the pop-in stagger). */
      index: number
      kind: RansomKind
      /** Degrees, −8..8. */
      rotate: number
      /** Vertical nudge in px, −1.5..1.5. */
      dy: number
      /** Font size in px, 12..17. */
      size: number
    }
  | { type: "space"; key: string }

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })

/**
 * Grapheme-aware (Intl.Segmenter), so "日本語" and emoji clusters split into
 * whole characters, never broken UTF-16 halves.
 */
export function ransomLetters(label: string): RansomToken[] {
  const random = mulberry32(hashString(label))
  let index = 0
  return Array.from(segmenter.segment(label), ({ segment }, position) => {
    const key = `${position}-${segment}`
    if (/^\s+$/.test(segment)) return { key, type: "space" }
    const kind =
      RANSOM_KINDS[Math.floor(random() * RANSOM_KINDS.length)] ?? "ink"
    return {
      char: segment,
      dy: Math.round((random() * 3 - 1.5) * 10) / 10,
      index: index++,
      key,
      kind,
      rotate: Math.round((random() * 16 - 8) * 10) / 10,
      size: Math.round((12 + random() * 5) * 10) / 10,
      type: "glyph",
    }
  })
}
