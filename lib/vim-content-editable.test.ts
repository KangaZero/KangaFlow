import { afterEach, describe, expect, it } from "vitest"

import { readVim } from "@/lib/rich-text"
import {
  type CeState,
  ceInitialState,
  ceKeydown,
  ceRedo,
} from "@/lib/vim-content-editable"

// Drive the contentEditable vim core over a jsdom editor, starting in NORMAL at
// offset 0 — the same path the hook runs on each keydown.
function setup(html: string): { root: HTMLElement; s: CeState } {
  const root = document.createElement("div")
  root.innerHTML = html
  document.body.appendChild(root)
  const s = ceInitialState()
  s.mode = "normal"
  return { root, s }
}
function drive(root: HTMLElement, s: CeState, keys: string): void {
  for (const k of keys) ceKeydown(root, s, k)
}
const text = (root: HTMLElement): string => readVim(root).text

afterEach(() => {
  document.body.innerHTML = ""
  window.getSelection()?.removeAllRanges()
})

describe("contentEditable vim — motions track the caret", () => {
  it("l / w / $ / 0 move s.cursor", () => {
    const { root, s } = setup("hello world")
    ceKeydown(root, s, "l")
    expect(s.cursor).toBe(1)
    ceKeydown(root, s, "w")
    expect(s.cursor).toBe(6) // "world"
    ceKeydown(root, s, "$")
    expect(s.cursor).toBe(10)
    ceKeydown(root, s, "0")
    expect(s.cursor).toBe(0)
  })
})

describe("contentEditable vim — edits preserve formatting", () => {
  it("x deletes the char under the caret", () => {
    const { root, s } = setup("hello")
    drive(root, s, "x")
    expect(text(root)).toBe("ello")
  })

  it("dw deletes a word", () => {
    const { root, s } = setup("hello world")
    drive(root, s, "dw")
    expect(text(root)).toBe("world")
  })

  it("x inside bold keeps the <b> wrapper", () => {
    const { root, s } = setup("<b>hello</b>")
    s.cursor = 1
    drive(root, s, "x") // delete "e"
    expect(text(root)).toBe("hllo")
    expect(root.querySelector("b")?.textContent).toBe("hllo")
  })

  it("ciw changes the inner word and enters INSERT", () => {
    const { root, s } = setup("foo bar")
    s.cursor = 5
    drive(root, s, "ciw")
    expect(text(root)).toBe("foo ")
    expect(s.mode).toBe("insert")
  })

  it('di" deletes inside quotes', () => {
    const { root, s } = setup('a"bc"d')
    s.cursor = 2
    drive(root, s, 'di"')
    expect(text(root)).toBe('a""d')
  })
})

describe("contentEditable vim — yank / paste", () => {
  it("yl then p pastes the yanked char", () => {
    const { root, s } = setup("ab")
    drive(root, s, "ylp") // yank "a", paste after the caret
    expect(text(root)).toBe("aab")
  })

  it("yy yanks the current line into the register", () => {
    // (yy is charwise here — a linewise register/paste that opens a line below
    // is a known future item; p pastes the register inline.)
    const { root, s } = setup("hi")
    drive(root, s, "yy")
    expect(s.register).toBe("hi")
  })
})

describe("contentEditable vim — undo / redo", () => {
  it("u restores the pre-command content, Ctrl-r reapplies", () => {
    const { root, s } = setup("hello")
    drive(root, s, "x") // "ello"
    expect(text(root)).toBe("ello")
    ceKeydown(root, s, "u")
    expect(text(root)).toBe("hello")
    ceRedo(root, s)
    expect(text(root)).toBe("ello")
  })

  it("u reverts a whole multi-key command (dw)", () => {
    const { root, s } = setup("hello world")
    drive(root, s, "dw")
    expect(text(root)).toBe("world")
    ceKeydown(root, s, "u")
    expect(text(root)).toBe("hello world")
  })

  it("u with an empty stack is a no-op (still handled)", () => {
    const { root, s } = setup("hello")
    expect(ceKeydown(root, s, "u")).toBe(true)
    expect(text(root)).toBe("hello")
  })
})

describe("contentEditable vim — modes", () => {
  it("i enters INSERT, Esc returns to NORMAL", () => {
    const { root, s } = setup("hello")
    ceKeydown(root, s, "i")
    expect(s.mode).toBe("insert")
    ceKeydown(root, s, "Escape")
    expect(s.mode).toBe("normal")
  })
})
