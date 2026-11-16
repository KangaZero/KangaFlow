// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Tiny deterministic randomness: a seeded PRNG plus a string hash to seed it.
// Used wherever a "random" look must stay stable for the same input (tooltip
// ransom letters, seeded from the label). Pure, no DOM.

// mulberry32 PRNG: fast, 32-bit state, good enough for visual jitter.
export function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// FNV-1a string hash → unsigned 32-bit seed (identical on server and client).
export function hashString(input: string): number {
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
