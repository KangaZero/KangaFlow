// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// jsdom has no Element.setHTML, so these exercise the DOMPurify fallback — the
// path Safari takes. The native path is verified in real browsers.
import { describe, expect, it } from "vitest"

import { hasNativeSanitizer, setSanitizedHtml } from "@/lib/sanitize-html"

async function sanitized(html: string): Promise<string> {
  const el = document.createElement("div")
  await setSanitizedHtml(el, html)
  return el.innerHTML
}

describe("setSanitizedHtml (DOMPurify fallback)", () => {
  it("runs the fallback under jsdom", () => {
    expect(hasNativeSanitizer()).toBe(false)
  })

  it("keeps the markup the notes editor produces", async () => {
    const html =
      '<div><span style="font-weight:700">bold</span><br></div><p>x</p>'
    expect(await sanitized(html)).toBe(html)
  })

  // Every one of these got through the old regex sanitizer unchanged.
  it.each([
    ["unquoted handler", "<img src=x onerror=alert(1)>"],
    ["slash-separated handler", "<svg/onload=alert(1)>"],
    ["entity-encoded scheme", '<a href="jav&#x61;script:alert(1)">x</a>'],
    [
      "iframe srcdoc",
      '<iframe srcdoc="&lt;script&gt;alert(1)&lt;/script&gt;">',
    ],
    ["nested scheme", '<a href="javajavascript:script:alert(1)">x</a>'],
    ["script block", "<script>alert(1)</script>"],
  ])("removes %s", async (_name, payload) => {
    const out = await sanitized(`<p>ok</p>${payload}`)
    expect(out).toBe("<p>ok</p>")
  })

  it("strips handlers and data/aria attributes from allowed elements", async () => {
    expect(
      await sanitized('<span onclick="x()" data-x="1" aria-label="y">t</span>')
    ).toBe("<span>t</span>")
  })
})
