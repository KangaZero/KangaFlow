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

  it("w returns the exclusive end past the last word (clamped later)", () => {
    // No longer clamped here — the NORMAL motion clamps onto the last char.
    expect(wordBoundary("hello world", 6, 1)).toBe(11)
    expect(vimReduce(normal("hello world", 6), "w").cursor).toBe(10)
  })

  it("b lands on the previous word's start", () => {
    expect(wordBoundary("hello world", 6, -1)).toBe(0)
  })

  it("b clamps at 0", () => {
    expect(wordBoundary("hello", 2, -1)).toBe(0)
  })

  it("W/B split on whitespace only (punctuation stays in the word)", () => {
    // "foo.bar baz": w stops at the dot; W skips to "baz".
    expect(wordBoundary("foo.bar baz", 0, 1)).toBe(3) // w
    expect(wordBoundary("foo.bar baz", 0, 1, true)).toBe(8) // W
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

  it("cw acts like ce — keeps the trailing space (:help cw)", () => {
    const pendingC = vimReduce(normal("hello world", 0), "c")
    const r = vimReduce({ ...pendingC, mode: "normal" }, "w")
    expect(r.value).toBe(" world")
    expect(r.mode).toBe("insert")
  })

  it("dw on the last word deletes through the end", () => {
    const pendingD = vimReduce(normal("hello", 0), "d")
    expect(vimReduce({ ...pendingD, mode: "normal" }, "w").value).toBe("")
  })
})

describe("vimReduce — counts", () => {
  it("1–9 build a count and are swallowed", () => {
    const r = vimReduce(normal("hello world", 0), "3")
    expect(r.count).toBe(3)
    expect(r.handled).toBe(true)
  })

  it("0 is the line-start motion with no count, a digit once counting", () => {
    // Bare 0 → go to column 0 (count stays 0).
    const bare = vimReduce(normal("hello", 3), "0")
    expect(bare.cursor).toBe(0)
    expect(bare.count).toBe(0)
    // 1 then 0 → count 10 (0 does NOT execute the motion).
    const one = vimReduce(normal("hello", 3), "1")
    const ten = vimReduce({ ...one, mode: "normal" }, "0")
    expect(ten.count).toBe(10)
    expect(ten.cursor).toBe(3) // unmoved
  })

  it("a count repeats a motion (3l)", () => {
    expect(
      vimReduce(
        { count: 3, cursor: 0, mode: "normal", value: "hello world" },
        "l"
      ).cursor
    ).toBe(3)
  })

  it("a count repeats x (2x)", () => {
    expect(
      vimReduce({ count: 2, cursor: 0, mode: "normal", value: "hello" }, "x")
        .value
    ).toBe("llo")
  })

  it("count × operator: 2dw deletes two words", () => {
    const two = vimReduce(normal("one two three", 0), "2")
    const pendingD = vimReduce({ ...two, mode: "normal" }, "d")
    expect(pendingD.opCount).toBe(2)
    expect(vimReduce({ ...pendingD, mode: "normal" }, "w").value).toBe("three")
  })

  it("operator count × motion count multiply (2d3w)", () => {
    const r = vimReduce(
      {
        count: 3,
        cursor: 0,
        mode: "normal",
        opCount: 2,
        pending: "d",
        value: "a b c d e f g",
      },
      "w"
    )
    expect(r.value).toBe("g") // 6 words deleted
  })
})

describe("vimReduce — VISUAL mode", () => {
  it("v enters visual and drops the anchor at the caret", () => {
    const r = vimReduce(normal("hello", 2), "v")
    expect(r.mode).toBe("visual")
    expect(r.anchor).toBe(2)
  })

  it("motions extend the selection (anchor fixed, cursor moves)", () => {
    const r = vimReduce(
      { anchor: 0, cursor: 0, mode: "visual", value: "hello" },
      "l"
    )
    expect(r.cursor).toBe(1)
    expect(r.anchor).toBe(0)
  })

  it("d deletes the inclusive selection and returns to NORMAL", () => {
    const r = vimReduce(
      { anchor: 0, cursor: 2, mode: "visual", value: "hello" },
      "d"
    )
    expect(r.value).toBe("lo") // [0..2] inclusive removed
    expect(r.mode).toBe("normal")
  })

  it("c changes the selection (delete + INSERT)", () => {
    const r = vimReduce(
      { anchor: 0, cursor: 1, mode: "visual", value: "hello" },
      "c"
    )
    expect(r.value).toBe("llo")
    expect(r.mode).toBe("insert")
  })

  it("v / Esc leave visual", () => {
    const base = { anchor: 0, cursor: 2, mode: "visual" as const, value: "hi" }
    expect(vimReduce(base, "v").mode).toBe("normal")
    const esc = vimReduce(base, "Escape")
    expect(esc.mode).toBe("normal")
    expect(esc.handled).toBe(true) // unlike NORMAL Esc, this is consumed
  })
})

