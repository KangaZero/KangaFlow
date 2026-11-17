// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { afterEach, describe, expect, it } from "vitest"

import {
  applyEditAction,
  caretAfterMove,
  isEditableTarget,
  planTextEdit,
  terminalSequence,
} from "@/lib/text-target"

const multi = { multiline: true }
const single = { multiline: false }

describe("planTextEdit", () => {
  it("inserts at the caret and replaces a selection", () => {
    expect(
      planTextEdit(
        { end: 2, start: 2, text: "helo" },
        { text: "l", type: "insert" },
        single
      )
    ).toEqual({
      inputType: "insertText",
      replace: { from: 2, text: "l", to: 2 },
      selection: { end: 3, start: 3 },
    })
    expect(
      planTextEdit(
        { end: 5, start: 0, text: "hello" },
        { text: "X", type: "insert" },
        single
      )?.selection
    ).toEqual({ end: 1, start: 1 })
  })

  it("backspace removes one code point (never half an emoji)", () => {
    const text = "a😀"
    const edit = planTextEdit(
      { end: 3, start: 3, text },
      { type: "deleteBackward" },
      single
    )
    expect(edit?.replace).toEqual({ from: 1, text: "", to: 3 })
    expect(
      planTextEdit(
        { end: 0, start: 0, text },
        { type: "deleteBackward" },
        single
      )
    ).toBeNull()
  })

  it("deletes the previous word with its trailing space", () => {
    const edit = planTextEdit(
      { end: 12, start: 12, text: "hello world " },
      { type: "deleteWordBackward" },
      single
    )
    expect(edit?.replace).toEqual({ from: 6, text: "", to: 12 })
  })

  it("Enter and Tab only insert in multi-line fields", () => {
    const buffer = { end: 1, start: 1, text: "ab" }
    expect(planTextEdit(buffer, { type: "enter" }, multi)?.replace?.text).toBe(
      "\n"
    )
    expect(planTextEdit(buffer, { type: "enter" }, single)).toBeNull()
    expect(planTextEdit(buffer, { type: "tab" }, single)).toBeNull()
  })

  it("Ctrl+A selects all; other chords are not text edits", () => {
    const buffer = { end: 0, start: 0, text: "abc" }
    expect(
      planTextEdit(buffer, { char: "a", type: "ctrl" }, single)?.selection
    ).toEqual({
      end: 3,
      start: 0,
    })
    expect(planTextEdit(buffer, { char: "c", type: "ctrl" }, single)).toBeNull()
  })
})

describe("caretAfterMove", () => {
  const text = "ab\ncdef\ng"
  it("moves vertically keeping the column (clamped to the line)", () => {
    expect(caretAfterMove({ end: 6, start: 6, text }, "up")).toBe(2)
    expect(caretAfterMove({ end: 1, start: 1, text }, "down")).toBe(4)
    expect(caretAfterMove({ end: 6, start: 6, text }, "down")).toBe(9)
  })
  it("jumps to line and text bounds", () => {
    expect(caretAfterMove({ end: 5, start: 5, text }, "lineStart")).toBe(3)
    expect(caretAfterMove({ end: 5, start: 5, text }, "lineEnd")).toBe(7)
    expect(caretAfterMove({ end: 5, start: 5, text }, "docEnd")).toBe(
      text.length
    )
  })
  it("collapses a selection toward the arrow", () => {
    expect(caretAfterMove({ end: 4, start: 1, text }, "left")).toBe(1)
    expect(caretAfterMove({ end: 4, start: 1, text }, "right")).toBe(4)
  })
})

describe("terminalSequence", () => {
  it("emits the bytes a terminal keyboard sends", () => {
    expect(terminalSequence({ text: "ls", type: "insert" })).toBe("ls")
    expect(terminalSequence({ type: "enter" })).toBe("\r")
    expect(terminalSequence({ type: "deleteBackward" })).toBe("\x7f")
    expect(terminalSequence({ move: "up", type: "move" })).toBe("\x1b[A")
    expect(terminalSequence({ char: "c", type: "ctrl" })).toBe("\x03")
    expect(terminalSequence({ char: ";", type: "ctrl" })).toBeNull()
  })
})

describe("applyEditAction (DOM)", () => {
  afterEach(() => {
    document.body.innerHTML = ""
  })

  it("types into a textarea at the caret and fires an input event", () => {
    const area = document.createElement("textarea")
    area.value = "hllo"
    document.body.append(area)
    area.setSelectionRange(1, 1)
    const seen: (string | null)[] = []
    area.addEventListener("input", (event) =>
      seen.push((event as InputEvent).data)
    )
    expect(applyEditAction(area, { text: "e", type: "insert" })).toBe(true)
    expect(area.value).toBe("hello")
    expect(area.selectionStart).toBe(2)
    expect(seen).toEqual(["e"])
  })

  it("feeds xterm's helper textarea through the input event, value untouched", () => {
    const helper = document.createElement("textarea")
    helper.className = "xterm-helper-textarea"
    document.body.append(helper)
    const seen: (string | null)[] = []
    helper.addEventListener("input", (event) =>
      seen.push((event as InputEvent).data)
    )
    applyEditAction(helper, { type: "enter" })
    expect(seen).toEqual(["\r"])
    expect(helper.value).toBe("")
  })

  it("edits a contentEditable at the caret", () => {
    const host = document.createElement("div")
    host.setAttribute("contenteditable", "true")
    host.textContent = "ac"
    document.body.append(host)
    const text = host.firstChild
    if (text === null) throw new Error("no text node")
    const range = document.createRange()
    range.setStart(text, 1)
    range.collapse(true)
    window.getSelection()?.removeAllRanges()
    window.getSelection()?.addRange(range)
    expect(applyEditAction(host, { text: "b", type: "insert" })).toBe(true)
    expect(host.textContent).toBe("abc")
  })

  it("recognises editable targets", () => {
    const input = document.createElement("input")
    const email = document.createElement("input")
    email.type = "email"
    expect(isEditableTarget(input)).toBe(true)
    expect(isEditableTarget(email)).toBe(false)
    expect(isEditableTarget(document.createElement("button"))).toBe(false)
  })
})
