// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Splits a tooltip label into "ransom note" cut-out letters: each glyph gets a
// tag style, tilt, nudge and size. Seeded from the label, so a tooltip looks
// the same on every hover (random-per-render would read as a glitch).

import { hashString, mulberry32 } from "@/lib/seeded-random"

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

/** Tag font size range in px: single source for ransomLetters + ransomEmScale. */
const SIZE_MIN = 12
const SIZE_MAX = 17

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
      size: Math.round((SIZE_MIN + random() * (SIZE_MAX - SIZE_MIN)) * 10) / 10,
      type: "glyph",
    }
  })
}

const EM_MIN = 0.74
const EM_MAX = 0.92

/**
 * A glyph's pixel `size` (12..17) as an em multiplier (0.74..0.92), for tags
 * laid over text of arbitrary size (the header date morph): they keep the
 * seeded size variety while always fitting inside the glyph they cover.
 */
export function ransomEmScale(size: number): number {
  const t = Math.min(1, Math.max(0, (size - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)))
  return Math.round((EM_MIN + t * (EM_MAX - EM_MIN)) * 100) / 100
}
