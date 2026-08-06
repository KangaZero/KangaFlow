import { describe, expect, it } from "vitest"

import {
  type Column,
  createColumns,
  DEFAULT_MATRIX_OPTIONS,
  frameDelayMs,
  isMatrixTheme,
  MATRIX_SCHEMES,
  parseMatrixArgs,
  renderFrame,
  stepColumn,
} from "@/lib/terminal/cmatrix"

// Deterministic rng: cycles through fixed values so column/glyph choices are
// reproducible in tests.
function seededRng(values: number[]): () => number {
  let i = 0
  return () => {
    const v = values[i % values.length] ?? 0
    i++
    return v
  }
}

describe("isMatrixTheme", () => {
  it("accepts the three app themes and rejects anything else", () => {
    expect(isMatrixTheme("light")).toBe(true)
    expect(isMatrixTheme("dark")).toBe(true)
    expect(isMatrixTheme("terminal")).toBe(true)
    expect(isMatrixTheme("green")).toBe(false)
    expect(isMatrixTheme(undefined)).toBe(false)
  })
})

describe("parseMatrixArgs", () => {
  it("returns defaults + app theme with no args", () => {
    const parsed = parseMatrixArgs([], "dark")
    expect(parsed).toEqual({
      kind: "run",
      options: { ...DEFAULT_MATRIX_OPTIONS, theme: "dark" },
    })
  })

  it("parses long and short flags", () => {
    const parsed = parseMatrixArgs(
      ["--speed", "8", "-d", "0.2", "--bold"],
      "terminal"
    )
    expect(parsed.kind).toBe("run")
    if (parsed.kind !== "run") return
    expect(parsed.options.speed).toBe(8)
    expect(parsed.options.density).toBe(0.2)
    expect(parsed.options.bold).toBe(true)
  })

  it("clamps out-of-range numbers into bounds", () => {
    const parsed = parseMatrixArgs(["-s", "99", "-d", "-4"], "light")
    if (parsed.kind !== "run") throw new Error("expected run")
    expect(parsed.options.speed).toBe(10)
    expect(parsed.options.density).toBe(0)
  })

  it("lets --color override the app theme", () => {
    const parsed = parseMatrixArgs(["--color", "terminal"], "light")
    if (parsed.kind !== "run") throw new Error("expected run")
    expect(parsed.options.theme).toBe("terminal")
  })

  it("marks the run as global for -g/--global", () => {
    expect(parseMatrixArgs(["-g"], "dark").kind).toBe("run")
    const short = parseMatrixArgs(["-g", "-s", "8"], "dark")
    if (short.kind !== "run") throw new Error("expected run")
    expect(short.global).toBe(true)
    expect(short.options.speed).toBe(8)
    const long = parseMatrixArgs(["--global"], "dark")
    if (long.kind !== "run") throw new Error("expected run")
    expect(long.global).toBe(true)
  })

  it("stays non-global without the flag", () => {
    const parsed = parseMatrixArgs([], "dark")
    if (parsed.kind !== "run") throw new Error("expected run")
    expect(parsed.global).toBeUndefined()
  })

  it("returns help for -h/--help", () => {
    expect(parseMatrixArgs(["-h"], "dark").kind).toBe("help")
    expect(parseMatrixArgs(["--help"], "dark").kind).toBe("help")
  })

  it("errors on a bad numeric value", () => {
    const parsed = parseMatrixArgs(["--speed", "fast"], "dark")
    expect(parsed.kind).toBe("error")
  })

  it("errors on an unknown color", () => {
    const parsed = parseMatrixArgs(["-C", "purple"], "dark")
    expect(parsed.kind).toBe("error")
  })

  it("errors on an unknown option", () => {
    const parsed = parseMatrixArgs(["--turbo"], "dark")
    expect(parsed.kind).toBe("error")
  })
})

