// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// A pure "fastfetch" clone renderer for the in-browser xterm.js terminal. It
// takes plain facts the UI already knows (theme, resolution, uptime, ...) and
// returns an array of ready-to-write terminal lines carrying ANSI SGR escapes.
// No network, no IP lookup, no Node APIs — the output is a pure function of the
// input so it stays trivially testable and safe in the static export.

export type FastfetchInfo = {
  themeLabel: string // e.g. "terminal (Catppuccin)"
  resolution: string // e.g. "1920x1080"
  uptime: string // preformatted, e.g. "3 mins"
  browser: string // e.g. "Chrome"
  locale: "en" | "ja"
  colors: number // e.g. 256
  dark: boolean // true → Mocha accents, false → Latte
}

// Localised info-row labels so the banner reads in the active language.
type InfoLabels = {
  os: string
  host: string
  kernel: string
  shell: string
  terminal: string
  theme: string
  resolution: string
  locale: string
  uptime: string
  editor: string
}

const LABELS: Record<"en" | "ja", InfoLabels> = {
  en: {
    editor: "Editor",
    host: "Host",
    kernel: "Kernel",
    locale: "Locale",
    os: "OS",
    resolution: "Resolution",
    shell: "Shell",
    terminal: "Terminal",
    theme: "Theme",
    uptime: "Uptime",
  },
  ja: {
    editor: "エディタ",
    host: "ホスト",
    kernel: "カーネル",
    locale: "言語",
    os: "OS",
    resolution: "解像度",
    shell: "シェル",
    terminal: "端末",
    theme: "テーマ",
    uptime: "稼働時間",
  },
}

// --- ANSI helpers ----------------------------------------------------------

const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"

type Rgb = readonly [number, number, number]

// Truecolor foreground/background. xterm.js renders 24-bit SGR directly.
const fg = ([r, g, b]: Rgb): string => `\x1b[38;2;${r};${g};${b}m`
const bg256 = (index: number): string => `\x1b[48;5;${index}m`
const bgRgb = ([r, g, b]: Rgb): string => `\x1b[48;2;${r};${g};${b}m`

// Accent set for labels, the user@host title, and the logo gradient. Two
// Catppuccin flavours so the banner matches the active terminal theme: Mocha
// (dark) and Latte (light).
type Accents = {
  mauve: Rgb
  teal: Rgb
  pink: Rgb
  blue: Rgb
  text: Rgb
  sapphire: Rgb
  lavender: Rgb
  overlay: Rgb
}

const MOCHA: Accents = {
  blue: [137, 180, 250], // #89b4fa
  lavender: [180, 190, 254], // #b4befe
  mauve: [203, 166, 247], // #cba6f7
  overlay: [108, 112, 134], // #6c7086
  pink: [245, 194, 231], // #f5c2e7
  sapphire: [116, 199, 236], // #74c7ec
  teal: [148, 226, 213], // #94e2d5
  text: [205, 214, 244], // #cdd6f4
}

const LATTE: Accents = {
  blue: [30, 102, 245], // #1e66f5
  lavender: [114, 135, 253], // #7287fd
  mauve: [136, 57, 239], // #8839ef
  overlay: [156, 160, 176], // #9ca0b0
  pink: [234, 118, 203], // #ea76cb
  sapphire: [32, 159, 181], // #209fb5
  teal: [23, 146, 153], // #179299
  text: [76, 79, 105], // #4c4f69
}

// Linearly interpolate between two colours; `t` runs 0 → 1.
const lerp = (from: Rgb, to: Rgb, t: number): Rgb => [
  Math.round(from[0] + (to[0] - from[0]) * t),
  Math.round(from[1] + (to[1] - from[1]) * t),
  Math.round(from[2] + (to[2] - from[2]) * t),
]

// --- Left column: the NixOS snowflake with "KF" in its centre hole ----------

