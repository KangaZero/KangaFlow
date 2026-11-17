// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Applies on-screen-keyboard edit actions to whatever text surface was focused
// last, WITHOUT moving focus. Three kinds of target:
//
//   - <input>/<textarea>: `setRangeText` at the caret + a dispatched `input`
//     event, so React's onChange and any listener see a normal edit.
//   - contentEditable (the rich-text note editor): the same flat-buffer model the
//     vim layer uses (lib/rich-text) — Range edits, so formatting around the
//     caret survives — then an `input` event for the editor's onInput.
//   - xterm's hidden helper textarea: xterm turns an `insertText` input event's
//     `data` straight into terminal input, so each action becomes the byte
//     sequence a real terminal key would send ("\r", DEL, CSI arrows, …).
//
// The edit itself is planned by a pure function over { text, start, end }, so
// the caret maths is unit-tested without a DOM.

import type { CaretMove, EditAction } from "@/lib/corne-engine"
import {
  deleteVimRange,
  insertVimText,
  placeCaret,
  selectVimRange,
} from "@/lib/rich-text"
import { readVimBuffer } from "@/lib/rich-text-caret"

export type TextBuffer = { text: string; start: number; end: number }

// The InputEvent.inputType values these edits report (per Input Events Level 2).
export const EDIT_INPUT_TYPES = [
  "insertText",
  "insertLineBreak",
  "deleteContentBackward",
  "deleteContentForward",
  "deleteWordBackward",
] as const
export type EditInputType = (typeof EDIT_INPUT_TYPES)[number]

export type TextEdit = {
  // Text replacement, if the action changes content (moves/select-all do not).
  replace: { from: number; to: number; text: string } | null
  // Selection after the edit (start === end is a collapsed caret).
  selection: { start: number; end: number }
  inputType: EditInputType | null
}

export type PlanOptions = { multiline: boolean }

const clampTo = (text: string, position: number): number =>
  Math.max(0, Math.min(text.length, position))

function lineBounds(
  text: string,
  position: number
): { start: number; end: number } {
  const start = text.lastIndexOf("\n", position - 1) + 1
  const newline = text.indexOf("\n", position)
  return { end: newline === -1 ? text.length : newline, start }
}

function caretAt(position: number): TextEdit["selection"] {
  return { end: position, start: position }
}

function replaceRange(
  from: number,
  to: number,
  text: string,
  inputType: EditInputType
): TextEdit {
  return {
    inputType,
    replace: { from, text, to },
    selection: caretAt(from + text.length),
  }
}

// Length (UTF-16 units) of the code point ending at / starting at `position`,
// so Backspace never splits a surrogate pair (emoji).
function codePointBefore(text: string, position: number): number {
  return [...text.slice(0, position)].at(-1)?.length ?? 0
}
function codePointAfter(text: string, position: number): number {
  return [...text.slice(position)][0]?.length ?? 0
}

function verticalMove(
  text: string,
  caret: number,
  move: "up" | "down"
): number {
  const current = lineBounds(text, caret)
  const column = caret - current.start
  if (move === "up") {
    if (current.start === 0) return 0
    const previous = lineBounds(text, current.start - 1)
    return previous.start + Math.min(column, previous.end - previous.start)
  }
  if (current.end === text.length) return text.length
  const next = lineBounds(text, current.end + 1)
  return next.start + Math.min(column, next.end - next.start)
}

/** Where a caret move lands. A selection collapses toward the move first. */
export function caretAfterMove(buffer: TextBuffer, move: CaretMove): number {
  const { text, start, end } = buffer
  const collapsed = start === end
  switch (move) {
    case "left":
      return clampTo(
        text,
        collapsed ? start - codePointBefore(text, start) : start
      )
    case "right":
      return clampTo(text, collapsed ? end + codePointAfter(text, end) : end)
    case "up":
      return verticalMove(text, start, "up")
    case "down":
      return verticalMove(text, end, "down")
    case "lineStart":
      return lineBounds(text, start).start
    case "lineEnd":
      return lineBounds(text, end).end
    case "docStart":
      return 0
    case "docEnd":
      return text.length
  }
}

/**
 * Plan the edit `action` makes on `buffer`. Returns null when the action has no
 * meaning for this target (Enter/Tab in a single-line field, Esc, Ctrl+key
 * other than select-all) — the caller then falls back or flashes the key.
 */
