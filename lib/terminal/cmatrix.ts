// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure "cmatrix" engine for the in-browser xterm terminal: the digital-rain
// screensaver. Kept free of xterm/DOM/timer APIs so the whole thing is a pure
// function of its inputs (state + injected rng) — trivially testable and safe in
// the static export, exactly like fastfetch.ts. The React component owns the
// clock (setInterval) and the keystroke that stops it; everything here is logic.
//
// Model: one `Column | null` per terminal column (null = a column that never
// rains, so `--density` just thins the array). A column tracks its falling
// head, a stored glyph per row (so the trail stays stable instead of shimmering
// every frame), and an "async" per-column speed. `stepColumn` advances one
// column one tick; `renderFrame` paints the whole grid into a single ANSI
// string the component writes in one `term.write`.

export type Rgb = readonly [number, number, number]

// The three app themes each get their own rain look (colour + head accent).
// This is intentionally keyed off the *theme name*, not the terminal palette:
// `paletteForTheme` collapses `dark` and `terminal` into one Mocha palette, but
// we want them visually distinct here.
export type MatrixTheme = "light" | "dark" | "terminal"

const MATRIX_THEMES: readonly MatrixTheme[] = ["light", "dark", "terminal"]

export function isMatrixTheme(value: string | undefined): value is MatrixTheme {
  return value !== undefined && MATRIX_THEMES.includes(value as MatrixTheme)
}

// A rain colour scheme: the bright leading glyph, then a fade gradient applied
// to the trailing glyphs (index 0 = just behind the head, last = faintest).
export type MatrixScheme = {
  head: Rgb
  trail: readonly Rgb[]
}

export const MATRIX_SCHEMES: Record<MatrixTheme, MatrixScheme> = {
  // Mocha dark: a mauve→blue rain that matches the dark app accents.
  dark: {
    head: [245, 224, 220], // Mocha rosewater head
    trail: [
      [203, 166, 247], // mauve
      [137, 180, 250], // blue
      [88, 91, 112], // surface2
      [49, 50, 68], // surface0 (faint)
    ],
  },
  // Latte light: rain must stay dark/saturated to read over the light scrim, so
  // the "bright" head is a strong teal and the trail fades toward the overlay.
  light: {
    head: [23, 146, 153], // Latte teal head
    trail: [
      [30, 102, 245], // blue
      [136, 57, 239], // mauve
      [124, 127, 147], // subtext
      [156, 160, 176], // overlay (faint)
    ],
  },
  // Classic Matrix green — the "hacker" terminal theme leans all the way in.
  terminal: {
    head: [224, 255, 224], // near-white leading glyph
    trail: [
      [166, 227, 161], // Catppuccin green (bright)
      [64, 160, 43],
      [38, 110, 30],
      [22, 66, 18], // faint tail
    ],
  },
}

// --- Options + CLI parsing -------------------------------------------------

export type MatrixOptions = {
  speed: number // 1 (slow) .. 10 (fast) — scales the frame interval
  density: number // 0 .. 1 — fraction of columns that rain
  bold: boolean // draw glyphs bold
  theme: MatrixTheme // which colour scheme to use
}

export const DEFAULT_MATRIX_OPTIONS: Omit<MatrixOptions, "theme"> = {
  bold: false,
  density: 0.5,
  speed: 5,
}

// Result of parsing the argv-style token list. `run` carries validated options;
// `help` and `error` carry a ready-to-print message (English, like the other
// shell strings — this is CLI/`--help` output, not user-facing UI copy).
export type MatrixParse =
  | { kind: "run"; options: MatrixOptions }
  | { kind: "help"; text: string }
  | { kind: "error"; message: string }

export const MATRIX_HELP = [
  "cmatrix — terminal digital rain",
  "",
  "usage: cmatrix [options]",
  "  -s, --speed <1-10>     fall speed (default 5)",
  "  -d, --density <0-1>    fraction of columns raining (default 0.5)",
  "  -b, --bold             bold glyphs",
  "  -C, --color <theme>    force a palette: light | dark | terminal",
  "  -h, --help             show this help",
  "",
  "press any key to stop.",
].join("\r\n")

// Clamp a parsed number into [min, max], or return null if it wasn't a number.
function parseBounded(
  raw: string | undefined,
  min: number,
  max: number
): number | null {
  if (raw === undefined) return null
  const n = Number(raw)
  if (!Number.isFinite(n)) return null
  return Math.min(max, Math.max(min, n))
}

// Parse argv-style tokens into options. `appTheme` is the current app theme,
// used as the default scheme unless `--color` overrides it.
export function parseMatrixArgs(
  args: readonly string[],
  appTheme: MatrixTheme
): MatrixParse {
  const options: MatrixOptions = { ...DEFAULT_MATRIX_OPTIONS, theme: appTheme }

  for (let i = 0; i < args.length; i++) {
    const token = args[i]
    switch (token) {
      case "-h":
      case "--help":
        return { kind: "help", text: MATRIX_HELP }
      case "-b":
      case "--bold":
        options.bold = true
        break
      case "-s":
      case "--speed": {
        const value = parseBounded(args[++i], 1, 10)
        if (value === null) {
          return {
            kind: "error",
            message: `cmatrix: ${token} needs a number 1-10`,
          }
        }
        options.speed = value
        break
      }
      case "-d":
      case "--density": {
        const value = parseBounded(args[++i], 0, 1)
        if (value === null) {
          return {
            kind: "error",
            message: `cmatrix: ${token} needs a number 0-1`,
          }
        }
        options.density = value
        break
      }
      case "-C":
      case "--color": {
        const value = args[++i]
        if (!isMatrixTheme(value)) {
          return {
            kind: "error",
            message: `cmatrix: ${token} expects light | dark | terminal`,
          }
        }
        options.theme = value
        break
      }
      default:
        return { kind: "error", message: `cmatrix: unknown option '${token}'` }
    }
  }

  return { kind: "run", options }
}

