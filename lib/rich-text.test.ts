// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { htmlToPlainText, sanitizeHtml } from "@/lib/rich-text"

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
