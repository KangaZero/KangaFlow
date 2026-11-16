// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Data for the deep-sea CSS bubbles. Rendering + motion are pure CSS
// (components/deep-sea.css), so bubbles cost zero JS per frame.

export const BUBBLE_DEPTHS = ["far", "mid", "near"] as const
export type BubbleDepth = (typeof BUBBLE_DEPTHS)[number]

export type CssBubble = {
  id: number
  depth: BubbleDepth
  /** Horizontal position, % of the container. */
  x: number
  /** Diameter, px. */
  size: number
  /** Big bubbles render as flattened, rocking caps. */
  big: boolean
  /** Rise time, s. Bigger rise faster; far tiers are slower (parallax). */
  duration: number
  delay: number
  sway: number
  amplitude: number
  wobble: number
}

const BIG_BUBBLE_PX = 22
const DEPTH_SLOWDOWN: Record<BubbleDepth, number> = {
  far: 1.5,
  mid: 1.2,
  near: 1,
}

/**
 * Vents emit trains (same x, stepped delays: gas leaking from the seabed);
 * loners fill the rest. `random` is injectable for deterministic tests.
 */
export function makeCssBubbles(
  {
    vents = 3,
    perVent = 7,
    loners = 12,
  }: Partial<{ vents: number; perVent: number; loners: number }> = {},
  random: () => number = Math.random
): CssBubble[] {
  const between = (min: number, max: number) => min + random() * (max - min)
  const bubbles: CssBubble[] = []
  const add = (x: number, size: number, depth: BubbleDepth, delay: number) => {
    const big = size > BIG_BUBBLE_PX
    bubbles.push({
      amplitude: big ? size * 0.25 : size * 0.5 + 2,
      big,
      delay,
      depth,
      duration: (big ? 5.5 : 9 - size * 0.12) * DEPTH_SLOWDOWN[depth],
      id: bubbles.length,
      size,
      sway: between(0.9, 2.2),
      wobble: between(0.25, 0.6),
      x,
    })
  }
  for (let v = 0; v < vents; v++) {
    const x = between(8, 92)
    const depth = BUBBLE_DEPTHS[v % BUBBLE_DEPTHS.length] ?? "near"
    for (let k = 0; k < perVent; k++) {
      add(
        x + between(-0.6, 0.6),
        between(4, 12) * (depth === "far" ? 0.7 : 1),
        depth,
        k * 0.32 + Math.floor(k / 4) * 2.5 + v
      )
    }
  }
  for (let k = 0; k < loners; k++) {
    const roll = random()
    const depth: BubbleDepth = roll < 0.4 ? "far" : roll < 0.75 ? "mid" : "near"
    add(between(0, 100), random() ** 2 * 34 + 5, depth, between(0, 10))
  }
  return bubbles
}
