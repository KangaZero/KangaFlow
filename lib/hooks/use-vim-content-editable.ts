// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Modal (vim) editing over a contentEditable (the rich-text note editor). Same
// pure `vimReduce` brain as the <input> hook, but the DOM I/O is fundamentally
// different: a contentEditable has no `.value` or `selectionStart`, so we read a
// flat "buffer" (plain text + caret offset) via rich-text-caret, and write edits
// back through DOM *Ranges* (rich-text: deleteVimRange/insertVimText) so bold/
// underline/font-size spans around untouched text survive. The reducer returns a
// whole new string; `singleEdit` diffs it into the one contiguous change to apply.
//
// Caret tracking differs too: a NORMAL/VISUAL block is a 1-char selection whose
// DOM *focus* is its END, so the caret offset can't be read back from the DOM
// mid-command — it's authoritative in `s.cursor`, resynced only on user clicks.

import { type RefObject, useEffect, useRef } from "react"

import {
  deleteVimRange,
  insertVimText,
  placeCaret,
  readVim,
  selectVimRange,
} from "@/lib/rich-text"
import { singleEdit } from "@/lib/rich-text-caret"
import { type VimMode, type VimState, vimReduce } from "@/lib/vim-input"
import { keyFromEvent } from "@/lib/vim-keys"

type Persisted = Required<Omit<VimState, "value">>

const CLEAN: Omit<Persisted, "mode" | "cursor" | "anchor" | "register"> = {
  count: 0,
  find: "",
  gprefix: false,
  lastFind: "",
  lastFindChar: "",
  opCount: 0,
  pending: "",
  replace: false,
  textobj: "",
}

type UseVimContentEditableOptions = {
  enabled: boolean
  onModeChange?: (mode: VimMode) => void
}

export function useVimContentEditable(
  ref: RefObject<HTMLElement | null>,
  { enabled, onModeChange }: UseVimContentEditableOptions
): void {
  const state = useRef<Persisted>({
    anchor: 0,
    cursor: 0,
    mode: "insert",
    register: "",
    ...CLEAN,
  })
  const onModeChangeRef = useRef(onModeChange)
  onModeChangeRef.current = onModeChange

  useEffect(() => {
    const el = ref.current
    if (!(enabled && el)) return
    const s = state.current

    const setMode = (mode: VimMode): void => {
      if (s.mode !== mode) {
        s.mode = mode
        onModeChangeRef.current?.(mode)
      }
    }

    // Render the caret for the current mode. NORMAL/VISUAL are selections (no
    // block-caret API), the thin caret hidden; INSERT is a collapsed caret.
    const paint = (mode: VimMode, cursor: number, anchor: number): void => {
      el.dataset.vimMode = mode
      el.style.caretColor = mode === "insert" ? "" : "transparent"
      if (mode === "visual") {
        selectVimRange(
          el,
          Math.min(anchor, cursor),
          Math.max(anchor, cursor) + 1
        )
      } else if (mode === "normal" && cursor < readVim(el).text.length) {
        selectVimRange(el, cursor, cursor + 1)
      } else {
        placeCaret(el, cursor)
      }
    }

    const onFocus = (): void => {
      Object.assign(s, CLEAN)
      s.cursor = readVim(el).caret
      setMode("insert")
    }
    const onBlur = (): void => {
      el.style.caretColor = ""
    }
    // A click repositions the caret; in NORMAL/VISUAL resync from the DOM and
    // repaint the block (ignore the programmatic selections we make ourselves).
    const onMouseUp = (): void => {
      if (s.mode === "insert") return
      s.cursor = readVim(el).caret
      if (s.mode === "visual") s.anchor = s.cursor
      paint(s.mode, s.cursor, s.anchor)
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      // Ignore IME composition keydowns (keyCode 229) — the composed text lands
      // via the browser; treating it as commands would be wrong.
      if (event.isComposing) return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const key = keyFromEvent(event)
      const { text } = readVim(el)
      // Caret is authoritative in NORMAL/VISUAL; read the DOM only in INSERT.
      const cursor = s.mode === "insert" ? readVim(el).caret : s.cursor
      const result = vimReduce({ ...s, cursor, value: text }, key)

      if (!result.handled) return // INSERT typing / control keys → browser

      event.preventDefault()
      event.stopPropagation()

      if (result.value !== text) {
        const { from, to, insert } = singleEdit(text, result.value)
        if (to > from) deleteVimRange(el, from, to)
        if (insert) insertVimText(el, from, insert)
        // Notify the editor (onInput → save the note html).
        el.dispatchEvent(new Event("input", { bubbles: true }))
      }

      s.pending = result.pending
      s.count = result.count
      s.opCount = result.opCount
      s.find = result.find
      s.textobj = result.textobj
      s.replace = result.replace
      s.gprefix = result.gprefix
      s.lastFind = result.lastFind
      s.lastFindChar = result.lastFindChar
      s.anchor = result.anchor
      s.cursor = result.cursor
      setMode(result.mode)
      paint(result.mode, result.cursor, result.anchor)
    }

    const keydownListener = onKeyDown as EventListener
    el.addEventListener("keydown", keydownListener)
    el.addEventListener("focus", onFocus)
    el.addEventListener("blur", onBlur)
    el.addEventListener("mouseup", onMouseUp)
    if (document.activeElement === el) onFocus()

    return () => {
      el.removeEventListener("keydown", keydownListener)
      el.removeEventListener("focus", onFocus)
      el.removeEventListener("blur", onBlur)
      el.removeEventListener("mouseup", onMouseUp)
      el.style.caretColor = ""
      delete el.dataset.vimMode
    }
  }, [ref, enabled])
}