describe("MATRIX_SCHEMES", () => {
  it("gives each theme a distinct head colour", () => {
    const heads = [
      MATRIX_SCHEMES.light.head,
      MATRIX_SCHEMES.dark.head,
      MATRIX_SCHEMES.terminal.head,
    ].map((rgb) => rgb.join(","))
    expect(new Set(heads).size).toBe(3)
  })
})

describe("createColumns", () => {
  it("thins columns by density", () => {
    // rng always 0 → 0 < density for any positive density → all columns rain.
    const all = createColumns(10, 5, seededRng([0]), 0.5)
    expect(all.every((c) => c !== null)).toBe(true)
    // rng always 0.9 → 0.9 < density is false for density 0.5 → none rain.
    const none = createColumns(10, 5, seededRng([0.9]), 0.5)
    expect(none.every((c) => c === null)).toBe(true)
  })
})

describe("renderFrame", () => {
  const scheme = MATRIX_SCHEMES.terminal

  it("homes the cursor and emits one row break per row minus one", () => {
    const columns: (Column | null)[] = [null, null]
    const frame = renderFrame(columns, 3, 2, scheme, false)
    expect(frame.startsWith("\x1b[H")).toBe(true)
    expect(frame.split("\r\n").length).toBe(3)
  })

  it("paints a glyph at the head with the head colour", () => {
    const col: Column = {
      counter: 0,
      frames: 1,
      glyphs: [null, "A", null],
      head: 1,
      length: 1,
    }
    const frame = renderFrame([col], 3, 1, scheme, false)
    const [r, g, b] = scheme.head
    expect(frame).toContain(`\x1b[38;2;${r};${g};${b}m`)
    expect(frame).toContain("A")
  })

  it("adds the bold weight only when asked", () => {
    const col: Column = {
      counter: 0,
      frames: 1,
      glyphs: ["X"],
      head: 0,
      length: 1,
    }
    expect(renderFrame([col], 1, 1, scheme, true)).toContain("\x1b[1m")
    expect(renderFrame([col], 1, 1, scheme, false)).not.toContain("\x1b[1m")
  })
})

describe("stepColumn", () => {
  it("only moves the head every `frames` ticks (async speed)", () => {
    const col: Column = {
      counter: 0,
      frames: 3,
      glyphs: [null, null, null],
      head: 0,
      length: 1,
    }
    stepColumn(col, 3, seededRng([0])) // tick 1 — counter 1, no move
    stepColumn(col, 3, seededRng([0])) // tick 2 — counter 2, no move
    expect(col.head).toBe(0)
    stepColumn(col, 3, seededRng([0])) // tick 3 — moves
    expect(col.head).toBe(1)
  })

  it("respawns a fully-fallen column when the probability roll passes", () => {
    const rows = 3
    // Column whose tail is already below the screen; frames 1 so it moves now.
    const col: Column = {
      counter: 0,
      frames: 1,
      glyphs: [null, null, null],
      head: rows + 1,
      length: 1,
    }
    // Sequence: 0 passes the respawn roll (0 < RESPAWN_CHANCE); the 0.5s drive
    // spawnColumn's randomInts so the fresh head staggers to a negative row.
    stepColumn(col, rows, seededRng([0, 0.5, 0.5, 0.5]))
    expect(col.head).toBeLessThan(0)
  })

  it("leaves a fallen column dormant when the roll fails", () => {
    const rows = 3
    const col: Column = {
      counter: 0,
      frames: 1,
      glyphs: [null, null, null],
      head: rows + 1,
      length: 1,
    }
    // rng 0.99 → probability roll fails → no respawn, head keeps falling.
    stepColumn(col, rows, seededRng([0.99]))
    expect(col.head).toBe(rows + 2)
  })
})

describe("frameDelayMs", () => {
  it("maps higher speed to a shorter delay", () => {
    expect(frameDelayMs(1)).toBeGreaterThan(frameDelayMs(10))
  })

  it("clamps out-of-range speeds", () => {
    expect(frameDelayMs(-5)).toBe(frameDelayMs(1))
    expect(frameDelayMs(999)).toBe(frameDelayMs(10))
  })
})
