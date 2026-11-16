// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Vimium-style "f" link hints: label every on-screen element a user could really
// click, then activate the one whose label the user types. Framework-free — the
// decision rules are small pure functions (unit-tested on plain data), the DOM
// collector only measures and feeds them, the store (hint-store) holds live
// state, and the overlay renders it.

export type Hint = {
  readonly label: string
  // Viewport coordinates — the overlay is position: fixed.
  readonly x: number
  readonly y: number
  readonly el: HTMLElement
}

// Plain-data rectangle (viewport px) so the geometry rules test without layout.
export type Rect = {
  readonly left: number
  readonly top: number
  readonly right: number
  readonly bottom: number
}

export type Point = { readonly x: number; readonly y: number }

// Natively interactive targets plus the ARIA widget roles that mean "click me".
// Mirrors Vimium's set, trimmed to what a static site can render.
const INTERACTIVE_SELECTORS = [
  "a[href]",
  "button:not([disabled])",
  'input:not([type="hidden"]):not([disabled])',
  "select:not([disabled])",
  "textarea:not([disabled])",
  "summary",
  "label[for]",
  '[contenteditable]:not([contenteditable="false"])',
  ...[
    "button",
    "link",
    "tab",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
    "checkbox",
    "radio",
    "switch",
  ].map((role) => `[role="${role}"]:not([aria-disabled="true"])`),
] as const

// Focusable-but-not-inherently-clickable: a keyboard focus stop (the hero name's
// hover/focus morph, the media pill that expands on focus). Vimium treats these
// as possible false positives — see dedupeNested.
const FOCUSABLE_SELECTOR = '[tabindex]:not([tabindex="-1"])'

export const INTERACTIVE_SELECTOR = INTERACTIVE_SELECTORS.join(", ")
export const CANDIDATE_SELECTOR = `${INTERACTIVE_SELECTOR}, ${FOCUSABLE_SELECTOR}`

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

// ---------------------------------------------------------------------------
// Pure geometry
// ---------------------------------------------------------------------------

// Overlap of two rects, or null when they don't overlap by at least 1px on both
// axes (a sliver can't be clicked or labelled sensibly).
export function intersectRect(a: Rect, b: Rect): Rect | null {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.right, b.right)
  const bottom = Math.min(a.bottom, b.bottom)
  return right - left >= 1 && bottom - top >= 1
    ? { bottom, left, right, top }
    : null
}

export function rectArea(rect: Rect): number {
  return (
    Math.max(0, rect.right - rect.left) * Math.max(0, rect.bottom - rect.top)
  )
}

// Where to probe with elementFromPoint: the centre first (the common case exits
// after one call), then the four quarter points, then four points 10% in from
// the corners — for a large target that is mostly covered (a modal backdrop
// peeking out around its panel). Never the exact corners: hit-testing honours
// border-radius, so a pill's corners are not the pill.
const SAMPLE_FRACTIONS: readonly (readonly [number, number])[] = [
  [0.5, 0.5],
  [0.25, 0.25],
  [0.75, 0.25],
  [0.25, 0.75],
  [0.75, 0.75],
  [0.1, 0.1],
  [0.9, 0.1],
  [0.1, 0.9],
  [0.9, 0.9],
]

export function samplePoints(rect: Rect): Point[] {
  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  return SAMPLE_FRACTIONS.map(([fx, fy]) => ({
    x: rect.left + width * fx,
    y: rect.top + height * fy,
  }))
}

// Reading order: top-to-bottom, then left-to-right.
export function compareReadingOrder(a: Rect, b: Rect): number {
  return a.top - b.top || a.left - b.left
}

// ---------------------------------------------------------------------------
// Pure nesting rule
// ---------------------------------------------------------------------------

export type HintCandidate<T> = {
  readonly el: T
  // The visible (viewport- and clip-intersected) rect.
  readonly rect: Rect
  // Matched only by FOCUSABLE_SELECTOR (a focus stop, not a click target).
  readonly focusOnly: boolean
}

// An inner target covering at least this much of an interactive ancestor makes
// the ancestor's own label redundant.
export const WRAPPER_COVERAGE = 0.8

/**
 * Drop nested targets that would be a second label on the same click.
 *
 * Rule: keep the INNERMOST target, because that is where a real mouse click
 * lands (elementFromPoint) and the click bubbles to every ancestor anyway, so
 * activating the inner element also runs the outer's handlers. An ancestor is
 * dropped when either
 *   1. it is focus-only (`[tabindex]`) and contains any target — a container
 *      such as a dock or a focusable group whose children are the real targets
 *      (Vimium's "possible false positive" rule), or
 *   2. one of its descendant targets covers ≥ WRAPPER_COVERAGE of its visible
 *      area — a pure wrapper with no click area of its own.
 * Otherwise both stay: an interactive card with a small link inside has two
 * genuinely different click areas.
 *
 * `contains(outer, inner)` is injected so the rule runs on plain test data.
 */
