// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { isTypingTarget } from "@/lib/typing-target"

describe("isTypingTarget", () => {
  it("is true for text fields and editable content", () => {
    expect(isTypingTarget(document.createElement("input"))).toBe(true)
    expect(isTypingTarget(document.createElement("textarea"))).toBe(true)
    // setAttribute, not .contentEditable: jsdom doesn't reflect that setter.
    const editable = document.createElement("div")
    editable.setAttribute("contenteditable", "true")
    expect(isTypingTarget(editable)).toBe(true)
    // A node inside an editable region (CodeMirror's content) counts too.
    const inner = document.createElement("span")
    editable.append(inner)
    expect(isTypingTarget(inner)).toBe(true)
  })

  it("is false for other elements and no target", () => {
    expect(isTypingTarget(document.createElement("button"))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
