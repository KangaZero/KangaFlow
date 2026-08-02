import { afterEach, describe, expect, it } from "vitest"

import { caretLineColumn, positionFromText } from "@/lib/rich-text-caret"

describe("positionFromText", () => {
  it("is 1,1 at the very start", () => {
    expect(positionFromText("hello", 0)).toEqual({ col: 1, lines: 1, row: 1 })
  })

  it("counts the column within a single line", () => {
    // caret after "hel" → col 4.
    expect(positionFromText("hello", 3)).toMatchObject({ col: 4, row: 1 })
  })

  it("advances the row past each newline and resets the column", () => {
    const text = "ab\ncde\nf"
    // offset 0..: a b \n c d e \n f
    expect(positionFromText(text, 0)).toMatchObject({ col: 1, row: 1 })
    expect(positionFromText(text, 4)).toMatchObject({ col: 2, row: 2 }) // "c"
    expect(positionFromText(text, 7)).toMatchObject({ col: 1, row: 3 }) // "f"
  })

  it("reports the total logical line count", () => {
    expect(positionFromText("a\nb\nc", 0).lines).toBe(3)
    expect(positionFromText("no breaks", 0).lines).toBe(1)
  })

  it("puts the caret at column 1 right after a newline", () => {
    expect(positionFromText("ab\n", 3)).toMatchObject({ col: 1, row: 2 })
  })
})

describe("caretLineColumn (contentEditable walk)", () => {
  afterEach(() => {
    document.body.innerHTML = ""
    window.getSelection()?.removeAllRanges()
  })

  const mount = (html: string): HTMLElement => {
    const root = document.createElement("div")
    root.innerHTML = html
    document.body.appendChild(root)
    return root
  }
  const setCaret = (node: Node, offset: number): void => {
    const sel = window.getSelection()
    if (!sel) throw new Error("no selection")
    const range = document.createRange()
    range.setStart(node, offset)
    range.collapse(true)
    sel.removeAllRanges()
    sel.addRange(range)
  }

  it("counts column within a single line of text", () => {
    const root = mount("hello")
    const textNode = root.firstChild as Node // "hello"
    setCaret(textNode, 3)
    expect(caretLineColumn(root)).toMatchObject({ col: 4, row: 1 })
  })

  it("treats adjacent block elements as separate lines", () => {
    const root = mount("<div>foo</div><div>bar</div>")
    const bar = root.children[1]?.firstChild as Node
    setCaret(bar, 2) // "ba|r"
    expect(caretLineColumn(root)).toMatchObject({ col: 3, lines: 2, row: 2 })
  })

  it("treats <br> as a line break", () => {
    const root = mount("abc<br>de")
    const de = root.childNodes[2] as Node // text "de" after the <br>
    setCaret(de, 1)
    expect(caretLineColumn(root)).toMatchObject({ col: 2, row: 2 })
  })

  it("returns null when the selection is outside the root", () => {
    const root = mount("hello")
    const other = mount("world")
    setCaret(other.firstChild as Node, 1)
    expect(caretLineColumn(root)).toBeNull()
  })
})
