// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { afterEach, describe, expect, it } from "vitest"

import {
  deleteVimRange,
  htmlToPlainText,
  insertVimText,
  readVim,
  sanitizeHtml,
} from "@/lib/rich-text"

describe("htmlToPlainText", () => {
  it("strips tags and collapses whitespace to a single line", () => {
    expect(htmlToPlainText("<p>Hello <b>world</b></p>")).toBe("Hello world")
  })

  it("turns block boundaries and <br> into spaces", () => {
    expect(htmlToPlainText("<div>one</div><div>two</div>")).toBe("one two")
    expect(htmlToPlainText("a<br>b<br/>c")).toBe("a b c")
  })

  it("decodes the common entities", () => {
    expect(htmlToPlainText("a&nbsp;&amp;&lt;b&gt;")).toBe("a &<b>")
  })

  it("returns an empty string for markup-only input", () => {
    expect(htmlToPlainText("<span></span>")).toBe("")
  })
})

describe("sanitizeHtml", () => {
  it("removes script and style blocks", () => {
    expect(sanitizeHtml("<p>ok</p><script>alert(1)</script>")).toBe("<p>ok</p>")
    expect(sanitizeHtml("<style>*{}</style><b>x</b>")).toBe("<b>x</b>")
  })

  it("strips inline event handlers", () => {
    expect(sanitizeHtml('<span onclick="steal()">x</span>')).toBe(
      "<span>x</span>"
    )
    expect(sanitizeHtml("<span onmouseover='x'>y</span>")).toBe(
      "<span>y</span>"
    )
  })

  it("neutralizes javascript: urls", () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe(
      '<a href="alert(1)">x</a>'
    )
  })

  it("leaves ordinary formatting markup untouched", () => {
    const html = '<span style="font-weight:700">bold</span>'
    expect(sanitizeHtml(html)).toBe(html)
  })
})

describe("vim DOM ops (formatting-preserving)", () => {
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

  it("reads the buffer text from the editor", () => {
    const root = mount("foo<b>bar</b>")
    expect(readVim(root).text).toBe("foobar")
  })

  it("deleteVimRange removes a span but keeps surrounding formatting", () => {
    const root = mount("foo<b>bar</b>baz")
    const removed = deleteVimRange(root, 0, 3) // delete "foo"
    expect(removed).toBe("foo")
    expect(root.textContent).toBe("barbaz")
    // the <b>bar</b> wrapper must survive.
    expect(root.querySelector("b")?.textContent).toBe("bar")
  })

  it("deleteVimRange can cut inside a formatted run", () => {
    const root = mount("<b>hello</b>")
    deleteVimRange(root, 1, 4) // delete "ell" from bold "hello"
    expect(root.textContent).toBe("ho")
    expect(root.querySelector("b")?.textContent).toBe("ho")
  })

  it("insertVimText inserts plain text at an offset", () => {
    const root = mount("foo<b>bar</b>")
    insertVimText(root, 3, "X") // between foo and bold bar
    expect(root.textContent).toBe("fooXbar")
    expect(root.querySelector("b")?.textContent).toBe("bar")
  })

  it("insertVimText turns newlines into <br> breaks", () => {
    const root = mount("ab")
    insertVimText(root, 1, "X\nY") // paste with a newline
    expect(root.querySelector("br")).not.toBeNull()
    expect(readVim(root).text).toBe("aX\nYb") // round-trips as a real break
  })

  it("deleting the whole buffer leaves a placeable caret (no throw)", () => {
    const root = mount("hello")
    expect(() => deleteVimRange(root, 0, 5)).not.toThrow()
    expect(root.textContent).toBe("")
    // A caret can still be placed / typed into the empty editor.
    expect(() => insertVimText(root, 0, "new")).not.toThrow()
    expect(root.textContent).toBe("new")
  })
})
