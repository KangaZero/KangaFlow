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
  locale: string // "en" | "ja"
  colors: number // e.g. 256
}

// --- ANSI helpers ----------------------------------------------------------

const RESET = "\x1b[0m"

type Rgb = readonly [number, number, number]

// Truecolor foreground/background. xterm.js renders 24-bit SGR directly.
const fg = ([r, g, b]: Rgb): string => `\x1b[38;2;${r};${g};${b}m`
const bg256 = (index: number): string => `\x1b[48;5;${index}m`

// Catppuccin Mocha accents used for labels and the logo gradient.
const MAUVE: Rgb = [203, 166, 247] // #cba6f7
const TEAL: Rgb = [148, 226, 213] // #94e2d5
const PINK: Rgb = [245, 194, 231] // #f5c2e7
const BLUE: Rgb = [137, 180, 250] // #89b4fa
const TEXT: Rgb = [205, 214, 244] // #cdd6f4

// Linearly interpolate between two colours; `t` runs 0 → 1.
const lerp = (from: Rgb, to: Rgb, t: number): Rgb => [
  Math.round(from[0] + (to[0] - from[0]) * t),
  Math.round(from[1] + (to[1] - from[1]) * t),
  Math.round(from[2] + (to[2] - from[2]) * t),
]

// --- Left column: original "KangaFlow" ASCII mark --------------------------

// A stylised block-glyph "K" with a kangaroo-tail flourish. Original art —
// each line is plain text; colour is layered on afterwards so widths stay
// countable for column alignment.
const LOGO_ART: readonly string[] = [
  "    ▄█▀▀",
  "   ▟█▘    ▟▙",
  "  ▟█▛    ▟█▛",
  " ▟█▛    ▟█▛",
  "▟█▛    ▟█▛",
  "██▙   ▟█▛",
  "██▜█▄▄█▛",
  "██  ▜██▖",
  "██   ▜██▖",
  "██    ▜██▖",
  "██     ▜██▖",
  "██      ▜██▖",
  "▀▀       ▀▀▀",
]

// Widest plain art line — the column width every left cell is padded to.
const LOGO_WIDTH = LOGO_ART.reduce(
  (max, line) => Math.max(max, [...line].length),
  0
)

const GAP = "   " // spacer between the logo column and the info column

// Colour one art line with a teal → pink vertical gradient, padded to width.
const paintLogoLine = (line: string, row: number, rows: number): string => {
  const t = rows > 1 ? row / (rows - 1) : 0
  const padded = line.padEnd(LOGO_WIDTH, " ")
  return `${fg(lerp(TEAL, PINK, t))}${padded}${RESET}`
}

// --- Right column: fastfetch-style info rows -------------------------------

type InfoRow = { label: string; value: string }

// Render one "Label: value" row, label accented, value in default text.
const paintInfoRow = ({ label, value }: InfoRow): string =>
  `${fg(MAUVE)}${label}:${RESET} ${fg(TEXT)}${value}${RESET}`

// --- Bottom: fastfetch-style colour palette --------------------------------

// Two rows of coloured blocks drawn with ANSI 256 background colours. The
// block count per row scales loosely with the reported colour depth.
const paletteRows = (colors: number): string[] => {
  const perRow = Math.min(8, Math.max(1, Math.round(colors / 32)))
  const block = "   " // three cells reads as a solid square in most fonts
  const makeRow = (base: number): string => {
    let out = ""
    for (let i = 0; i < perRow; i++) {
      out += `${bg256(base + i)}${block}`
    }
    return `${out}${RESET}`
  }
  return [makeRow(0), makeRow(8)]
}

// --- Public renderer -------------------------------------------------------

// Join the coloured logo column and the info column line by line, then append
// a blank spacer and the colour palette. Returns strings xterm.js writes as-is.
export function renderFastfetch(info: FastfetchInfo): string[] {
  const user = "user"
  const host = "kangaflow"
  const title = `${fg(TEAL)}${user}${RESET}${fg(TEXT)}@${RESET}${fg(BLUE)}${host}${RESET}`
  const separator = `${fg(PINK)}${"-".repeat(user.length + 1 + host.length)}${RESET}`

  const rows: InfoRow[] = [
    { label: "OS", value: "KangaFlow (Next.js 16)" },
    { label: "Host", value: "kangazero.github.io" },
    { label: "Kernel", value: info.browser },
    { label: "Shell", value: "kanga-zsh" },
    { label: "Terminal", value: "xterm.js" },
    { label: "Theme", value: info.themeLabel },
    { label: "Resolution", value: info.resolution },
    { label: "Locale", value: info.locale },
    { label: "Uptime", value: info.uptime },
    { label: "Editor", value: "nvim" },
  ]

  const infoLines: string[] = [title, separator, ...rows.map(paintInfoRow)]

  const rowCount = Math.max(LOGO_ART.length, infoLines.length)
  const lines: string[] = []
  const blankLeft = " ".repeat(LOGO_WIDTH)

  for (let i = 0; i < rowCount; i++) {
    const artLine = LOGO_ART[i]
    const left =
      artLine === undefined
        ? blankLeft
        : paintLogoLine(artLine, i, LOGO_ART.length)
    const right = infoLines[i] ?? ""
    lines.push(`${left}${GAP}${right}`)
  }

  lines.push("")
  lines.push(...paletteRows(info.colors))

  return lines
}
