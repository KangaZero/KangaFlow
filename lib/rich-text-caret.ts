// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Caret ↔ flat-offset bridge for a contentEditable (the rich-text note editor).
// A <textarea> gives you `.value` + a numeric caret for free; a contentEditable
// renders logical lines from *block boundaries* (<div>, <p>, …) and <br>, which
// don't appear in `textContent`. So we walk the DOM once into a "buffer": the
// plain-text view (with "\n" at each line break), the caret's flat offset, and
// the text-node segments that map any offset *back* to a DOM (node, offset).
// This round-trip is the substrate the contentEditable vim layer edits on.

export type CaretPosition = {
  row: number // 1-based line the caret is on
  col: number // 1-based column within that line
  lines: number // total logical line count
}

// A text node and the flat offset at which its text begins in the buffer.
type Segment = { node: Text; start: number }

export type VimBuffer = {
  text: string // plain-text view with "\n" at block/<br> breaks
  caret: number // caret's flat offset (or text length if unknown)
  segments: Segment[] // text-node → flat-offset map, in document order
}

// Tags that begin a new logical line (a newline in the plain-text view).
export const BLOCK_TAGS: ReadonlySet<string> = new Set([
  "ADDRESS",
  "BLOCKQUOTE",
  "DIV",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "P",
  "PRE",
])

// Walk `root` in document order, linearising it into the buffer. If a selection
// focus (node, offset) is given, capture the caret's flat offset too.
export function readVimBuffer(
  root: HTMLElement,
  focusNode: Node | null = null,
  focusOffset = 0
): VimBuffer {
  // The caret is a boundary: inside a text node (offset = char index) or on an
  // element (offset = child index → it sits just before that child).
  const insideText = focusNode?.nodeType === Node.TEXT_NODE
  const beforeNode =
    focusNode && !insideText
      ? (focusNode.childNodes[focusOffset] ?? null)
      : null

  let text = ""
  let caret: number | null = null
  // Has any line's content begun? Gates the leading "\n" before a new block, but
  // (unlike "have we seen text") still fires for empty leading lines.
  let lineStarted = false
  const segments: Segment[] = []

  const walk = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  )
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (n === beforeNode) caret = text.length // element-focus caret
    if (n.nodeType === Node.TEXT_NODE) {
      const node = n as Text
      if (node === focusNode) caret = text.length + focusOffset // text-focus caret
      segments.push({ node, start: text.length })
      const chunk = node.textContent ?? ""
      text += chunk
      if (chunk) lineStarted = true
    } else if (n instanceof HTMLElement) {
      if (n.tagName === "BR") {
        // A <br> that is a block's first child is the browser's empty-line
        // FILLER — the block boundary already accounts for that line, so it
        // must NOT add a second "\n" (the classic <div><br></div> idiom).
        const filler =
          n.previousSibling === null &&
          n.parentElement !== null &&
          BLOCK_TAGS.has(n.parentElement.tagName)
        if (!filler) text += "\n"
        lineStarted = true
      } else if (BLOCK_TAGS.has(n.tagName)) {
        if (lineStarted) text += "\n" // a block starts a new line
        lineStarted = true
      }
    }
  }

  return { caret: caret ?? text.length, segments, text }
}

// The single contiguous edit turning `before` into `after`. Vim operators
// always produce one contiguous change, so the common prefix/suffix pin the
// deleted span [from, to) and the inserted text between them — which is what the
// contentEditable layer needs (edit that Range, don't replace the whole text).
export function singleEdit(
  before: string,
  after: string
): { from: number; to: number; insert: string } {
  const max = Math.min(before.length, after.length)
  let p = 0
  while (p < max && before.charCodeAt(p) === after.charCodeAt(p)) p++
  let s = 0
  while (
    s < max - p &&
    before.charCodeAt(before.length - 1 - s) ===
      after.charCodeAt(after.length - 1 - s)
  ) {
    s++
  }
  return {
    from: p,
    insert: after.slice(p, after.length - s),
    to: before.length - s,
  }
}

// The gutter number for each 1-based line, vim-style: "absolute" → 1..N;
// "relative" → distance from the caret line, but the caret's own line shows its
// absolute number (the `number relativenumber` hybrid); "off" → empty.
export function gutterNumbers(
  lineCount: number,
  caretRow: number,
  mode: "off" | "absolute" | "relative"
): number[] {
  if (mode === "off") return []
  return Array.from({ length: lineCount }, (_, i) => {
    const line = i + 1
    if (mode === "absolute") return line
    return line === caretRow ? caretRow : Math.abs(line - caretRow)
  })
}

// Derive row/col/lines from the plain text and the caret's flat offset within it.
export function positionFromText(text: string, caret: number): CaretPosition {
  const before = text.slice(0, caret)
  const lastBreak = before.lastIndexOf("\n")
  return {
    col: caret - lastBreak, // chars since the last "\n" (1-based)
    lines: 1 + (text.match(/\n/g)?.length ?? 0),
    row: 1 + (before.match(/\n/g)?.length ?? 0),
  }
}

// The caret's line/column inside contentEditable `root`, or null when the
// selection isn't inside it.
export function caretLineColumn(root: HTMLElement): CaretPosition | null {
  const sel = typeof window === "undefined" ? null : window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  // Use the ANCHOR (selection start), not the focus: a NORMAL/VISUAL block cursor
  // is a [cursor, cursor+1] selection whose focus is cursor+1, so the focus would
  // read one column too far. For a collapsed caret anchor === focus.
  const { anchorNode, anchorOffset } = sel
  if (!anchorNode || !root.contains(anchorNode)) return null
  const { text, caret } = readVimBuffer(root, anchorNode, anchorOffset)
  return positionFromText(text, caret)
}

// Map a flat buffer offset back to a DOM (node, offset) position. Offsets that
// fall on a virtual "\n" (block/<br> boundary) resolve to the end of the
// preceding text node — a valid caret spot on the same visual line break.
export function domPositionAt(
  buffer: VimBuffer,
  offset: number
): { node: Node; offset: number } | null {
  const { segments } = buffer
  if (segments.length === 0) return null
  const clamped = Math.max(0, Math.min(offset, buffer.text.length))
  let last: Segment | null = null
  for (const seg of segments) {
    const end = seg.start + seg.node.length
    if (clamped >= seg.start && clamped <= end) {
      return { node: seg.node, offset: clamped - seg.start }
    }
    if (seg.start > clamped && last) {
      // Between two text nodes (on a line break) → end of the previous one.
      return { node: last.node, offset: last.node.length }
    }
    last = seg
  }
  // Past the end → end of the final text node.
  return last ? { node: last.node, offset: last.node.length } : null
}
