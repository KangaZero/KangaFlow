// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { type EnterKeyEvent, isCommitEnter } from "@/lib/keyboard-events"

const key = (over: Partial<EnterKeyEvent>): EnterKeyEvent => ({
  isComposing: false,
  key: "Enter",
  keyCode: 13,
  ...over,
})

describe("isCommitEnter", () => {
  it("accepts a plain Enter", () => {
    expect(isCommitEnter(key({}))).toBe(true)
  })

  it("rejects the Enter that confirms an IME conversion", () => {
    expect(isCommitEnter(key({ isComposing: true, keyCode: 229 }))).toBe(false)
  })

  it("rejects Safari's out-of-order confirm (isComposing already false)", () => {
    expect(isCommitEnter(key({ keyCode: 229 }))).toBe(false)
  })

  it("ignores other keys, including 229 from mobile keyboards", () => {
    expect(isCommitEnter(key({ key: "a", keyCode: 65 }))).toBe(false)
    expect(isCommitEnter(key({ key: "Unidentified", keyCode: 229 }))).toBe(
      false
    )
  })
})