// --- Column state + stepping ----------------------------------------------

export type Column = {
  head: number // row of the leading glyph; starts negative (drop enters from top)
  length: number // number of trailing glyphs behind the head
  frames: number // ticks between head moves — higher = slower ("async" speed)
  counter: number // ticks elapsed since the last move
  glyphs: (string | null)[] // glyph shown at each row (length === rows)
}

// Monospace-safe glyph set. Half-width katakana would look more "Matrix", but
// JetBrains Mono renders several of them at the wrong advance width (the
// documented glyph-width trap), which would shear the full-width frame writes —
// so we stick to ASCII letters/digits/symbols that are reliably one cell wide.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*<>=+-/\\|:;.?!"

export function randomGlyph(rng: () => number): string {
  return GLYPHS[Math.floor(rng() * GLYPHS.length)] ?? "0"
}

// Per-tick probability that a fully-fallen column restarts. Low enough to leave
// visible gaps between successive drops in the same column (organic, not a
// solid curtain); a tick only fires this test after the trail clears the floor.
const RESPAWN_CHANCE = 0.08

// Inclusive integer in [min, max].
function randomInt(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

// Build a fresh raining column: staggered above the screen so drops don't all
// start in lockstep, a random trail length and a random async speed. Reused for
// the initial fill AND for respawning a column that has fallen off-screen.
export function spawnColumn(rows: number, rng: () => number): Column {
  return {
    counter: 0,
    frames: randomInt(rng, 1, 4),
    glyphs: new Array<string | null>(rows).fill(null),
    head: -randomInt(rng, 0, rows),
    length: randomInt(rng, Math.max(4, Math.floor(rows / 4)), rows),
  }
}

// Create the per-column array for a `width`×`rows` screen. `density` thins it:
// each column independently rains with probability `density`, else stays null.
export function createColumns(
  width: number,
  rows: number,
  rng: () => number,
  density: number
): (Column | null)[] {
  return Array.from({ length: width }, () =>
    rng() < density ? spawnColumn(rows, rng) : null
  )
}

// Advance ONE column by a single animation tick, mutating it in place.
export function stepColumn(col: Column, rows: number, rng: () => number): void {
  // Async speed: only move the head every `frames` ticks.
  col.counter += 1
  if (col.counter < col.frames) return
  col.counter = 0

  // Drop the head one row and stamp a fresh glyph where it lands.
  col.head += 1
  if (col.head >= 0 && col.head < rows) {
    col.glyphs[col.head] = randomGlyph(rng)
  }

  // Erase the glyph falling off the bottom of the trail so the trail keeps its
  // length instead of smearing down the whole column.
  const tail = col.head - col.length
  if (tail >= 0 && tail < rows) {
    col.glyphs[tail] = null
  }

  // Once the whole trail has fallen past the bottom edge the column is blank,
  // so respawn it — but only sometimes, gated behind a probability roll. That
  // random delay staggers the restarts so columns burst back organically
  // instead of all re-dropping in lockstep. A fresh spawn re-randomises the
  // async `frames` speed too, which is what keeps the rain from marching in
  // sync over time. Mutate in place (the caller relies on `stepColumn` void).
  if (tail >= rows && rng() < RESPAWN_CHANCE) {
    Object.assign(col, spawnColumn(rows, rng))
  }
}

// --- Frame rendering -------------------------------------------------------

// Colour for a glyph `distance` rows behind the head (0 = the head itself).
function colorAt(scheme: MatrixScheme, distance: number): Rgb {
  if (distance <= 0) return scheme.head
  const index = Math.min(distance - 1, scheme.trail.length - 1)
  return scheme.trail[index] ?? scheme.head
}

const RESET = "\x1b[0m"
const fg = ([r, g, b]: Rgb): string => `\x1b[38;2;${r};${g};${b}m`

// Paint the whole grid into one ANSI string: home the cursor, then write every
// row full-width (glyph cells coloured, empty cells as spaces). Writing every
// cell each frame means the previous frame is fully overwritten — no ghosting,
// no need to track dirty cells.
export function renderFrame(
  columns: readonly (Column | null)[],
  rows: number,
  width: number,
  scheme: MatrixScheme,
  bold: boolean
): string {
  // grid[y][x] = the coloured glyph at that cell, or null for empty.
  const grid: (string | null)[][] = Array.from({ length: rows }, () =>
    new Array<string | null>(width).fill(null)
  )
  const weight = bold ? "\x1b[1m" : ""

  columns.forEach((col, x) => {
    if (!col) return
    for (let d = 0; d < col.length; d++) {
      const y = col.head - d
      if (y < 0 || y >= rows) continue
      const glyph = col.glyphs[y]
      if (!glyph) continue
      const row = grid[y]
      if (row) row[x] = `${fg(colorAt(scheme, d))}${weight}${glyph}${RESET}`
    }
  })

  let out = "\x1b[H"
  for (let y = 0; y < rows; y++) {
    const row = grid[y]
    let line = ""
    for (let x = 0; x < width; x++) {
      line += row?.[x] ?? " "
    }
    out += y < rows - 1 ? `${line}\r\n` : line
  }
  return out
}

// Map the 1..10 speed dial to a setInterval delay (ms). Higher speed = shorter
// delay. Roughly 120ms (slow) down to ~30ms (fast).
export function frameDelayMs(speed: number): number {
  const clamped = Math.min(10, Math.max(1, speed))
  return Math.round(130 - clamped * 10)
}