export function planTextEdit(
  buffer: TextBuffer,
  action: EditAction,
  options: PlanOptions
): TextEdit | null {
  const { text } = buffer
  const start = clampTo(text, Math.min(buffer.start, buffer.end))
  const end = clampTo(text, Math.max(buffer.start, buffer.end))
  const hasSelection = start !== end
  switch (action.type) {
    case "insert":
      return replaceRange(start, end, action.text, "insertText")
    case "enter":
      return options.multiline
        ? replaceRange(start, end, "\n", "insertLineBreak")
        : null
    case "tab":
      return options.multiline
        ? replaceRange(start, end, "  ", "insertText")
        : null
    case "deleteBackward": {
      if (hasSelection)
        return replaceRange(start, end, "", "deleteContentBackward")
      const width = codePointBefore(text, start)
      if (width === 0) return null
      return replaceRange(start - width, start, "", "deleteContentBackward")
    }
    case "deleteForward": {
      if (hasSelection)
        return replaceRange(start, end, "", "deleteContentForward")
      const width = codePointAfter(text, start)
      if (width === 0) return null
      return replaceRange(start, start + width, "", "deleteContentForward")
    }
    case "deleteWordBackward": {
      if (hasSelection)
        return replaceRange(start, end, "", "deleteWordBackward")
      if (start === 0) return null
      // The word before the caret plus the whitespace after it (like Ctrl+W).
      const word = /\S*\s*$/.exec(text.slice(0, start))?.[0].length ?? 0
      return replaceRange(
        start - Math.max(word, 1),
        start,
        "",
        "deleteWordBackward"
      )
    }
    case "move":
      return {
        inputType: null,
        replace: null,
        selection: caretAt(caretAfterMove({ end, start, text }, action.move)),
      }
    case "ctrl":
      return action.char === "a" || action.char === "A"
        ? {
            inputType: null,
            replace: null,
            selection: { end: text.length, start: 0 },
          }
        : null
    case "escape":
      return null
  }
}

// ── Terminal (xterm) ────────────────────────────────────────────────────────

const CSI = "\x1b["

const MOVE_SEQUENCE: Record<CaretMove, string> = {
  docEnd: `${CSI}6~`,
  docStart: `${CSI}5~`,
  down: `${CSI}B`,
  left: `${CSI}D`,
  lineEnd: `${CSI}F`,
  lineStart: `${CSI}H`,
  right: `${CSI}C`,
  up: `${CSI}A`,
}

/** The bytes a real terminal keyboard sends for `action` (null = nothing). */
export function terminalSequence(action: EditAction): string | null {
  switch (action.type) {
    case "insert":
      return action.text
    case "enter":
      return "\r"
    case "tab":
      return "\t"
    case "escape":
      return "\x1b"
    case "deleteBackward":
      return "\x7f"
    case "deleteForward":
      return `${CSI}3~`
    case "deleteWordBackward":
      return "\x17" // Ctrl+W
    case "move":
      return MOVE_SEQUENCE[action.move]
    case "ctrl": {
      // Ctrl+letter → C0 control code (Ctrl+C = 0x03).
      if (!/^[a-z]$/i.test(action.char)) return null
      return String.fromCharCode(action.char.toUpperCase().charCodeAt(0) & 0x1f)
    }
  }
}

// ── DOM targets ─────────────────────────────────────────────────────────────

// <input> types whose selection API (and so setRangeText) is available.
const TEXT_INPUT_TYPES: ReadonlySet<string> = new Set([
  "",
  "text",
  "search",
  "url",
  "tel",
  "password",
])

type TextControl = HTMLInputElement | HTMLTextAreaElement

function isTextControl(el: Element): el is TextControl {
  if (el instanceof HTMLTextAreaElement) return !(el.readOnly || el.disabled)
  if (el instanceof HTMLInputElement) {
    return TEXT_INPUT_TYPES.has(el.type) && !(el.readOnly || el.disabled)
  }
  return false
}

// The contentEditable editing host `el` sits in (attribute-based, so it also
// works where `isContentEditable` is unimplemented, e.g. jsdom).
function editingHost(el: HTMLElement): HTMLElement | null {
  return el.closest<HTMLElement>(
    '[contenteditable]:not([contenteditable="false"])'
  )
}

export function isTerminalTarget(el: Element): el is HTMLTextAreaElement {
  return (
    el instanceof HTMLTextAreaElement &&
    el.classList.contains("xterm-helper-textarea")
  )
}