// Source drawing of the mark in quadrant block glyphs. It is NOT written to the
// terminal: the latin JetBrains Mono subset lacks block elements (U+2580+), so
// on xterm's DOM renderer they fell back to another font at the wrong width
// (~70% of a cell) and the logo sheared. Instead each glyph is decoded into a
// pixel and painted as a background-coloured SPACE — one cell in every font.
const LOGO_ART: readonly string[] = [
  "          ▗▄▄▄       ▗▄▄▄▄    ▄▄▄▖",
  "          ▜███▙       ▜███▙  ▟███▛",
  "           ▜███▙       ▜███▙▟███▛",
  "            ▜███▙       ▜██████▛",
  "     ▟█████████████████▙ ▜████▛     ▟▙",
  "    ▟███████████████████▙ ▜███▙    ▟██▙",
  "           ▄▄▄▄▖           ▜███▙  ▟███▛",
  "          ▟███▛             ▜██▛ ▟███▛",
  "         ▟███▛               ▜▛ ▟███▛",
  "▟███████████▛                  ▟██████████▙",
  "▜██████████▛                  ▟███████████▛",
  "      ▟███▛ ▟▙               ▟███▛",
  "     ▟███▛ ▟██▙             ▟███▛",
  "    ▟███▛  ▜███▙           ▝▀▀▀▀",
  "    ▜██▛    ▜███▙ ▜██████████████████▛",
  "     ▜▛     ▟████▙ ▜████████████████▛",
  "           ▟██████▙         ▜███▙",
  "          ▟███▛▜███▙         ▜███▙",
  "         ▟███▛  ▜███▙         ▜███▙",
  "         ▝▀▀▀    ▀▀▀▀▘         ▀▀▀▘",
]

// Quadrants of each block glyph: [top-left, top-right, bottom-left, bottom-right].
const QUADRANTS: Record<string, readonly [number, number, number, number]> = {
  " ": [0, 0, 0, 0],
  "▀": [1, 1, 0, 0],
  "▄": [0, 0, 1, 1],
  "█": [1, 1, 1, 1],
  "▌": [1, 0, 1, 0],
  "▐": [0, 1, 0, 1],
  "▖": [0, 0, 1, 0],
  "▗": [0, 0, 0, 1],
  "▘": [1, 0, 0, 0],
  "▙": [1, 0, 1, 1],
  "▚": [1, 0, 0, 1],
  "▛": [1, 1, 1, 0],
  "▜": [1, 1, 0, 1],
  "▝": [0, 1, 0, 0],
  "▞": [0, 1, 1, 0],
  "▟": [0, 1, 1, 1],
}

/** Cells per logo row: one cell per source glyph. */
export const LOGO_WIDTH = LOGO_ART.reduce(
  (max, line) => Math.max(max, [...line].length),
  0
)

