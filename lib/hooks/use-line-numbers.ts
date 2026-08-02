// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Measure a vim-style line-number gutter for the contentEditable note editor.
// Logical lines come from the buffer (block/<br> boundaries); each line's Y is
// measured from a Range at its start so the gutter aligns with the real rendered
// position (survives per-line font sizes). Recomputed on edit/scroll/resize/caret
// move; the pure numbering (absolute vs relative) lives in `gutterNumbers`.

import { type RefObject, useCallback, useEffect, useState } from "react"

import {
  domPositionAt,
  gutterNumbers,
  readVimBuffer,
} from "@/lib/rich-text-caret"

export type GutterLine = { num: number; top: number }
type Mode = "off" | "absolute" | "relative"

export function useLineNumbers(
  ref: RefObject<HTMLElement | null>,
  mode: Mode,
  caretRow: number
): { lines: GutterLine[]; scrollTop: number } {
  const [lines, setLines] = useState<GutterLine[]>([])
  const [scrollTop, setScrollTop] = useState(0)

  const recompute = useCallback((): void => {
    const el = ref.current
    if (!el || mode === "off") {
      setLines([])
      return
    }
    const buffer = readVimBuffer(el)
    const { text } = buffer
    const editorTop = el.getBoundingClientRect().top
    const starts: number[] = [0]
    for (let i = text.indexOf("\n"); i !== -1; i = text.indexOf("\n", i + 1)) {
      starts.push(i + 1)
    }
    const nums = gutterNumbers(starts.length, caretRow, mode)
    const out: GutterLine[] = starts.map((start, i) => {
      const pos = domPositionAt(buffer, start)
      let top = 0
      if (pos) {
        const range = document.createRange()
        range.setStart(pos.node, pos.offset)
        range.collapse(true)
        top = range.getBoundingClientRect().top - editorTop + el.scrollTop
      }
      return { num: nums[i] ?? i + 1, top }
    })
    setLines(out)
    setScrollTop(el.scrollTop)
  }, [ref, mode, caretRow])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    recompute()
    const onScroll = (): void => setScrollTop(el.scrollTop)
    el.addEventListener("scroll", onScroll)
    el.addEventListener("input", recompute)
    document.addEventListener("selectionchange", recompute)
    const ro = new ResizeObserver(recompute)
    ro.observe(el)
    return () => {
      el.removeEventListener("scroll", onScroll)
      el.removeEventListener("input", recompute)
      document.removeEventListener("selectionchange", recompute)
      ro.disconnect()
    }
  }, [ref, recompute])

  return { lines, scrollTop }
}