describe("vimReduce — yank / delete register / paste", () => {
  it("deletes fill the register", () => {
    expect(vimReduce(normal("hello", 0), "x").register).toBe("h")
    const pd = vimReduce(normal("hello world", 0), "d")
    expect(vimReduce({ ...pd, mode: "normal" }, "w").register).toBe("hello ")
  })

  it("yw yanks without deleting", () => {
    const py = vimReduce(normal("hello world", 0), "y")
    expect(py.pending).toBe("y")
    const r = vimReduce({ ...py, mode: "normal" }, "w")
    expect(r.register).toBe("hello ")
    expect(r.value).toBe("hello world") // unchanged
    expect(r.cursor).toBe(0)
  })

  it("yy yanks the whole line", () => {
    const py = vimReduce(normal("hello", 2), "y")
    expect(vimReduce({ ...py, mode: "normal" }, "y").register).toBe("hello")
  })

  it("visual y copies the selection", () => {
    const r = vimReduce(
      { anchor: 0, cursor: 2, mode: "visual", value: "hello" },
      "y"
    )
    expect(r.register).toBe("hel")
    expect(r.mode).toBe("normal")
  })

  it("p pastes after the caret, P before", () => {
    const p = vimReduce(
      { cursor: 0, mode: "normal", register: "XY", value: "ab" },
      "p"
    )
    expect(p.value).toBe("aXYb")
    expect(p.cursor).toBe(2) // on the last pasted char

    const cap = vimReduce(
      { cursor: 1, mode: "normal", register: "XY", value: "ab" },
      "P"
    )
    expect(cap.value).toBe("aXYb")
    expect(cap.cursor).toBe(2)
  })

  it("the register carries across unrelated keystrokes", () => {
    const del = vimReduce(normal("hello", 0), "x") // register "h"
    const moved = vimReduce({ ...del, mode: "normal" }, "l")
    expect(moved.register).toBe("h")
  })
})

describe("vimReduce — text objects (iw/aw + pairs)", () => {
  const obj = (
    value: string,
    cursor: number,
    op: "d" | "c",
    kind: "i" | "a",
    key: string
  ) =>
    vimReduce(
      { cursor, mode: "normal", pending: op, textobj: kind, value },
      key
    )

  it("diw deletes the inner word under the caret", () => {
    const r = obj("foo bar", 5, "d", "i", "w")
    expect(r.value).toBe("foo ")
    expect(r.register).toBe("bar")
  })

  it("caw deletes a word incl. surrounding space and enters INSERT", () => {
    const r = obj("foo bar", 5, "c", "a", "w")
    expect(r.value).toBe("foo")
    expect(r.mode).toBe("insert")
  })

  it('di" deletes inside quotes', () => {
    expect(obj('a"bc"d', 2, "d", "i", '"').value).toBe('a""d')
  })

  it("di( deletes inside parentheses", () => {
    expect(obj("f(xy)z", 3, "d", "i", "(").value).toBe("f()z")
  })

  it("da( deletes the parentheses too", () => {
    expect(obj("f(xy)z", 3, "d", "a", "(").value).toBe("fz")
  })

  it("operator pending: i/a starts a text object", () => {
    const pd = vimReduce(normal("foo bar", 5), "d")
    expect(vimReduce({ ...pd, mode: "normal" }, "i").textobj).toBe("i")
  })

  it('ci" works when the cursor is before the quoted string', () => {
    // cursor at 0 ('s'), quotes later — vim still targets the string.
    expect(
      vimReduce(
        {
          cursor: 0,
          mode: "normal",
          pending: "c",
          textobj: "i",
          value: 'say "hi"',
        },
        '"'
      ).value
    ).toBe('say ""')
  })

  it("i` (backtick) is supported", () => {
    expect(
      vimReduce(
        {
          cursor: 3,
          mode: "normal",
          pending: "d",
          textobj: "i",
          value: "a`bc`d",
        },
        "`"
      ).value
    ).toBe("a``d")
  })
})