export function dedupeNested<T>(
  candidates: readonly HintCandidate<T>[],
  contains: (outer: T, inner: T) => boolean
): HintCandidate<T>[] {
  return candidates.filter((outer) => {
    const descendants = candidates.filter(
      (inner) => inner !== outer && contains(outer.el, inner.el)
    )
    if (descendants.length === 0) return true
    if (outer.focusOnly) return false
    const outerArea = rectArea(outer.rect)
    return !descendants.some(
      (inner) => rectArea(inner.rect) >= outerArea * WRAPPER_COVERAGE
    )
  })
}

// ---------------------------------------------------------------------------
// Pure activation rule
// ---------------------------------------------------------------------------

// <input> types that act on click rather than wanting a caret.
const CLICK_INPUT_TYPES: ReadonlySet<string> = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "reset",
  "submit",
])

export type Activation = "click" | "focus"

export type ActivationTarget = {
  readonly tagName: string
  // Lowercased `type` attribute for inputs, "" otherwise.
  readonly inputType: string
  readonly isContentEditable: boolean
  readonly focusOnly: boolean
}

// Text entry and focus stops want focus; everything else gets a real click
// (which also runs Next.js <Link> navigation handlers).
export function activationFor(target: ActivationTarget): Activation {
  if (target.focusOnly || target.isContentEditable) return "focus"
  switch (target.tagName) {
    case "INPUT":
      return CLICK_INPUT_TYPES.has(target.inputType) ? "click" : "focus"
    case "TEXTAREA":
    case "SELECT":
      return "focus"
    default:
      return "click"
  }
}

// ---------------------------------------------------------------------------
// DOM measurement (client-only; runs inside the "f" keydown handler)
// ---------------------------------------------------------------------------

const CLIPPING_OVERFLOW = /(hidden|clip|auto|scroll)/

function toRect(r: DOMRect): Rect {
  return { bottom: r.bottom, left: r.left, right: r.right, top: r.top }
}

/**
 * The part of `el` a user can see: its box ∩ the viewport ∩ every clipping
 * (overflow ≠ visible) ancestor. Stops at the first `position: fixed` box,
 * because a fixed element escapes its ancestors' overflow; that can only
 * under-clip (e.g. a transformed ancestor), and the occlusion probe then
 * catches whatever is still hidden.
 */
function visibleRect(el: HTMLElement): Rect | null {
  let rect = intersectRect(toRect(el.getBoundingClientRect()), {
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth,
    top: 0,
  })
  let node: HTMLElement = el
  while (rect && getComputedStyle(node).position !== "fixed") {
    const parent: HTMLElement | null = node.parentElement
    // <body>/<html> overflow propagates to the viewport, already applied.
    if (
      !parent ||
      parent === document.body ||
      parent === document.documentElement
    ) {
      break
    }
    const style = getComputedStyle(parent)
    if (CLIPPING_OVERFLOW.test(`${style.overflowX} ${style.overflowY}`)) {
      rect = intersectRect(rect, toRect(parent.getBoundingClientRect()))
    }
    node = parent
  }
  return rect
}

// Not rendered, see-through, inert or hidden from assistive tech. checkVisibility
// walks ancestors (display, visibility, opacity 0, content-visibility), which an
// own-style check misses — e.g. a fading-out dialog's buttons. aria-hidden is
// honoured because authors use it for decorative duplicates and for the page
// behind a modal (Radix hides the rest of the tree while a dialog is open).
function isPerceivable(el: HTMLElement): boolean {
  return (
    el.checkVisibility({
      contentVisibilityAuto: true,
      opacityProperty: true,
      visibilityProperty: true,
    }) && el.closest('[inert], [aria-hidden="true"]') === null
  )
}

// Vimium-style occlusion test: some sample point must hit the element itself or
// one of its descendants. Also rejects `pointer-events: none` targets, which
// elementFromPoint looks straight through.
function isUnobstructed(el: HTMLElement, rect: Rect): boolean {
  return samplePoints(rect).some(({ x, y }) => {
    const hit = document.elementFromPoint(x, y)
    return hit !== null && el.contains(hit)
  })
}

function measure(el: HTMLElement): HintCandidate<HTMLElement> | null {
  if (!isPerceivable(el)) return null
  const rect = visibleRect(el)
  if (!(rect && isUnobstructed(el, rect))) return null
  return { el, focusOnly: !el.matches(INTERACTIVE_SELECTOR), rect }
}

// Snapshot the clickable elements in the viewport as labelled hints, in reading
// order. Each chip is pinned to the top-left of the element's visible part, so
// a half-scrolled-off button still gets an on-screen label.
export function collectHints(): Hint[] {
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR),
    measure
  ).filter((candidate) => candidate !== null)

  const targets = dedupeNested(candidates, (outer, inner) =>
    outer.contains(inner)
  ).sort((a, b) => compareReadingOrder(a.rect, b.rect))

  const labels = hintLabels(targets.length)
  return targets.map(({ el, rect }, i) => ({
    el,
    label: labels[i] ?? "",
    x: rect.left,
    y: rect.top,
  }))
}

export function activateHintEl(el: HTMLElement): void {
  const action = activationFor({
    focusOnly: !el.matches(INTERACTIVE_SELECTOR),
    inputType: el instanceof HTMLInputElement ? el.type : "",
    isContentEditable: el.isContentEditable,
    tagName: el.tagName,
  })
  if (action === "focus") el.focus()
  else el.click()
}
