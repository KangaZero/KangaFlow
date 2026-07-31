// Dependency-free rich-text helpers for the notes editor. Inline formatting is
// applied to the live Selection via the modern Range API (no deprecated
// document.execCommand). The DOM-mutating helpers must run in the browser; the
// string helpers (sanitize/excerpt) are pure and SSR-safe so they can run in
// render and be unit-tested.

export type InlineFormatState = {
  bold: boolean
  underline: boolean
  strike: boolean
  fontSize: number | null
}

export type TextAlign = "left" | "center" | "right" | "justify"

// Font-size presets offered in the toolbar (px). "null" size means inherit.
export const FONT_SIZES = [12, 14, 16, 20, 24, 32] as const
export const DEFAULT_FONT_SIZE = 16

// ── Selection plumbing ─────────────────────────────────────────────────────

// The non-collapsed selection Range, but only if it lives inside `root`.
function activeRange(root: HTMLElement): Range | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const range = sel.getRangeAt(0)
  if (range.collapsed) return null
  if (!root.contains(range.commonAncestorContainer)) return null
  return range
}

// Nearest HTMLElement to the selection start, scoped to `root` (for reading
// computed styles / toolbar active-state).
function coveringElement(root: HTMLElement): HTMLElement | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  let node: Node | null = sel.getRangeAt(0).startContainer
  if (node.nodeType === Node.TEXT_NODE) node = node.parentElement
  return node instanceof HTMLElement && root.contains(node) ? node : null
}

// Wrap the current selection's contents in a styled <span>, then reselect it so
// the toolbar reflects the new state and further formats stack on the same text.
function wrapSelection(root: HTMLElement, cssText: string): void {
  const range = activeRange(root)
  if (!range) return
  const span = document.createElement("span")
  span.style.cssText = cssText
  span.append(range.extractContents())
  range.insertNode(span)

  const sel = window.getSelection()
  if (!sel) return
  const next = document.createRange()
  next.selectNodeContents(span)
  sel.removeAllRanges()
  sel.addRange(next)
}

// ── Format toggles ─────────────────────────────────────────────────────────

export function toggleBold(root: HTMLElement): void {
  wrapSelection(root, `font-weight:${readState(root).bold ? 400 : 700}`)
}

export function setFontSize(root: HTMLElement, px: number): void {
  wrapSelection(root, `font-size:${px}px`)
}

// Underline/strike share `text-decoration-line`. An ancestor's decoration paints
// through descendants, so we clear it on every covering element first, then
// re-wrap the selection with the freshly-combined value.
export function toggleDecoration(
  root: HTMLElement,
  which: "underline" | "line-through"
): void {
  const state = readState(root)
  const nextUnderline =
    which === "underline" ? !state.underline : state.underline
  const nextStrike = which === "line-through" ? !state.strike : state.strike

  clearDecorationUpwards(root)

  const value = [
    nextUnderline ? "underline" : "",
    nextStrike ? "line-through" : "",
  ]
    .filter(Boolean)
    .join(" ")
  if (value !== "") wrapSelection(root, `text-decoration-line:${value}`)
}

// Blank out text-decoration on the covering element and its ancestors up to
// `root` (leaves structure intact so the live selection Range stays valid).
function clearDecorationUpwards(root: HTMLElement): void {
  let el = coveringElement(root)
  while (el && el !== root) {
    el.style.textDecorationLine = ""
    el = el.parentElement
  }
}

// ── Active-state reading (drives toolbar pressed states) ───────────────────

export function readState(root: HTMLElement): InlineFormatState {
  const el = coveringElement(root)
  if (!el) {
    return { bold: false, fontSize: null, strike: false, underline: false }
  }
  const style = getComputedStyle(el)
  const decoration = style.textDecorationLine
  const size = Number.parseInt(style.fontSize, 10)
  return {
    bold: Number.parseInt(style.fontWeight, 10) >= 600,
    fontSize: Number.isFinite(size) ? size : null,
    strike: decoration.includes("line-through"),
    underline: decoration.includes("underline"),
  }
}

// ── Pure string helpers (SSR-safe, unit-tested) ────────────────────────────

// Strip tags/entities to a single-line preview for note-list cards.
export function htmlToPlainText(html: string): string {
  if (!html) return ""
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim()
}

// Best-effort sanitizer for self-authored, locally-stored note HTML: drop
// script/style blocks, inline event handlers, and javascript: URLs before the
// content is written back into a contentEditable.
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
    .replace(/\son\w+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son\w+\s*=\s*'[^']*'/gi, "")
    .replace(/javascript:/gi, "")
}
