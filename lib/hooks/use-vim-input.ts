// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// React hook that arms modal (vim) editing on a native <input>/<textarea>. It is
// the DOM glue around the pure `vimReduce` reducer: it reads the live value +
// caret off the element each keydown, feeds them through the reducer, and writes
// the result back — including a fake "block cursor" for NORMAL mode (native
// inputs have no block-caret API, so we select the char under the caret and hide
// the thin caret; INSERT collapses the selection and restores the default caret).
//
// Value edits are pushed through the *native* value setter + a synthetic `input`
// event so React controlled inputs (value/onChange) update normally.

import { type RefObject, useEffect, useRef } from "react"

import { type VimMode, vimReduce } from "@/lib/vim-input"

type VimField = HTMLInputElement | HTMLTextAreaElement

type UseVimInputOptions = {
  // Master switch (the persisted global setting). When false the hook is inert.
  enabled: boolean
  // Called when Esc is pressed in NORMAL mode (nothing left to escape to) — e.g.
  // close the launcher. INSERT+Esc is handled internally (→ NORMAL).
  onEscape?: () => void
  // Notified on every mode change, for an optional external indicator.
  onModeChange?: (mode: VimMode) => void
}

// Set a controlled field's value so React's onChange fires (bypasses React's
// value-tracker by going through the prototype's native setter).
function setNativeValue(el: VimField, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
}

// Render the caret for the current mode: NORMAL → block (select the char under
// the caret, hide the thin caret); INSERT → default thin caret.
function paintCaret(el: VimField, mode: VimMode, cursor: number): void {
  el.dataset.vimMode = mode
  el.style.caretColor = mode === "normal" ? "transparent" : ""
  if (mode === "normal" && cursor < el.value.length) {
    el.setSelectionRange(cursor, cursor + 1)
  } else {
    el.setSelectionRange(cursor, cursor)
  }
}

export function useVimInput(
  ref: RefObject<VimField | null>,
  { enabled, onEscape, onModeChange }: UseVimInputOptions
): void {
  // Mode + pending operator persist across keystrokes (the DOM holds value +
  // caret; only these two are ours to keep).
  const modeRef = useRef<VimMode>("insert")
  const pendingRef = useRef<"" | "d" | "c">("")
  // Latest callbacks without re-binding the listener each render.
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape
  const onModeChangeRef = useRef(onModeChange)
  onModeChangeRef.current = onModeChange

  useEffect(() => {
    const el = ref.current
    if (!(enabled && el)) return

    const setMode = (mode: VimMode): void => {
      if (modeRef.current !== mode) {
        modeRef.current = mode
        onModeChangeRef.current?.(mode)
      }
    }

    // Focus starts in INSERT (type immediately); blur restores the caret.
    const onFocus = (): void => {
      setMode("insert")
      pendingRef.current = ""
      paintCaret(el, "insert", el.selectionStart ?? el.value.length)
    }
    const onBlur = (): void => {
      el.style.caretColor = ""
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      // Let real shortcuts (Ctrl/Cmd/Alt combos) through untouched.
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const cursor = el.selectionStart ?? el.value.length
      const result = vimReduce(
        {
          cursor,
          mode: modeRef.current,
          pending: pendingRef.current,
          value: el.value,
        },
        event.key
      )

      // NORMAL + Esc: reducer leaves it unhandled → bubble to the host (close).
      if (!result.handled) {
        if (event.key === "Escape" && modeRef.current === "normal") {
          onEscapeRef.current?.()
        }
        return
      }

      event.preventDefault()
      event.stopPropagation()
      pendingRef.current = result.pending
      setMode(result.mode)

      if (result.value !== el.value) {
        setNativeValue(el, result.value)
        // React may re-render the controlled value; re-apply the caret after.
        requestAnimationFrame(() => paintCaret(el, result.mode, result.cursor))
      }
      paintCaret(el, result.mode, result.cursor)
    }

    // `el` is a union (input | textarea), so addEventListener falls back to the
    // base EventListener signature; cast the typed handler once.
    const keydownListener = onKeyDown as EventListener
    el.addEventListener("keydown", keydownListener)
    el.addEventListener("focus", onFocus)
    el.addEventListener("blur", onBlur)
    // Arm immediately if already focused.
    if (document.activeElement === el) onFocus()

    return () => {
      el.removeEventListener("keydown", keydownListener)
      el.removeEventListener("focus", onFocus)
      el.removeEventListener("blur", onBlur)
      el.style.caretColor = ""
      delete el.dataset.vimMode
    }
  }, [ref, enabled])
}