describe("vimReduce — r replace", () => {
  it("r waits for a char, then replaces the one under the caret", () => {
    const pr = vimReduce(normal("hello", 1), "r")
    expect(pr.replace).toBe(true)
    const r = vimReduce({ ...pr, mode: "normal" }, "x")
    expect(r.value).toBe("hxllo")
    expect(r.cursor).toBe(1)
  })

  it("a count replaces that many chars (3rx)", () => {
    const r = vimReduce(
      { count: 3, cursor: 0, mode: "normal", replace: true, value: "hello" },
      "x"
    )
    expect(r.value).toBe("xxxlo")
    expect(r.cursor).toBe(2)
  })

  it("r fails (no change) when count exceeds the remaining chars", () => {
    const r = vimReduce(
      { count: 9, cursor: 3, mode: "normal", replace: true, value: "hello" },
      "z"
    )
    expect(r.value).toBe("hello")
  })

  it("visual r replaces every selected char", () => {
    const r = vimReduce(
      { anchor: 0, cursor: 2, mode: "visual", replace: true, value: "hello" },
      "-"
    )
    expect(r.value).toBe("---lo")
    expect(r.mode).toBe("normal")
  })

  it("Esc cancels a pending replace", () => {
    const r = vimReduce(
      { cursor: 1, mode: "normal", replace: true, value: "hello" },
      "Escape"
    )
    expect(r.value).toBe("hello")
    expect(r.replace).toBe(false)
  })
})

describe("vimReduce — e/E/^ motions", () => {
  it("e lands on the end of the word", () => {
    expect(vimReduce(normal("abc def", 0), "e").cursor).toBe(2)
  })

  it("de deletes through the word end (inclusive)", () => {
    const pd = vimReduce(normal("abc def", 0), "d")
    expect(vimReduce({ ...pd, mode: "normal" }, "e").value).toBe(" def")
  })

  it("E ends the whitespace-word (punctuation included)", () => {
    expect(vimReduce(normal("a.b cd", 0), "E").cursor).toBe(2)
  })

  it("^ goes to the first non-blank", () => {
    expect(vimReduce(normal("  hi", 3), "^").cursor).toBe(2)
  })
})

describe("vimReduce — ~ / s / S / X", () => {
  it("~ toggles case and advances", () => {
    const r = vimReduce(normal("aB", 0), "~")
    expect(r.value).toBe("AB")
    expect(r.cursor).toBe(1)
  })

  it("3~ toggles three chars", () => {
    expect(
      vimReduce({ count: 3, cursor: 0, mode: "normal", value: "aBc" }, "~")
        .value
    ).toBe("AbC")
  })

  it("s substitutes the char and enters INSERT", () => {
    const r = vimReduce(normal("hello", 0), "s")
    expect(r.value).toBe("ello")
    expect(r.mode).toBe("insert")
  })

  it("S clears the line and enters INSERT", () => {
    const r = vimReduce(normal("hello", 2), "S")
    expect(r.value).toBe("")
    expect(r.mode).toBe("insert")
  })

  it("X deletes the char before the caret", () => {
    expect(vimReduce(normal("hello", 2), "X").value).toBe("hllo")
  })
})

