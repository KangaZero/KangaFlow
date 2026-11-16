// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import "@/components/ui/morph-text.css"
import "@/components/ui/ransom-glyph.css"

import { useMemo } from "react"

import { ransomEmScale, ransomLetters } from "@/lib/ransom-letters"

// Hover morph: every glyph has a ransom-note cut-out tag stacked on it
// (absolutely centred, so the layout never shifts). A `.morph-on` ancestor
// swaps glyph → tag with a left→right stagger; removing it reverses
// right→left. Pure CSS transitions (morph-text.css), so an interrupted hover
// reverses from wherever it is. Tags are aria-hidden: the glyphs carry the
// text. Shared by the header date and the start-page name.
export function MorphText({
  text,
  offset = 0,
  total,
}: {
  text: string
  /** Index of this run's first glyph across the whole host (stagger order). */
  offset?: number
  /** Glyph count across the whole host (reverse stagger order). */
  total: number
}) {
  const tokens = useMemo(() => ransomLetters(text), [text])
  return tokens.map((token) => {
    if (token.type === "space") return <span key={token.key}> </span>
    const order = offset + token.index
    return (
      <span
        className="morph-letter"
        key={token.key}
        style={{
          "--i": order,
          "--k": ransomEmScale(token.size),
          "--r": `${token.rotate}deg`,
          "--ri": total - 1 - order,
        }}
      >
        <span className="morph-letter__glyph">{token.char}</span>
        <span
          aria-hidden
          className="morph-letter__tag ransom-glyph"
          data-kind={token.kind}
        >
          {token.char}
        </span>
      </span>
    )
  })
}

/** Glyph count of a run (spaces excluded): sums into MorphText's `total`. */
export const morphGlyphCount = (text: string): number =>
  ransomLetters(text).filter((token) => token.type === "glyph").length