// 3×5 pixel letters stamped into the snowflake's centre hole.
const PIXEL_FONT: Record<"K" | "F", readonly string[]> = {
  F: ["###", "#..", "##.", "#..", "#.."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
}

/** Logo pixel: 0 = empty, 1 = snowflake, 2 = "KF" lettering. */
export type LogoPixel = 0 | 1 | 2

/**
 * The logo as a pixel grid (one cell per source glyph, filled when at least
 * two of its four quadrants are), with "KF" stamped centred in the hole.
 */
export function logoPixels(): LogoPixel[][] {
  const grid: LogoPixel[][] = LOGO_ART.map((line) =>
    [...line.padEnd(LOGO_WIDTH, " ")].map((glyph): LogoPixel => {
      const q = QUADRANTS[glyph] ?? [0, 0, 0, 0]
      return q[0] + q[1] + q[2] + q[3] >= 2 ? 1 : 0
    })
  )
  const letters = ["K", "F"] as const
  const lettersWidth = 3 + 1 + 3
  const x0 = Math.round(LOGO_WIDTH / 2 - lettersWidth / 2)
  const y0 = Math.round(grid.length / 2 - 5 / 2)
  letters.forEach((letter, i) => {
    PIXEL_FONT[letter].forEach((row, y) => {
      ;[...row].forEach((cell, x) => {
        const target = grid[y0 + y]
        if (cell === "#" && target) target[x0 + i * 4 + x] = 2
      })
    })
  })
  return grid
}

// Paint one logo row: snowflake cells on a diagonal sapphire → blue → lavender
// gradient, "KF" cells pink, empty cells plain spaces. Always LOGO_WIDTH cells.
const paintLogoRow = (
  row: readonly LogoPixel[],
  y: number,
  rows: number,
  accents: Accents
): string => {
  let out = ""
  row.forEach((pixel, x) => {
    if (pixel === 0) {
      out += `${RESET} `
      return
    }
    if (pixel === 2) {
      out += `${bgRgb(accents.pink)} `
      return
    }
    const t = (x / Math.max(1, LOGO_WIDTH - 1) + y / Math.max(1, rows - 1)) / 2
    const colour =
      t < 0.5
        ? lerp(accents.sapphire, accents.blue, t * 2)
        : lerp(accents.blue, accents.lavender, (t - 0.5) * 2)
    out += `${bgRgb(colour)} `
  })
  return `${out}${RESET}`
}

const GAP = "    " // spacer between the logo column and the info column
const LABEL_WIDTH = 11

// --- Right column: fastfetch-style info rows -------------------------------

type InfoRow = { label: string; value: string }

// One "Label      value" row: label accented and padded so values align.
const paintInfoRow = ({ label, value }: InfoRow, accents: Accents): string =>
  `${fg(accents.mauve)}${label.padEnd(LABEL_WIDTH)}${RESET}${fg(accents.text)}${value}${RESET}`

// --- Bottom: fastfetch-style colour palette --------------------------------

// Two rows of eight swatches (ANSI 0–7 and 8–15, which xterm maps to the
// active theme palette), three cells each.
const paletteRows = (): string[] => {
  const block = "   "
  const makeRow = (base: number): string => {
    let out = ""
    for (let i = 0; i < 8; i++) out += `${bg256(base + i)}${block}`
    return `${out}${RESET}`
  }
  return [makeRow(0), makeRow(8)]
}

// --- Public renderer -------------------------------------------------------

// Logo column on the left, info column (title, rule, rows, swatches) on the
// right, vertically centred against the logo. Returns lines xterm writes as-is.
export function renderFastfetch(info: FastfetchInfo): string[] {
  const accents = info.dark ? MOCHA : LATTE
  const user = "kangazero"
  const host = "kangaflow"
  const title = `${BOLD}${fg(accents.teal)}${user}${RESET}${fg(accents.overlay)}@${RESET}${BOLD}${fg(accents.blue)}${host}${RESET}`
  const rule = `${fg(accents.overlay)}${"·".repeat(user.length + 1 + host.length)}${RESET}`

  const t = LABELS[info.locale]
  const rows: InfoRow[] = [
    { label: t.os, value: "KangaFlow-Nix" },
    { label: t.host, value: "kangazero.github.io" },
    { label: t.kernel, value: info.browser },
    { label: t.shell, value: "kanga-zsh" },
    { label: t.terminal, value: "xterm.js" },
    { label: t.theme, value: info.themeLabel },
    { label: t.resolution, value: info.resolution },
    { label: t.locale, value: info.locale },
    { label: t.uptime, value: info.uptime },
    { label: t.editor, value: "nvim" },
  ]

  const infoLines: string[] = [
    title,
    rule,
    ...rows.map((row) => paintInfoRow(row, accents)),
    "",
    ...paletteRows(),
  ]

  const pixels = logoPixels()
  const top = Math.max(0, Math.floor((pixels.length - infoLines.length) / 2))
  const rowCount = Math.max(pixels.length, top + infoLines.length)
  const blankLeft = " ".repeat(LOGO_WIDTH)
  const lines: string[] = []
  for (let i = 0; i < rowCount; i++) {
    const pixelRow = pixels[i]
    const left = pixelRow
      ? paintLogoRow(pixelRow, i, pixels.length, accents)
      : blankLeft
    const right = infoLines[i - top] ?? ""
    lines.push(right ? `${left}${GAP}${right}` : left)
  }
  return lines
}