describe("vimReduce — ; / , repeat find", () => {
  it("; repeats the last find forward", () => {
    const first = vimReduce(
      { cursor: 0, find: "f", mode: "normal", value: "a.b.c" },
      "."
    )
    expect(first.lastFind).toBe("f")
    expect(vimReduce({ ...first, mode: "normal" }, ";").cursor).toBe(3)
  })

  it(", repeats it reversed", () => {
    const at3 = {
      cursor: 3,
      lastFind: "f" as const,
      lastFindChar: ".",
      mode: "normal" as const,
      value: "a.b.c",
    }
    expect(vimReduce(at3, ",").cursor).toBe(1)
  })

  it("; after t advances past the adjacent char (not stuck)", () => {
    const at0 = {
      cursor: 0,
      lastFind: "t" as const,
      lastFindChar: ".",
      mode: "normal" as const,
      value: "a.b.c",
    }
    expect(vimReduce(at0, ";").cursor).toBe(2)
  })
})

describe("vimReduce — audit fixes", () => {
  it("2df. multiplies the operator count into the find", () => {
    const r = vimReduce(
      {
        cursor: 0,
        find: "f",
        mode: "normal",
        opCount: 2,
        pending: "d",
        value: "a.b.c.d",
      },
      "."
    )
    expect(r.value).toBe("c.d")
  })

  it("visual p replaces the selection with the register", () => {
    const r = vimReduce(
      { anchor: 0, cursor: 1, mode: "visual", register: "XY", value: "abcd" },
      "p"
    )
    expect(r.value).toBe("XYcd")
    expect(r.mode).toBe("normal")
  })
})

describe("vimReduce — case operators (gu/gU/g~)", () => {
  it("g opens the prefix; gu/gU/g~ become operators", () => {
    expect(vimReduce(normal("abc", 0), "g").gprefix).toBe(true)
    expect(
      vimReduce({ cursor: 0, gprefix: true, mode: "normal", value: "abc" }, "U")
        .pending
    ).toBe("gU")
  })

  it("gUw uppercases a word", () => {
    expect(
      vimReduce(
        { cursor: 0, mode: "normal", pending: "gU", value: "hello world" },
        "w"
      ).value
    ).toBe("HELLO world")
  })

  it("guu lowercases the whole line", () => {
    expect(
      vimReduce(
        { cursor: 0, mode: "normal", pending: "gu", value: "HeLLo" },
        "u"
      ).value
    ).toBe("hello")
  })

  it("guiw lowercases the inner word", () => {
    expect(
      vimReduce(
        {
          cursor: 1,
          mode: "normal",
          pending: "gu",
          textobj: "i",
          value: "FOO bar",
        },
        "w"
      ).value
    ).toBe("foo bar")
  })

  it("visual gu lowercases the selection", () => {
    const r = vimReduce(
      { anchor: 0, cursor: 2, gprefix: true, mode: "visual", value: "ABCDE" },
      "u"
    )
    expect(r.value).toBe("abcDE")
    expect(r.mode).toBe("normal")
  })
})

describe("vimReduce — find (f/F/t/T)", () => {
  it("f waits for a target char, then lands on it", () => {
    const pendingF = vimReduce(normal("hello world", 0), "f")
    expect(pendingF.find).toBe("f")
    expect(vimReduce({ ...pendingF, mode: "normal" }, "o").cursor).toBe(4)
  })

  it("F searches backward", () => {
    const r = vimReduce(
      { cursor: 10, find: "F", mode: "normal", value: "hello world" },
      "o"
    )
    expect(r.cursor).toBe(7)
  })

  it("t stops one char before the target", () => {
    const r = vimReduce(
      { cursor: 0, find: "t", mode: "normal", value: "hello" },
      "l"
    )
    expect(r.cursor).toBe(1)
  })

  it("a count picks the nth occurrence (2f.)", () => {
    const r = vimReduce(
      { count: 2, cursor: 0, find: "f", mode: "normal", value: "a.b.c" },
      "."
    )
    expect(r.cursor).toBe(3)
  })

  it("df<char> deletes through the target (inclusive)", () => {
    const r = vimReduce(
      {
        cursor: 0,
        find: "f",
        mode: "normal",
        pending: "d",
        value: "hello world",
      },
      "o"
    )
    expect(r.value).toBe(" world")
  })

  it("a missing target cancels the find", () => {
    const r = vimReduce(
      { cursor: 0, find: "f", mode: "normal", value: "hello" },
      "z"
    )
    expect(r.find).toBe("")
    expect(r.cursor).toBe(0)
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
