// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Caret line/column for a contentEditable (the rich-text note editor). Unlike a
// <textarea> — where row/col is just counting "\n" in `.value` — a
// contentEditable renders logical lines from *block boundaries* (<div>, <p>, …)
// and <br>, which don't appear as newlines in `textContent`. So we walk the DOM,
// build a plain-text view with an explicit "\n" at each line break, capture the
// caret's flat offset in it, then derive row/col. This (offset ↔ row/col) is the
// same primitive a future line-aware vim would build its 0/$/j/k on.

export type CaretPosition = {
  row: number // 1-based line the caret is on
  col: number // 1-based column within that line
  lines: number // total logical line count
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

// Derive row/col/lines from the plain text and the caret's flat offset within it.
export function positionFromText(text: string, caret: number): CaretPosition {
  const before = text.slice(0, caret)
  const lastBreak = before.lastIndexOf("\n")
  return {
    col: caret - lastBreak, // chars since the last "\n" (1-based: the "\n" itself is col 0)
    lines: 1 + (text.match(/\n/g)?.length ?? 0),
    row: 1 + (before.match(/\n/g)?.length ?? 0),
  }
}

// The caret's line/column inside contentEditable `root`, or null when the
// selection isn't inside it.
export function caretLineColumn(root: HTMLElement): CaretPosition | null {
  const sel = typeof window === "undefined" ? null : window.getSelection()
  if (!sel || sel.rangeCount === 0) return null
  const { focusNode, focusOffset } = sel
  if (!focusNode || !root.contains(focusNode)) return null

  // A DOM caret is a boundary: either inside a text node (offset = char index)
  // or on an element (offset = child index → the caret sits just before that
  // child). For the element case, remember the node the caret precedes.
  const insideText = focusNode.nodeType === Node.TEXT_NODE
  const beforeNode = insideText
    ? null
    : (focusNode.childNodes[focusOffset] ?? null)

  // Linearise the tree in document order into plain text with "\n" at each line
  // break, capturing the caret's flat offset when we reach its position.
  let text = ""
  let caret: number | null = null
  let sawContent = false // suppresses a leading "\n" before the first line

  const walk = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT
  )
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    if (n === beforeNode) caret = text.length // element-focus caret
    if (n.nodeType === Node.TEXT_NODE) {
      if (n === focusNode) caret = text.length + focusOffset // text-focus caret
      const chunk = n.textContent ?? ""
      text += chunk
      if (chunk) sawContent = true
    } else if (n instanceof HTMLElement) {
      if (n.tagName === "BR") {
        text += "\n"
        sawContent = true
      } else if (sawContent && BLOCK_TAGS.has(n.tagName)) {
        // A block starts a new line — but only after we've seen real content.
        text += "\n"
      }
    }
  }
  // Caret at the very end (element focus with no child at focusOffset).
  if (caret === null) caret = text.length

  return positionFromText(text, caret)
}
