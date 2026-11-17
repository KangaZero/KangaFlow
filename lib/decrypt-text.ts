// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// "Decrypt" text effect, pure part: given where an animation is (0..1), which
// characters of the target are already revealed and which are still noise.
// No DOM, no timers; the component drives `progress` and supplies randomness.

export const DECRYPT_GLYPHS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=<>/\\?!"

/** Pick one glyph from DECRYPT_GLYPHS using a [0, 1) random source. */
export function randomGlyph(random: () => number): string {
  const index = Math.floor(random() * DECRYPT_GLYPHS.length)
  return DECRYPT_GLYPHS.charAt(index)
}

/**
 * One frame of the reveal from `from` to `to`. Characters resolve left to
 * right: the first `floor(progress * n)` show the target, the rest are noise
 * (or still `from` at progress 0). `n` is the longer length, so a shorter
 * target sheds its tail as the reveal passes it. Progress is clamped.
 */
export function decryptFrame(
  from: string,
  to: string,
  progress: number,
  random: () => number
): string {
  const clamped = Math.min(Math.max(progress, 0), 1)
  if (clamped === 0) return from
  if (clamped === 1) return to

  const length = Math.max(from.length, to.length)
  const revealed = Math.floor(clamped * length)
  let frame = ""
  for (let index = 0; index < length; index++) {
    if (index < revealed) {
      frame += to.charAt(index)
    } else {
      frame += randomGlyph(random)
    }
  }
  return frame
}
