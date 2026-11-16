// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure logic for the cartoon "bubble swarm" route transition: which clicks are
// intercepted, and where each bubble sits / when it moves. No DOM or React here
// so it can be unit-tested; components/bubble-wipe drives the animation.

export type ClickInfo = {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  defaultPrevented: boolean
}

export type AnchorInfo = {
  /** The anchor's resolved `href` (absolute, as `HTMLAnchorElement.href` gives). */
  href: string
  /** `target` attribute ("" when absent). */
  target: string
  hasDownload: boolean
  /** Opt-out marker (`data-no-transition`) for links that must navigate instantly. */
  optOut: boolean
}

/**
 * The URL a click should transition to, or `null` to let the browser / Next
 * handle it untouched: modified or non-primary clicks (new tab/window), other
 * targets, downloads, external or non-http(s) links, and links that stay on the
 * current page (same path — hash-only or query-only changes don't remount the
 * route, so there's nothing to cover).
 */
export function transitionTarget(
  click: ClickInfo,
  anchor: AnchorInfo,
  current: URL
): URL | null {
  if (click.defaultPrevented || click.button !== 0) return null
  if (click.metaKey || click.ctrlKey || click.shiftKey || click.altKey) {
    return null
  }
  if (anchor.optOut || anchor.hasDownload) return null
  if (anchor.target !== "" && anchor.target !== "_self") return null

  let next: URL
  try {
    next = new URL(anchor.href, current)
  } catch {
    return null
  }
  if (next.protocol !== "http:" && next.protocol !== "https:") return null
  if (next.origin !== current.origin) return null
  if (samePath(next.pathname, current.pathname)) return null
  return next
}

// Trailing-slash-insensitive (the static export uses `trailingSlash`).
function samePath(a: string, b: string): boolean {
  const strip = (path: string) =>
    path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path
  return strip(a) === strip(b)
}

/** Timing knobs (ms). Cover ≈ RISE + RISE_STAGGER, reveal ≈ POP_STAGGER + POP + burst. */
export const SWARM_TIMING = {
  burstMs: 220,
  popMs: 170,
  popStaggerMs: 260,
  riseMs: 300,
  riseStaggerMs: 150,
  /** Give up waiting for the new route and reveal anyway (navigation failed / no remount). */
  safetyMs: 2500,
} as const

export type SwarmBubble = {
  /** Centre, in viewport px. */
  x: number
  y: number
  /** Diameter, px. */
  d: number
  /** How far below its resting place it starts, px. */
  rise: number
  /** Cover start offset, ms. */
  riseDelay: number
  /** Reveal (pop) offset, ms. */
  popDelay: number
  /** One in three bubbles throws cartoon burst lines when it pops. */
  burst: boolean
}

/**
 * A lightly jittered, row-offset grid of bubbles big enough to overlap their
 * neighbours, so together they cover the whole viewport. Lower bubbles start
 * rising first, so the swarm reads as bursting up from the bottom.
 */
export function makeSwarm(
  rand: () => number,
  width: number,
  height: number
): SwarmBubble[] {
  const cols = width < 700 ? 6 : 9
  const cell = width / cols
  const rowStep = cell * 0.8
  const rows = Math.ceil(height / rowStep) + 1
  const bubbles: SwarmBubble[] = []
  for (let row = 0; row < rows; row++) {
    for (let col = -1; col <= cols; col++) {
      // Coverage maths: without jitter the farthest point from any centre is
      // the circumradius of the (cell, 0.94·cell, 0.94·cell) triangle ≈ 0.56·cell.
      // Jitter (≤ 0.12·cell) can add ~0.13·cell, so d ≥ 1.4·cell guarantees
      // overlap; lib/page-transition.test samples this on several viewports.
      const x =
        col * cell + (row % 2) * cell * 0.5 + (rand() - 0.5) * cell * 0.24
      const y = row * rowStep + (rand() - 0.5) * cell * 0.1
      const d = cell * (1.42 + rand() * 0.3)
      const fromBottom = Math.min(1, Math.max(0, (height - y) / height))
      bubbles.push({
        burst: (row + col) % 3 === 0,
        d,
        popDelay: rand() * SWARM_TIMING.popStaggerMs,
        rise: height - y + d + rand() * 140,
        riseDelay:
          fromBottom * SWARM_TIMING.riseStaggerMs * 0.6 +
          rand() * SWARM_TIMING.riseStaggerMs * 0.4,
        x,
        y,
      })
    }
  }
  return bubbles
}
