// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { handleKey, initPager, renderPager } from "@/lib/terminal/pager"

const LINES = [
  "first line",
  "second line",
  "alpha needle beta",
  "fourth line",
  "gamma needle delta",
  "last line",
] as const

const ROWS = 3
const FILE = "notes.txt"

describe("initPager", () => {
  it("starts at the top in normal mode with empty buffers", () => {
    expect(initPager()).toStrictEqual({
      cursorCol: 0,
      cursorLine: 0,
      input: "",
      lastSearch: "",
      message: "",
      mode: "normal",
      topLine: 0,
    })
  })
})

describe("handleKey motions", () => {
  it("`j` then `k` returns to the starting line", () => {
    const start = initPager()
    const down = handleKey(start, "j", LINES, ROWS)
    expect(down.state.cursorLine).toBe(1)
    const up = handleKey(down.state, "k", LINES, ROWS)
    expect(up.state.cursorLine).toBe(0)
    expect(up.quit).toBe(false)
  })

  it("`G` jumps to the last line", () => {
    const { state } = handleKey(initPager(), "G", LINES, ROWS)
    expect(state.cursorLine).toBe(LINES.length - 1)
  })

  it("`gg` jumps back to the first line", () => {
    const bottom = handleKey(initPager(), "G", LINES, ROWS).state
    const g1 = handleKey(bottom, "g", LINES, ROWS)
    const g2 = handleKey(g1.state, "g", LINES, ROWS)
    expect(g2.state.cursorLine).toBe(0)
  })

  it("never crashes and clamps on an empty buffer", () => {
    const { state } = handleKey(initPager(), "j", [], ROWS)
    expect(state.cursorLine).toBe(0)
    expect(state.topLine).toBe(0)
  })
})

describe("handleKey command mode", () => {
  it("`:q` sets quit to true", () => {
    const colon = handleKey(initPager(), ":", LINES, ROWS)
    expect(colon.state.mode).toBe("command")
    const q = handleKey(colon.state, "q", LINES, ROWS)
    const enter = handleKey(q.state, "\r", LINES, ROWS)
    expect(enter.quit).toBe(true)
    expect(enter.state.mode).toBe("normal")
  })

  it("reports an unknown command", () => {
    let s = handleKey(initPager(), ":", LINES, ROWS).state
    for (const ch of "bogus") s = handleKey(s, ch, LINES, ROWS).state
    const enter = handleKey(s, "\r", LINES, ROWS)
    expect(enter.quit).toBe(false)
    expect(enter.state.message).toContain("E492")
  })
})

describe("handleKey search mode", () => {
  it("`/needle` + Enter moves the cursor to the matching line", () => {
    let s = handleKey(initPager(), "/", LINES, ROWS).state
    expect(s.mode).toBe("search")
    for (const ch of "needle") s = handleKey(s, ch, LINES, ROWS).state
    const done = handleKey(s, "\r", LINES, ROWS)
    expect(done.state.mode).toBe("normal")
    expect(done.state.cursorLine).toBe(2)
    expect(done.state.cursorCol).toBe(LINES[2].indexOf("needle"))
    expect(done.state.lastSearch).toBe("needle")
  })
})

describe("renderPager", () => {
  it("returns exactly `rows` lines with the file name in the status line", () => {
    const frame = renderPager(initPager(), LINES, {
      cols: 40,
      fileName: FILE,
      rows: ROWS,
    })
    expect(frame).toHaveLength(ROWS)
    const status = frame[ROWS - 1] ?? ""
    expect(status).toContain(FILE)
  })
})
