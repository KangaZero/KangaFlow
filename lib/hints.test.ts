import { describe, expect, it } from "vitest"

import {
  activationFor,
  CANDIDATE_SELECTOR,
  compareReadingOrder,
  dedupeNested,
  HINT_ALPHABET,
  type HintCandidate,
  hintLabels,
  INTERACTIVE_SELECTOR,
  intersectRect,
  type Rect,
  rectArea,
  samplePoints,
  WRAPPER_COVERAGE,
} from "@/lib/hints"

const rect = (
  left: number,
  top: number,
  width: number,
  height: number
): Rect => ({
  bottom: top + height,
  left,
  right: left + width,
  top,
})

describe("hintLabels", () => {
  it("returns exactly `count` labels", () => {
    for (const n of [0, 1, 3, 26, 27, 60, 700]) {
      expect(hintLabels(n)).toHaveLength(n)
    }
  })

  it("returns unique labels", () => {
    const labels = hintLabels(120)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it("is prefix-free — no label is a prefix of another", () => {
    const labels = hintLabels(120)
    // One assertion over all pairs (14,400 expect() calls was slow enough to
    // time out under parallel CPU load); a failure lists the offending pairs.
    const prefixPairs = labels.flatMap((a) =>
      labels.filter((b) => a !== b && b.startsWith(a)).map((b) => `${a}→${b}`)
    )
    expect(prefixPairs).toEqual([])
  })

  it("uses single characters while they suffice", () => {
    const labels = hintLabels(5)
    expect(labels.every((label) => label.length === 1)).toBe(true)
  })

  it("only uses characters from the alphabet", () => {
    const allowed = new Set(HINT_ALPHABET)
    for (const label of hintLabels(120)) {
      for (const ch of label) expect(allowed.has(ch)).toBe(true)
    }
  })
})

describe("selectors", () => {
  // jsdom can't lay out, but it can match selectors — enough to pin down what
  // counts as a target at all.
  function matches(html: string, selector: string): boolean {
    const host = document.createElement("div")
    host.innerHTML = html
    const el = host.firstElementChild
    if (!el) throw new Error("fixture rendered nothing")
    return el.matches(selector)
  }

  it.each([
    '<a href="/x">x</a>',
    "<button>x</button>",
    '<input type="text">',
    "<textarea></textarea>",
    "<select></select>",
    "<summary>x</summary>",
    '<label for="a">x</label>',
    '<div contenteditable="true"></div>',
    '<div contenteditable=""></div>',
    '<div role="button"></div>',
    '<div role="tab"></div>',
    '<div role="switch"></div>',
    '<div role="menuitem"></div>',
  ])("treats %s as interactive", (html) => {
    expect(matches(html, INTERACTIVE_SELECTOR)).toBe(true)
  })

  it.each([
    "<a>no href</a>",
    "<button disabled>x</button>",
    '<input type="hidden">',
    '<input type="text" disabled>',
    '<div contenteditable="false"></div>',
    '<div role="button" aria-disabled="true"></div>',
    '<div tabindex="0"></div>',
    "<label>no for</label>",
  ])("does not treat %s as interactive", (html) => {
    expect(matches(html, INTERACTIVE_SELECTOR)).toBe(false)
  })

  it("adds tabindex focus stops as candidates, but not tabindex=-1", () => {
    expect(matches('<div tabindex="0"></div>', CANDIDATE_SELECTOR)).toBe(true)
    expect(matches('<div tabindex="-1"></div>', CANDIDATE_SELECTOR)).toBe(false)
    expect(matches('<div tabindex="-1"></div>', INTERACTIVE_SELECTOR)).toBe(
      false
    )
  })
})

describe("intersectRect", () => {
  it("returns the overlap", () => {
    expect(intersectRect(rect(0, 0, 100, 100), rect(50, 20, 100, 100))).toEqual(
      rect(50, 20, 50, 80)
    )
  })

  it("returns null when disjoint or only touching", () => {
    expect(intersectRect(rect(0, 0, 10, 10), rect(20, 0, 10, 10))).toBeNull()
    expect(intersectRect(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBeNull()
  })

  it("rejects sub-pixel slivers", () => {
    expect(intersectRect(rect(0, 0, 10, 10), rect(9.5, 0, 10, 10))).toBeNull()
  })

  it("clamps a partly off-screen element to the viewport", () => {
    const viewport = rect(0, 0, 1280, 800)
    expect(intersectRect(rect(-40, 780, 100, 60), viewport)).toEqual(
      rect(0, 780, 60, 20)
    )
  })
})

describe("rectArea", () => {
  it("is width × height, never negative", () => {
    expect(rectArea(rect(0, 0, 10, 4))).toBe(40)
    expect(rectArea({ bottom: 0, left: 10, right: 0, top: 10 })).toBe(0)
  })
})

describe("samplePoints", () => {
  it("probes the centre first, then the quarter points, then near the corners", () => {
    expect(samplePoints(rect(100, 200, 40, 20))).toEqual([
      { x: 120, y: 210 },
      { x: 110, y: 205 },
      { x: 130, y: 205 },
      { x: 110, y: 215 },
      { x: 130, y: 215 },
      { x: 104, y: 202 },
      { x: 136, y: 202 },
      { x: 104, y: 218 },
      { x: 136, y: 218 },
    ])
  })

  it("keeps every point strictly inside the rect", () => {
    const r = rect(3, 7, 11, 5)
    for (const { x, y } of samplePoints(r)) {
      expect(x).toBeGreaterThan(r.left)
      expect(x).toBeLessThan(r.right)
      expect(y).toBeGreaterThan(r.top)
      expect(y).toBeLessThan(r.bottom)
    }
  })
})

describe("compareReadingOrder", () => {
  it("sorts top-to-bottom, then left-to-right", () => {
    const named = [
      { name: "row2-left", r: rect(0, 50, 10, 10) },
      { name: "row1-right", r: rect(90, 0, 10, 10) },
      { name: "row1-left", r: rect(5, 0, 10, 10) },
    ]
    const sorted = [...named].sort((a, b) => compareReadingOrder(a.r, b.r))
    expect(sorted.map((n) => n.name)).toEqual([
      "row1-left",
      "row1-right",
      "row2-left",
    ])
  })
})

describe("dedupeNested", () => {
  // A tiny tree: each node lists its ancestors by id.
  type Node = { readonly id: string; readonly ancestors: readonly string[] }
  const contains = (outer: Node, inner: Node) =>
    inner.ancestors.includes(outer.id)
  const cand = (
    id: string,
    ancestors: readonly string[],
    r: Rect,
    focusOnly = false
  ): HintCandidate<Node> => ({ el: { ancestors, id }, focusOnly, rect: r })
  const ids = (list: readonly HintCandidate<Node>[]) => list.map((c) => c.el.id)

  it("keeps unrelated targets", () => {
    const list = [
      cand("a", [], rect(0, 0, 10, 10)),
      cand("b", [], rect(20, 0, 10, 10)),
    ]
    expect(ids(dedupeNested(list, contains))).toEqual(["a", "b"])
  })

  it("drops a wrapper whose single child covers it (keeps the innermost)", () => {
    const list = [
      cand("link", [], rect(0, 0, 100, 40)),
      cand("button", ["link"], rect(0, 0, 100, 40)),
    ]
    expect(ids(dedupeNested(list, contains))).toEqual(["button"])
  })

  it("applies the coverage threshold at exactly WRAPPER_COVERAGE", () => {
    const outer = cand("outer", [], rect(0, 0, 100, 100))
    const atThreshold = cand(
      "in",
      ["outer"],
      rect(0, 0, 100, 100 * WRAPPER_COVERAGE)
    )
    const below = cand(
      "in",
      ["outer"],
      rect(0, 0, 100, 100 * WRAPPER_COVERAGE - 1)
    )
    expect(ids(dedupeNested([outer, atThreshold], contains))).toEqual(["in"])
    expect(ids(dedupeNested([outer, below], contains))).toEqual(["outer", "in"])
  })

  it("keeps both when an interactive card holds a small link", () => {
    const list = [
      cand("card", [], rect(0, 0, 300, 200)),
      cand("more", ["card"], rect(250, 170, 40, 20)),
    ]
    expect(ids(dedupeNested(list, contains))).toEqual(["card", "more"])
  })

  it("drops a focus-only container that holds any target", () => {
    const list = [
      cand("dock", [], rect(0, 0, 400, 60), true),
      cand("app1", ["dock"], rect(10, 10, 40, 40)),
      cand("app2", ["dock"], rect(60, 10, 40, 40)),
    ]
    expect(ids(dedupeNested(list, contains))).toEqual(["app1", "app2"])
  })

  it("keeps a focus-only leaf (keyboard focus stop with nothing inside)", () => {
    const list = [cand("name", [], rect(0, 0, 200, 50), true)]
    expect(ids(dedupeNested(list, contains))).toEqual(["name"])
  })

  it("resolves deep nesting to the innermost real target", () => {
    const list = [
      cand("group", [], rect(0, 0, 200, 50), true),
      cand("link", ["group"], rect(0, 0, 200, 50)),
      cand("button", ["group", "link"], rect(0, 0, 200, 48)),
    ]
    expect(ids(dedupeNested(list, contains))).toEqual(["button"])
  })
})

describe("activationFor", () => {
  const base = { focusOnly: false, inputType: "", isContentEditable: false }

  it("focuses text entry", () => {
    expect(
      activationFor({ ...base, inputType: "text", tagName: "INPUT" })
    ).toBe("focus")
    expect(
      activationFor({ ...base, inputType: "password", tagName: "INPUT" })
    ).toBe("focus")
    expect(activationFor({ ...base, tagName: "TEXTAREA" })).toBe("focus")
    expect(activationFor({ ...base, tagName: "SELECT" })).toBe("focus")
    expect(
      activationFor({ ...base, isContentEditable: true, tagName: "DIV" })
    ).toBe("focus")
  })

  it("clicks click-type inputs", () => {
    for (const inputType of ["checkbox", "radio", "submit", "button", "file"]) {
      expect(activationFor({ ...base, inputType, tagName: "INPUT" })).toBe(
        "click"
      )
    }
  })

  it("clicks links, buttons and role widgets", () => {
    expect(activationFor({ ...base, tagName: "A" })).toBe("click")
    expect(activationFor({ ...base, tagName: "BUTTON" })).toBe("click")
    expect(activationFor({ ...base, tagName: "DIV" })).toBe("click")
  })

  it("focuses focus-only stops instead of clicking them", () => {
    expect(activationFor({ ...base, focusOnly: true, tagName: "DIV" })).toBe(
      "focus"
    )
  })
})
