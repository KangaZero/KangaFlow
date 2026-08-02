// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// React hook that arms modal (vim) editing on a native <input>/<textarea>. It is
// the DOM glue around the pure `vimReduce` reducer: it reads the live value +
// caret off the element each keydown, feeds them through the reducer, and writes
// the result back — including a fake block/visual caret (native inputs have no
// block-caret API, so NORMAL selects the char under the caret and VISUAL selects
// the anchor…cursor span, both with the thin caret hidden; INSERT restores it).
//
// Three things live here rather than in the pure reducer because they need DOM
// history / keystroke capture: the yank register→clipboard mirror, undo/redo
// (u / Ctrl-r) over a value+caret stack, and repeat (.) which records the last
// change's keystrokes and replays them through the reducer.

import { type RefObject, useEffect, useRef } from "react"

import { type VimMode, type VimState, vimReduce } from "@/lib/vim-input"
import { keyFromEvent } from "@/lib/vim-keys"

type VimField = HTMLInputElement | HTMLTextAreaElement

type UseVimInputOptions = {
  // Master switch (the persisted global setting). When false the hook is inert.
  enabled: boolean
  // Called when Esc is pressed in NORMAL mode (nothing left to escape to).
  onEscape?: () => void
  // Notified on every mode change, for an optional external indicator.
  onModeChange?: (mode: VimMode) => void
}

// The vim state the DOM can't hold, persisted between keystrokes.
type Persisted = Required<Omit<VimState, "value">>

type Snapshot = { value: string; cursor: number }

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

// A "clean" NORMAL state = no command in flight, so u/./Ctrl-r are safe to steal
// (and `gu` isn't clobbered — during it, gprefix is set, so this is false).
function isClean(s: Persisted): boolean {
  return (
    s.pending === "" &&
    !s.gprefix &&
    !s.replace &&
    s.find === "" &&
    s.textobj === ""
  )
}

function setNativeValue(el: VimField, value: string): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set
  setter?.call(el, value)
  el.dispatchEvent(new Event("input", { bubbles: true }))
}

// Render the caret for the current mode: NORMAL → block (char under the caret),
// VISUAL → the anchor…cursor span, INSERT → default thin caret.
function paintCaret(
  el: VimField,
  mode: VimMode,
  cursor: number,
  anchor: number
): void {
  el.dataset.vimMode = mode
  el.style.caretColor = mode === "insert" ? "" : "transparent"
  if (mode === "visual") {
    const from = Math.min(anchor, cursor)
    const to = Math.min(el.value.length, Math.max(anchor, cursor) + 1)
    el.setSelectionRange(from, to)
  } else if (mode === "normal" && cursor < el.value.length) {
    el.setSelectionRange(cursor, cursor + 1)
  } else {
    el.setSelectionRange(cursor, cursor)
  }
}

