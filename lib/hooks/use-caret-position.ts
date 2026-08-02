// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Track the caret's line/column inside a contentEditable, recomputing whenever
// the selection moves (typing, arrows, clicks). Thin DOM glue around the pure
// caretLineColumn resolver so the component just renders the result.

import { type RefObject, useEffect, useState } from "react"

import { type CaretPosition, caretLineColumn } from "@/lib/rich-text-caret"

export function useCaretPosition(
  ref: RefObject<HTMLElement | null>
): CaretPosition | null {
  const [pos, setPos] = useState<CaretPosition | null>(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return

    const update = (): void => {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      // Only when the selection is actually inside this editor.
      if (root.contains(sel.getRangeAt(0).commonAncestorContainer)) {
        setPos(caretLineColumn(root))
      }
    }

    // selectionchange is document-level (fires for arrows/typing/clicks); the
    // element focus/input events catch the first placement + edits.
    document.addEventListener("selectionchange", update)
    root.addEventListener("focus", update)
    root.addEventListener("input", update)
    update()

    return () => {
      document.removeEventListener("selectionchange", update)
      root.removeEventListener("focus", update)
      root.removeEventListener("input", update)
    }
  }, [ref])

  return pos
}
