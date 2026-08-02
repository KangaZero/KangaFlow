import { afterEach, describe, expect, it } from "vitest"

import {
  caretLineColumn,
  domPositionAt,
  gutterNumbers,
  positionFromText,
  readVimBuffer,
  singleEdit,
} from "@/lib/rich-text-caret"

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

  it("counts an empty <div><br></div> line as a single newline", () => {
    // Browser's blank-line idiom: block boundary + filler <br>. Must not double.
    const root = mount("<div>foo</div><div><br></div><div>bar</div>")
    expect(readVimBuffer(root).text).toBe("foo\n\nbar")
  })

  it("still counts a content <br> as a break", () => {
    const root = mount("<div>a<br>b</div>")
    expect(readVimBuffer(root).text).toBe("a\nb")
  })

  it("domPositionAt round-trips a flat offset back to the DOM", () => {
    const root = mount("<div>foo</div><div>bar</div>")
    const buffer = readVimBuffer(root)
    // buffer text is "foo\nbar"; offset 5 = "b|a" (2nd char of "bar").
    const pos = domPositionAt(buffer, 5)
    expect(pos?.node).toBe(root.children[1]?.firstChild)
    expect(pos?.offset).toBe(1)
  })

  it("domPositionAt maps a line-break offset to the end of the prior text", () => {
    const root = mount("<div>ab</div><div>cd</div>")
    const buffer = readVimBuffer(root) // "ab\ncd", the "\n" is offset 2
    const pos = domPositionAt(buffer, 2)
    expect(pos?.node).toBe(root.children[0]?.firstChild)
    expect(pos?.offset).toBe(2) // end of "ab"
  })
})

describe("gutterNumbers", () => {
  it("off → empty", () => {
    expect(gutterNumbers(5, 2, "off")).toEqual([])
  })

  it("absolute → 1..N", () => {
    expect(gutterNumbers(4, 2, "absolute")).toEqual([1, 2, 3, 4])
  })

  it("relative → distance from the caret line, caret line shows absolute", () => {
    // caret on line 3 of 5: distances 2,1,[3],1,2 (line 3 shows its absolute 3).
    expect(gutterNumbers(5, 3, "relative")).toEqual([2, 1, 3, 1, 2])
  })
})

describe("singleEdit", () => {
  it("finds a pure deletion span", () => {
    expect(singleEdit("hello world", "world")).toEqual({
      from: 0,
      insert: "",
      to: 6,
    })
  })

  it("finds a mid-string deletion", () => {
    expect(singleEdit("abcdef", "abef")).toEqual({ from: 2, insert: "", to: 4 })
  })

  it("finds an insertion", () => {
    expect(singleEdit("ac", "abc")).toEqual({ from: 1, insert: "b", to: 1 })
  })

  it("finds a replacement", () => {
    expect(singleEdit("cat", "cot")).toEqual({ from: 1, insert: "o", to: 2 })
  })

  it("is a no-op span when equal", () => {
    expect(singleEdit("same", "same")).toMatchObject({ from: 4, to: 4 })
  })
})
