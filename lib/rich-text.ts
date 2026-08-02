// Dependency-free rich-text helpers for the notes editor. Inline formatting is
// applied to the live Selection via the modern Range API (no deprecated
// document.execCommand). The DOM-mutating helpers must run in the browser; the
// string helpers (sanitize/excerpt) are pure and SSR-safe so they can run in
// render and be unit-tested.

import {
  BLOCK_TAGS,
  domPositionAt,
  readVimBuffer,
  type VimBuffer,
} from "@/lib/rich-text-caret"

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

// ── Vim over contentEditable ───────────────────────────────────────────────
// The vim layer edits the note by flat buffer offset (see rich-text-caret): it
// reads the buffer, decides with the pure reducer, then translates offsets back
// to DOM Ranges. Edits go through Range mutation — NOT textContent replacement —
// so bold/underline/font-size spans around untouched text survive.

// Read the buffer (plain text + caret offset) from the live selection in `root`.
export function readVim(root: HTMLElement): VimBuffer {
  const sel = window.getSelection()
  const focus =
    sel && sel.rangeCount > 0 && sel.focusNode && root.contains(sel.focusNode)
      ? { node: sel.focusNode, offset: sel.focusOffset }
      : null
  return readVimBuffer(root, focus?.node ?? null, focus?.offset ?? 0)
}

// Build a DOM Range spanning [from, to) of the current buffer. When the buffer
// has no text node (an empty note, e.g. right after `dd`), fall back to the root
// element itself so a caret can still be placed and typed into.
function rangeFor(root: HTMLElement, from: number, to: number): Range | null {
  const buffer = readVimBuffer(root)
  const fallback = { node: root as Node, offset: 0 }
  const a = domPositionAt(buffer, from) ?? fallback
  const b = domPositionAt(buffer, to) ?? fallback
  const range = document.createRange()
  range.setStart(a.node, a.offset)
  range.setEnd(b.node, b.offset)
  return range
}

function applyRange(range: Range, collapseToStart: boolean): void {
  const sel = window.getSelection()
  if (!sel) return
  if (collapseToStart) range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

// Place a collapsed caret at flat `offset`.
export function placeCaret(root: HTMLElement, offset: number): void {
  const range = rangeFor(root, offset, offset)
  if (range) applyRange(range, true)
}

// Select [from, to) — used for VISUAL and the NORMAL block caret (to = from+1).
export function selectVimRange(
  root: HTMLElement,
  from: number,
  to: number
): void {
  const range = rangeFor(root, from, to)
  if (range) applyRange(range, false)
}

// Delete [from, to), preserving surrounding formatting, and collapse the caret
// to the start. Returns the removed plain text (for the yank register).
export function deleteVimRange(
  root: HTMLElement,
  from: number,
  to: number
): string {
  const range = rangeFor(root, from, to)
  if (!range) return ""
  const removed = range.toString()
  range.deleteContents()
  placeCaret(root, from) // rebuild against the mutated DOM
  return removed
}

// Insert plain `text` at flat `offset` and leave the caret just after it.
export function insertVimText(
  root: HTMLElement,
  offset: number,
  text: string
): void {
  if (text === "") {
    placeCaret(root, offset)
    return
  }
  const range = rangeFor(root, offset, offset)
  if (!range) return
  // Turn "\n" into real <br> breaks (a plain "\n" text node collapses to a space
  // in contentEditable) so multi-line paste round-trips through the buffer.
  const fragment = document.createDocumentFragment()
  text.split("\n").forEach((part, i) => {
    if (i > 0) fragment.appendChild(document.createElement("br"))
    if (part) fragment.appendChild(document.createTextNode(part))
  })
  range.insertNode(fragment)
  root.normalize() // merge adjacent text nodes so offsets stay simple
  placeCaret(root, offset + text.length)
}

// ── Raw-HTML view (pretty-print for the notes "raw" toggle) ─────────────────

function attrsOf(el: Element): string {
  return Array.from(el.attributes)
    .map((a) => ` ${a.name}="${a.value}"`)
    .join("")
}

// Serialize a node and its subtree inline (no added whitespace), so the output
// re-parses to the exact same DOM.
function serializeNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? ""
  if (!(node instanceof HTMLElement)) return ""
  const tag = node.tagName.toLowerCase()
  const attrs = attrsOf(node)
  if (tag === "br") return `<${tag}${attrs}>`
  const inner = Array.from(node.childNodes).map(serializeNode).join("")
  return `<${tag}${attrs}>${inner}</${tag}>`
}

// Pretty-print the editor's markup by putting each TOP-LEVEL node (each line's
// block) on its own line, content serialized inline. The ONLY added whitespace
// is the "\n" *between* block siblings — which applyRawHtml strips — so
// applyRawHtml(formatHtml(x)) is an identity and repeated toggles are stable
// (deterministic: same input → same output, no widening gaps).
export function formatHtml(html: string): string {
  const tmp = document.createElement("div")
  tmp.innerHTML = html
  const lines: string[] = []
  tmp.childNodes.forEach((child) => {
    const s = serializeNode(child)
    if (child.nodeType === Node.TEXT_NODE) {
      if (s.trim()) lines.push(s)
    } else {
      lines.push(s)
    }
  })
  return lines.join("\n")
}

// Whether a node is a block/<br> boundary (or absent) — the places between which
// pretty-print indentation whitespace sits.
function isBoundary(node: Node | null): boolean {
  return (
    node === null ||
    (node instanceof HTMLElement &&
      (BLOCK_TAGS.has(node.tagName) || node.tagName === "BR"))
  )
}

// Set the editor markup from the raw view, then drop the whitespace-only text
// nodes that live *between block boundaries* (the pretty-print indentation) so
// they don't become real content. Inline whitespace (e.g. a space between two
// spans) is left untouched.
export function applyRawHtml(root: HTMLElement, raw: string): void {
  root.innerHTML = sanitizeHtml(raw)
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const remove: Text[] = []
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const t = n as Text
    if (
      /^\s+$/.test(t.data) &&
      isBoundary(t.previousSibling) &&
      isBoundary(t.nextSibling)
    ) {
      remove.push(t)
    }
  }
  for (const t of remove) t.remove()
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