/** Whether the on-screen keyboard can type into `el`. */
export function isEditableTarget(el: Element | null): el is HTMLElement {
  if (el === null || !(el instanceof HTMLElement)) return false
  return isTextControl(el) || editingHost(el) !== null
}

function dispatchInput(
  el: HTMLElement,
  inputType: EditInputType,
  data: string | null
): void {
  el.dispatchEvent(new InputEvent("input", { bubbles: true, data, inputType }))
}

function dataOf(edit: TextEdit): string | null {
  return edit.inputType === "insertText" ? (edit.replace?.text ?? null) : null
}

function applyToTextControl(el: TextControl, action: EditAction): boolean {
  const multiline = el instanceof HTMLTextAreaElement
  const buffer: TextBuffer = {
    end: el.selectionEnd ?? el.value.length,
    start: el.selectionStart ?? el.value.length,
    text: el.value,
  }
  const edit = planTextEdit(buffer, action, { multiline })
  if (edit === null) return fallbackKey(el, action)
  if (edit.replace !== null) {
    el.setRangeText(
      edit.replace.text,
      edit.replace.from,
      edit.replace.to,
      "end"
    )
  }
  el.setSelectionRange(edit.selection.start, edit.selection.end)
  if (edit.inputType !== null) dispatchInput(el, edit.inputType, dataOf(edit))
  return true
}

// Single-line Enter/Esc: replay the key so the field's own handlers run (a
// launcher search, the login form), then submit the form if nobody handled it.
function fallbackKey(el: TextControl, action: EditAction): boolean {
  const key =
    action.type === "enter"
      ? "Enter"
      : action.type === "escape"
        ? "Escape"
        : null
  if (key === null) return false
  const event = new KeyboardEvent("keydown", {
    bubbles: true,
    cancelable: true,
    code: key,
    key,
  })
  const notCancelled = el.dispatchEvent(event)
  if (key === "Enter" && notCancelled && el.form) el.form.requestSubmit()
  return true
}

function contentEditableBuffer(root: HTMLElement): TextBuffer {
  const selection = window.getSelection()
  const inside =
    selection !== null &&
    selection.rangeCount > 0 &&
    selection.anchorNode !== null &&
    selection.focusNode !== null &&
    root.contains(selection.anchorNode) &&
    root.contains(selection.focusNode)
  const focus = readVimBuffer(
    root,
    inside ? selection.focusNode : null,
    inside ? selection.focusOffset : 0
  )
  const anchor = inside
    ? readVimBuffer(root, selection.anchorNode, selection.anchorOffset).caret
    : focus.caret
  return {
    end: Math.max(anchor, focus.caret),
    start: Math.min(anchor, focus.caret),
    text: focus.text,
  }
}

function applyToContentEditable(
  root: HTMLElement,
  action: EditAction
): boolean {
  const edit = planTextEdit(contentEditableBuffer(root), action, {
    multiline: true,
  })
  if (edit === null) return false
  if (edit.replace !== null) {
    const { from, to, text } = edit.replace
    if (to > from) deleteVimRange(root, from, to)
    // insertVimText turns "\n" into <br> and leaves the caret after the text.
    insertVimText(root, from, text)
  }
  const { start, end } = edit.selection
  if (start === end) placeCaret(root, start)
  else selectVimRange(root, start, end)
  if (edit.inputType !== null) dispatchInput(root, edit.inputType, dataOf(edit))
  return true
}

function applyToTerminal(el: HTMLTextAreaElement, action: EditAction): boolean {
  const data = terminalSequence(action)
  if (data === null) return false
  // `composed: false` (the default) is what xterm's input path expects.
  el.dispatchEvent(
    new InputEvent("input", { bubbles: true, data, inputType: "insertText" })
  )
  return true
}

/**
 * Perform `action` on `target`. Returns false when the action does nothing
 * there (the key just flashes).
 */
export function applyEditAction(
  target: HTMLElement,
  action: EditAction
): boolean {
  if (isTerminalTarget(target)) {
    return applyToTerminal(target, action)
  }
  if (isTextControl(target)) return applyToTextControl(target, action)
  // Edit the editing host, not a nested span the caret happens to sit in.
  const host = editingHost(target)
  return host === null ? false : applyToContentEditable(host, action)
}
