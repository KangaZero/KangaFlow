// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Vimium-style "f" link hints: label every on-screen clickable element, then
// activate the one whose label the user types. Framework-free — the pure label
// algorithm is unit-tested, the DOM collectors run only in event handlers
// (client), the store (hint-store) holds live state, and the overlay renders it.

export type Hint = {
  readonly label: string
  // Viewport coordinates — the overlay is position: fixed.
  readonly x: number
  readonly y: number
  readonly el: HTMLElement
}

// Clickable targets. Mirrors Vimium's set, trimmed to what this app renders.
const CLICKABLE = [
  "a[href]",
  "button:not([disabled])",
  '[role="button"]',
  '[role="link"]',
  'input:not([type="hidden"]):not([disabled])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "label[for]",
  '[tabindex]:not([tabindex="-1"])',
].join(", ")

// The characters labels are built from. Lowercase so matching is case-folded.
export const HINT_ALPHABET = "abcdefghijklmnopqrstuvwxyz"

/**
 * Minimal-length, prefix-free hint labels — Vimium's algorithm.
 *
 * Returns `count` labels built from HINT_ALPHABET such that (1) each is as short
 * as possible and (2) no label is a prefix of another. The prefix-free property
 * is what lets `typeHintChar` activate the moment the typed string uniquely
 * identifies a label, with no ambiguity (e.g. never both "a" and "ab").
 *
 * Breadth-first: repeatedly expand the shortest unused string by appending every
 * alphabet character. Expanded strings become prefixes (consumed via `offset`)
 * so they fall out of the returned slice; the unexpanded tail are the leaves.
 */
export function hintLabels(count: number): string[] {
  const strings = [""]
  let offset = 0
  // Grow until there are at least `count` leaves. The `=== 1` guard forces the
  // initial "" (a prefix of everything) to expand even when count is small.
  while (strings.length - offset < count || strings.length === 1) {
    const prefix = strings[offset] ?? ""
    offset += 1
    for (const ch of HINT_ALPHABET) strings.push(prefix + ch)
  }
  return strings.slice(offset, offset + count)
}

// On-screen, non-degenerate, and not visually hidden.
function isVisible(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect()
  if (r.width <= 0 || r.height <= 0) return false
  if (
    r.bottom < 0 ||
    r.right < 0 ||
    r.top > window.innerHeight ||
    r.left > window.innerWidth
  ) {
    return false
  }
  const style = getComputedStyle(el)
  return (
    style.visibility !== "hidden" &&
    style.display !== "none" &&
    style.opacity !== "0"
  )
}

// Snapshot the current viewport's clickable elements as labelled hints, ordered
// top-to-bottom, left-to-right so the labels read in a natural reading order.
export function collectHints(): Hint[] {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>(CLICKABLE)
  ).filter(isVisible)

  els.sort((a, b) => {
    const ra = a.getBoundingClientRect()
    const rb = b.getBoundingClientRect()
    return ra.top - rb.top || ra.left - rb.left
  })

  const labels = hintLabels(els.length)
  return els.map((el, i) => {
    const r = el.getBoundingClientRect()
    return { el, label: labels[i] ?? "", x: r.left, y: r.top }
  })
}

// Form fields want focus; everything else gets a real click (which also runs
// Next.js <Link> navigation handlers).
export function activateHintEl(el: HTMLElement): void {
  const tag = el.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") el.focus()
  else el.click()
}
