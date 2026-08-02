// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Thin React wrapper that arms modal (vim) editing on the rich-text
// contentEditable. All the logic — reducer dispatch, DOM Range edits, undo/redo,
// caret painting — lives in the testable lib/vim-content-editable core; this hook
// only wires DOM listeners, normalises keys, mirrors the register to the
// clipboard, and resyncs the caret on click.

import { type RefObject, useEffect, useRef } from "react"

import { readVim } from "@/lib/rich-text"
import {
  type CeState,
  ceInitialState,
  ceKeydown,
  cePaint,
  ceRedo,
} from "@/lib/vim-content-editable"
import type { VimMode } from "@/lib/vim-input"
import { keyFromEvent } from "@/lib/vim-keys"

type Options = {
  enabled: boolean
  onModeChange?: (mode: VimMode) => void
}

export function useVimContentEditable(
  ref: RefObject<HTMLElement | null>,
  { enabled, onModeChange }: Options
): void {
  const state = useRef<CeState>(ceInitialState())
  const onModeChangeRef = useRef(onModeChange)
  onModeChangeRef.current = onModeChange

  useEffect(() => {
    const el = ref.current
    if (!(enabled && el)) return
    const s = state.current

    const onFocus = (): void => {
      Object.assign(s, ceInitialState(), { redo: s.redo, undo: s.undo })
      s.cursor = readVim(el).caret
      onModeChangeRef.current?.("insert")
    }
    const onBlur = (): void => {
      el.style.caretColor = ""
    }
    const onMouseUp = (): void => {
      if (s.mode === "insert") return
      s.cursor = readVim(el).caret
      if (s.mode === "visual") s.anchor = s.cursor
      cePaint(el, s.mode, s.cursor, s.anchor)
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.isComposing) return
      const prevMode = s.mode
      const prevRegister = s.register

      // Redo (Ctrl-r), checked before the modifier passthrough.
      if (
        event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        keyFromEvent(event) === "r" &&
        s.mode === "normal"
      ) {
        event.preventDefault()
        event.stopPropagation()
        ceRedo(el, s)
      } else {
        if (event.metaKey || event.ctrlKey || event.altKey) return
        const handled = ceKeydown(el, s, keyFromEvent(event))
        if (!handled) return
        event.preventDefault()
        event.stopPropagation()
      }

      if (s.register && s.register !== prevRegister) {
        navigator.clipboard?.writeText(s.register).catch(() => {})
      }
      if (s.mode !== prevMode) onModeChangeRef.current?.(s.mode)
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