export function useVimInput(
  ref: RefObject<VimField | null>,
  { enabled, onEscape, onModeChange }: UseVimInputOptions
): void {
  const state = useRef<Persisted>({
    anchor: 0,
    cursor: 0,
    mode: "insert",
    register: "",
    ...CLEAN,
  })
  const onEscapeRef = useRef(onEscape)
  onEscapeRef.current = onEscape
  const onModeChangeRef = useRef(onModeChange)
  onModeChangeRef.current = onModeChange

  useEffect(() => {
    const el = ref.current
    if (!(enabled && el)) return

    const s = state.current
    const undoStack: Snapshot[] = []
    const redoStack: Snapshot[] = []
    // Keystrokes of the in-progress command + whether it changed the value, and
    // the last completed change (for `.`).
    let seq: string[] = []
    let seqChanged = false
    let lastChange: string[] = []
    // Snapshot taken when a command leaves the clean state, committed to the
    // undo stack on its first real value change (so the whole command is one
    // undo unit — incl. an insert session).
    let pendingSnap: Snapshot | null = null
    const commitSnap = (): void => {
      if (pendingSnap) {
        undoStack.push(pendingSnap)
        redoStack.length = 0
        pendingSnap = null
      }
    }

    const setMode = (mode: VimMode): void => {
      if (s.mode !== mode) {
        s.mode = mode
        onModeChangeRef.current?.(mode)
      }
    }
    const caret = (): number =>
      s.mode === "visual" ? s.cursor : (el.selectionStart ?? el.value.length)

    const persist = (
      r: VimState & { anchor: number; register: string }
    ): void => {
      s.pending = r.pending ?? ""
      s.count = r.count ?? 0
      s.opCount = r.opCount ?? 0
      s.find = r.find ?? ""
      s.textobj = r.textobj ?? ""
      s.replace = r.replace ?? false
      s.gprefix = r.gprefix ?? false
      s.lastFind = r.lastFind ?? ""
      s.lastFindChar = r.lastFindChar ?? ""
      s.anchor = r.anchor
      s.cursor = r.cursor
      s.register = r.register
    }

    const applyValue = (
      value: string,
      mode: VimMode,
      cursor: number,
      anchor: number
    ): void => {
      if (value !== el.value) {
        setNativeValue(el, value)
        requestAnimationFrame(() => paintCaret(el, mode, cursor, anchor))
      }
      paintCaret(el, mode, cursor, anchor)
    }

    const restore = (snap: Snapshot): void => {
      setNativeValue(el, snap.value)
      Object.assign(s, CLEAN, { anchor: snap.cursor, cursor: snap.cursor })
      setMode("normal")
      requestAnimationFrame(() =>
        paintCaret(el, "normal", snap.cursor, snap.cursor)
      )
      paintCaret(el, "normal", snap.cursor, snap.cursor)
    }

    // Replay a recorded change's keystrokes through the reducer (inserting typed
    // chars by hand, since INSERT text is normally the browser's job).
    const replay = (keys: string[]): void => {
      undoStack.push({ cursor: caret(), value: el.value })
      redoStack.length = 0
      let vs: VimState = { cursor: caret(), mode: "normal", value: el.value }
      for (const key of keys) {
        if (vs.mode === "insert" && key.length === 1) {
          const c = vs.cursor
          vs = {
            ...vs,
            cursor: c + 1,
            value: vs.value.slice(0, c) + key + vs.value.slice(c),
          }
          continue
        }
        const r = vimReduce(vs, key)
        vs = { ...r }
      }
      // Mirror any register change to the clipboard, like the live path.
      const reg = vs.register ?? s.register
      if (reg && reg !== s.register) {
        navigator.clipboard?.writeText(reg).catch(() => {})
      }
      Object.assign(s, CLEAN, {
        anchor: vs.cursor,
        cursor: vs.cursor,
        register: reg,
      })
      setMode("normal")
      applyValue(
        vs.value,
        "normal",
        Math.max(0, Math.min(vs.cursor, vs.value.length - 1)),
        vs.cursor
      )
    }

    const onFocus = (): void => {
      Object.assign(s, CLEAN)
      setMode("insert")
      paintCaret(el, "insert", el.selectionStart ?? el.value.length, 0)
    }
    const onBlur = (): void => {
      el.style.caretColor = ""
    }

    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.isComposing) return // don't treat IME composition as commands
      const key = keyFromEvent(event)
      // Redo (Ctrl-r) — checked before the generic modifier passthrough. Claim
      // the key unconditionally (else empty-redo would trigger a browser reload).
      if (
        event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        key === "r" &&
        s.mode === "normal" &&
        isClean(s)
      ) {
        event.preventDefault()
        event.stopPropagation()
        const snap = redoStack.pop()
        if (snap) {
          undoStack.push({ cursor: caret(), value: el.value })
          restore(snap)
        }
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return

      // Undo (u) and repeat (.) only from a clean NORMAL state. Always claim the
      // key (else `u` with an empty stack would type "u" into the field).
      if (s.mode === "normal" && isClean(s)) {
        if (key === "u") {
          event.preventDefault()
          event.stopPropagation()
          const snap = undoStack.pop()
          if (snap) {
            redoStack.push({ cursor: caret(), value: el.value })
            restore(snap)
          }
          return
        }
        if (key === ".") {
          event.preventDefault()
          event.stopPropagation()
          if (lastChange.length > 0) replay(lastChange)
          return
        }
      }

      const before = el.value
      const cursor = caret()
      const wasClean = s.mode === "normal" && isClean(s)
      const result = vimReduce({ ...s, cursor, value: before }, key)

      if (!result.handled) {
        // INSERT typing is the browser's job — record it for `.` and commit the
        // command's pre-change snapshot (the value is about to change).
        if (s.mode === "insert" && key.length === 1) {
          commitSnap()
          seq.push(key)
          seqChanged = true
        } else if (key === "Escape" && s.mode === "normal") {
          onEscapeRef.current?.()
        }
        return
      }

      event.preventDefault()
      event.stopPropagation()
      seq.push(key)

      // A command "starts" the moment it leaves the clean state (an operator/
      // find/object/replace/g pending, or enters INSERT) or mutates outright.
      const starts =
        result.value !== before ||
        result.mode === "insert" ||
        result.pending !== "" ||
        result.gprefix ||
        result.replace ||
        result.find !== "" ||
        result.textobj !== ""
      if (wasClean && starts) pendingSnap = { cursor, value: before }
      // Commit the snapshot on the first keystroke that actually changes value.
      if (result.value !== before) {
        commitSnap()
        seqChanged = true
      }

      if (result.register && result.register !== s.register) {
        navigator.clipboard?.writeText(result.register).catch(() => {})
      }

      persist(result)
      setMode(result.mode)
      applyValue(result.value, result.mode, result.cursor, result.anchor)

      // Back to a clean NORMAL state → command finished: record it for `.` and
      // drop any uncommitted snapshot (the command changed nothing).
      if (result.mode === "normal" && isClean(s)) {
        pendingSnap = null
        if (seqChanged) lastChange = seq
        seq = []
        seqChanged = false
      }
    }

    const keydownListener = onKeyDown as EventListener
    el.addEventListener("keydown", keydownListener)
    el.addEventListener("focus", onFocus)
    el.addEventListener("blur", onBlur)
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
