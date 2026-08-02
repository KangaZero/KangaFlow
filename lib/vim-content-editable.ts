// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Testable core of contentEditable vim editing: given the editor root, the
// persisted vim state, and a key, it reads the buffer, runs the pure reducer,
// applies the resulting diff through DOM Ranges (preserving formatting), tracks
// undo/redo (innerHTML snapshots), and renders the block/visual caret. The React
// hook (use-vim-content-editable) is a thin wrapper of DOM listeners around this;
// unit tests drive it directly over a jsdom contentEditable.

import {
  deleteVimRange,
  insertVimText,
  placeCaret,
  readVim,
  selectVimRange,
} from "@/lib/rich-text"
import { singleEdit } from "@/lib/rich-text-caret"
import { type VimMode, type VimState, vimReduce } from "@/lib/vim-input"

type Snapshot = { html: string; cursor: number }

export type CeState = Required<Omit<VimState, "value">> & {
  undo: Snapshot[]
  redo: Snapshot[]
  // Armed when a multi-key command leaves the clean state; committed to `undo`
  // on its first value change (so the whole command is one undo unit).
  pendingSnap: Snapshot | null
}

const CLEAN = {
  count: 0,
  find: "" as const,
  gprefix: false,
  lastFind: "" as const,
  lastFindChar: "",
  opCount: 0,
  pending: "" as const,
  replace: false,
  textobj: "" as const,
}

export function ceInitialState(): CeState {
  return {
    anchor: 0,
    cursor: 0,
    mode: "insert",
    pendingSnap: null,
    redo: [],
    register: "",
    undo: [],
    ...CLEAN,
  }
}

export function ceIsClean(s: CeState): boolean {
  return (
    s.pending === "" &&
    !s.gprefix &&
    !s.replace &&
    s.find === "" &&
    s.textobj === ""
  )
}

// Render the caret: NORMAL → block (1-char selection), VISUAL → the span, INSERT
// → collapsed caret. The thin caret is hidden in NORMAL/VISUAL by the caller.
export function cePaint(
  root: HTMLElement,
  mode: VimMode,
  cursor: number,
  anchor: number
): void {
  root.dataset.vimMode = mode
  root.style.caretColor = mode === "insert" ? "" : "transparent"
  if (mode === "visual") {
    selectVimRange(root, Math.min(anchor, cursor), Math.max(anchor, cursor) + 1)
  } else if (mode === "normal" && cursor < readVim(root).text.length) {
    selectVimRange(root, cursor, cursor + 1)
  } else {
    placeCaret(root, cursor)
  }
}

// Notify the editor (onInput → persist the note html).
function emitInput(root: HTMLElement): void {
  root.dispatchEvent(new Event("input", { bubbles: true }))
}

function restore(root: HTMLElement, s: CeState, snap: Snapshot): void {
  root.innerHTML = snap.html
  Object.assign(s, CLEAN, {
    anchor: snap.cursor,
    cursor: snap.cursor,
    mode: "normal",
  })
  emitInput(root)
  cePaint(root, "normal", snap.cursor, snap.cursor)
}

export function ceUndo(root: HTMLElement, s: CeState): boolean {
  const snap = s.undo.pop()
  if (!snap) return false
  s.redo.push({ cursor: readVim(root).caret, html: root.innerHTML })
  restore(root, s, snap)
  return true
}

export function ceRedo(root: HTMLElement, s: CeState): boolean {
  const snap = s.redo.pop()
  if (!snap) return false
  s.undo.push({ cursor: readVim(root).caret, html: root.innerHTML })
  restore(root, s, snap)
  return true
}

// Apply one already-normalised key. Mutates the DOM + state. Returns whether the
// key was owned (caller preventDefaults). INSERT typing returns false so the
// browser inserts the char.
export function ceKeydown(root: HTMLElement, s: CeState, key: string): boolean {
  if (s.mode === "normal" && ceIsClean(s)) {
    if (key === "u") {
      ceUndo(root, s)
      return true
    }
  }

  const { text, caret } = readVim(root)
  const cursor = s.mode === "insert" ? caret : s.cursor
  const beforeHtml = root.innerHTML
  const wasClean = s.mode === "normal" && ceIsClean(s)
  const result = vimReduce({ ...s, cursor, value: text }, key)

  if (!result.handled) return false // INSERT typing / control keys → browser

  // Undo bookkeeping: snapshot the pre-command state (arm on leaving clean,
  // commit on the first value change or on entering INSERT).
  const starts =
    result.value !== text ||
    result.mode === "insert" ||
    result.pending !== "" ||
    result.gprefix ||
    result.replace ||
    result.find !== "" ||
    result.textobj !== ""
  const changes = result.value !== text || result.mode === "insert"
  if (wasClean && starts) {
    const snap: Snapshot = { cursor, html: beforeHtml }
    if (changes) {
      s.undo.push(snap)
      s.redo = []
    } else {
      s.pendingSnap = snap
    }
  } else if (result.value !== text && s.pendingSnap) {
    s.undo.push(s.pendingSnap)
    s.redo = []
    s.pendingSnap = null
  }

  if (result.value !== text) {
    const { from, to, insert } = singleEdit(text, result.value)
    if (to > from) deleteVimRange(root, from, to)
    if (insert) insertVimText(root, from, insert)
    emitInput(root)
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
  s.register = result.register
  s.mode = result.mode
  // A finished command that changed nothing → drop the speculative snapshot.
  if (result.mode === "normal" && ceIsClean(s) && result.value === text) {
    s.pendingSnap = null
  }

  cePaint(root, result.mode, result.cursor, result.anchor)
  return true
}
