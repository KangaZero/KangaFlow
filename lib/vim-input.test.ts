import { describe, expect, it } from "vitest"

import { type VimState, vimReduce, wordBoundary } from "@/lib/vim-input"

// Build a NORMAL-mode state; `cursor` defaults to start.
const normal = (value: string, cursor = 0): VimState => ({
  cursor,
  mode: "normal",
  pending: "",
  value,
})

describe("vimReduce — INSERT mode", () => {
  const insert = (value: string, cursor: number): VimState => ({
    cursor,
    mode: "insert",
    pending: "",
    value,
  })

  it("passes printable keys through to the browser (unhandled)", () => {
    const r = vimReduce(insert("ab", 2), "c")
    expect(r.handled).toBe(false)
    expect(r.mode).toBe("insert")
  })

  it("Esc leaves INSERT and nudges the caret left", () => {
    const r = vimReduce(insert("abc", 3), "Escape")
    expect(r.handled).toBe(true)
    expect(r.mode).toBe("normal")
    expect(r.cursor).toBe(2)
  })
})

describe("vimReduce — mode entry", () => {
  it("i/I/a/A enter INSERT at the right caret", () => {
    expect(vimReduce(normal("hello", 2), "i")).toMatchObject({
      cursor: 2,
      mode: "insert",
    })
    expect(vimReduce(normal("hello", 2), "I")).toMatchObject({
      cursor: 0,
      mode: "insert",
    })
    expect(vimReduce(normal("hello", 2), "a")).toMatchObject({
      cursor: 3,
      mode: "insert",
    })
    expect(vimReduce(normal("hello", 2), "A")).toMatchObject({
      cursor: 5,
      mode: "insert",
    })
  })
})

describe("vimReduce — motions clamp to the last char in NORMAL", () => {
  it("l stops on the last index, not past the end", () => {
    expect(vimReduce(normal("hi", 1), "l").cursor).toBe(1)
  })

  it("$ lands on the last char; 0 on the first", () => {
    expect(vimReduce(normal("hello", 0), "$").cursor).toBe(4)
    expect(vimReduce(normal("hello", 4), "0").cursor).toBe(0)
  })

  it("h clamps at 0", () => {
    expect(vimReduce(normal("hi", 0), "h").cursor).toBe(0)
  })
})

describe("vimReduce — deletes", () => {
  it("x removes the char under the caret and keeps the block on a char", () => {
    const r = vimReduce(normal("abc", 2), "x")
    expect(r.value).toBe("ab")
    expect(r.cursor).toBe(1) // pulled back onto the new last char
  })

  it("D deletes to end of line", () => {
    expect(vimReduce(normal("hello", 2), "D").value).toBe("he")
  })
})

describe("vimReduce — d/c operators", () => {
  it("d then a motion deletes the span (d$)", () => {
    const pendingD = vimReduce(normal("hello world", 6), "d")
    expect(pendingD.pending).toBe("d")
    const r = vimReduce({ ...pendingD, mode: "normal" }, "$")
    expect(r.value).toBe("hello ")
    expect(r.mode).toBe("normal")
  })

  it("dd clears the whole line", () => {
    const pendingD = vimReduce(normal("hello", 2), "d")
    expect(vimReduce({ ...pendingD, mode: "normal" }, "d").value).toBe("")
  })

  it("c$ deletes to end and enters INSERT", () => {
    const pendingC = vimReduce(normal("hello", 2), "c")
    const r = vimReduce({ ...pendingC, mode: "normal" }, "$")
    expect(r.value).toBe("he")
    expect(r.mode).toBe("insert")
  })

  it("a non-motion cancels the pending operator", () => {
    const pendingD = vimReduce(normal("hello", 2), "d")
    const r = vimReduce({ ...pendingD, mode: "normal" }, "z")
    expect(r.value).toBe("hello")
    expect(r.pending).toBe("")
  })
})

describe("wordBoundary", () => {
  it("w lands on the next word's first char (trailing space skipped)", () => {
    expect(wordBoundary("hello world", 0, 1)).toBe(6)
  })

  it("w treats punctuation as its own word", () => {
    // "foo.bar": foo(0-2) . (3) bar(4-6) → from 0, next run start is the dot.
    expect(wordBoundary("foo.bar", 0, 1)).toBe(3)
  })

  it("w on the last word clamps to the last char", () => {
    expect(wordBoundary("hello world", 6, 1)).toBe(10)
  })

  it("b lands on the previous word's start", () => {
    expect(wordBoundary("hello world", 6, 1)) // sanity: forward still works
    expect(wordBoundary("hello world", 6, -1)).toBe(0)
  })

  it("b clamps at 0", () => {
    expect(wordBoundary("hello", 2, -1)).toBe(0)
  })
})

describe("vimReduce — word motions + word operators", () => {
  it("w/b move the caret in NORMAL", () => {
    expect(vimReduce(normal("hello world", 0), "w").cursor).toBe(6)
    expect(vimReduce(normal("hello world", 6), "b").cursor).toBe(0)
  })

  it("dw deletes the word and its trailing space", () => {
    const pendingD = vimReduce(normal("hello world", 0), "d")
    expect(vimReduce({ ...pendingD, mode: "normal" }, "w").value).toBe("world")
  })

  it("cw deletes the word and enters INSERT", () => {
    const pendingC = vimReduce(normal("hello world", 0), "c")
    const r = vimReduce({ ...pendingC, mode: "normal" }, "w")
    expect(r.value).toBe("world")
    expect(r.mode).toBe("insert")
  })
})

describe("vimReduce — key routing in NORMAL", () => {
  it("swallows stray printable keys so they can't type", () => {
    expect(vimReduce(normal("hi", 0), "z").handled).toBe(true)
  })

  it("lets control keys fall through to the host", () => {
    expect(vimReduce(normal("hi", 0), "Enter").handled).toBe(false)
    expect(vimReduce(normal("hi", 0), "ArrowDown").handled).toBe(false)
    expect(vimReduce(normal("hi", 0), "Escape").handled).toBe(false)
  })
})
