// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// oh-my-posh style prompt for the web terminal, as a 24-bit-ANSI string. Pure
// (no DOM) + unit-tested; `detectOs` is the one browser-reading helper
// (SSR-guarded). Nerd icons render via the subsetted Symbols Nerd Font loaded
// in terminal-body.
//
// Layout (2 lines):
//   [os user][zsh][path][git repo · main]        [exit][cpu][ram][exec][clock]
//   » <input>
// Segments are SQUARE and CHAINED: each is a background-coloured run of
// space-padded text, and adjacent segments simply change colour — no separator
// glyph. Spaces are one cell wide in every font, unlike the box/block/powerline
// glyphs the latin font subset lacks (they rendered at ~70% cell width on the
// DOM renderer). When the terminal is too narrow, the least important segments
// drop first (DROP_ORDER).

import type { TerminalPalette } from "@/lib/terminal/theme"

type Rgb = readonly [number, number, number]

const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const NOT_BOLD = "\x1b[22m"
const fg = ([r, g, b]: Rgb): string => `\x1b[38;2;${r};${g};${b}m`
const bg = ([r, g, b]: Rgb): string => `\x1b[48;2;${r};${g};${b}m`

/** "#rrggbb" → [r, g, b]. Palettes are hex constants (lib/terminal/theme). */
export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.replace("#", ""), 16)
  return [(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]
}

// Nerd Font glyphs (subset shipped in assets/fonts/symbols-nerd.woff2). Each is
// one terminal cell but its glyph is ~1.7 cells wide, so it is always followed
// by two spaces (the overflow lands on the first).
const CPU = ""
const GIT = ""
const SHELL = ""
const CLOCK = ""
const FOLDER = ""

export type OsId = "macos" | "windows" | "linux" | "android" | "ios" | "nixos"

// All present in the symbols-nerd.woff2 subset (prompt.test.ts asserts it).
const OS_ICON: Record<OsId, string> = {
  android: "",
  ios: "",
  linux: "",
  macos: "",
  nixos: "",
  windows: "",
}

// The static git segment the user asked for (repo name, not live git).
const REPO_OWNER = "KangaZero"
const REPO_NAME = "KangaFlow"
const BRANCH = "main"
const USER = "KangaZero"

// "3:04:05 PM" and "Monday" — the theme's time_format, split so the weekday can
// be dropped on narrow terminals.
function clockParts(now: Date): { time: string; weekday: string } {
  return {
    time: now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }),
    weekday: now.toLocaleDateString("en-US", { weekday: "long" }),
  }
}

/** Last command's duration: "12ms", "1.4s", "2m 5s". */
export function formatDuration(ms: number): string {
  const safe = Math.max(0, Math.round(ms))
  if (safe < 1000) return `${safe}ms`
  if (safe < 60_000) return `${(safe / 1000).toFixed(1)}s`
  return `${Math.floor(safe / 60_000)}m ${Math.round((safe % 60_000) / 1000)}s`
}

export type PromptCtx = {
  cwd: string // display path (e.g. "~/timeline")
  os: OsId
  cores: number
  ramGB: number
  now: Date
  palette: TerminalPalette
  exitCode?: number
  execMs?: number
  cols?: number // terminal width; drives right-alignment + the drop order
}

type PaletteColour = Exclude<keyof TerminalPalette, "scrim">

/** One square segment: its text (already space-padded) and colours. */
export type PromptSegment = {
  id: SegmentId
  text: string
  bg: PaletteColour
  fg: PaletteColour
}

export type SegmentId =
  | "user"
  | "shell"
  | "path"
  | "git"
  | "exit"
  | "cpu"
  | "ram"
  | "exec"
  | "clock"

// What can be trimmed, least important first. Each step either removes a
// segment or shortens one; user + path always stay.
export const DROP_ORDER = [
  "weekday",
  "shell",
  "repo owner",
  "ram",
  "cpu",
  "clock seconds",
  "exec time",
  "clock",
  "git",
  "right group",
] as const
export type DropStep = (typeof DROP_ORDER)[number]

type Visible = {
  weekday: boolean
  shell: boolean
  repoOwner: boolean
  ram: boolean
  cpu: boolean
  seconds: boolean
  exec: boolean
  clock: boolean
  git: boolean
  right: boolean
}

const ALL_VISIBLE: Visible = {
  clock: true,
  cpu: true,
  exec: true,
  git: true,
  ram: true,
  repoOwner: true,
  right: true,
  seconds: true,
  shell: true,
  weekday: true,
}

function applyDrop(v: Visible, step: DropStep): Visible {
  switch (step) {
    case "weekday":
      return { ...v, weekday: false }
    case "shell":
      return { ...v, shell: false }
    case "repo owner":
      return { ...v, repoOwner: false }
    case "ram":
      return { ...v, ram: false }
    case "cpu":
      return { ...v, cpu: false }
    case "clock seconds":
      return { ...v, seconds: false }
    case "exec time":
      return { ...v, exec: false }
    case "clock":
      return { ...v, clock: false }
    case "git":
      return { ...v, git: false }
    case "right group":
      return { ...v, right: false }
  }
}

function segmentsFor(
  ctx: PromptCtx,
  v: Visible
): { left: PromptSegment[]; right: PromptSegment[] } {
  const { time, weekday } = clockParts(ctx.now)
  const shortTime = v.seconds ? time : time.replace(/:\d\d(?= )/, "")
  const clock = v.weekday ? `${shortTime} | ${weekday}` : shortTime
  const repo = v.repoOwner ? `${REPO_OWNER}/${REPO_NAME}` : REPO_NAME
  const exit = ctx.exitCode ?? 0

  const left: PromptSegment[] = [
    {
      bg: "mauve",
      fg: "base",
      id: "user",
      text: `${OS_ICON[ctx.os]}  ${USER} `,
    },
  ]
  if (v.shell) {
    left.push({ bg: "pink", fg: "base", id: "shell", text: ` ${SHELL}  zsh ` })
  }
  left.push({
    bg: "lavender",
    fg: "base",
    id: "path",
    text: ` ${FOLDER}  ${ctx.cwd} `,
  })
  if (v.git) {
    left.push({
      bg: "surface",
      fg: "text",
      id: "git",
      text: ` ${GIT}  ${repo} ${BOLD}· ${BRANCH}${NOT_BOLD}`,
    })
  }

  const right: PromptSegment[] = []
  if (v.right) {
    if (exit > 0) {
      right.push({ bg: "red", fg: "base", id: "exit", text: ` x ${exit} ` })
    }
    if (v.cpu) {
      right.push({
        bg: "teal",
        fg: "base",
        id: "cpu",
        text: ` ${CPU}  CPU ${ctx.cores} `,
      })
    }
    if (v.ram) {
      right.push({
        bg: "green",
        fg: "base",
        id: "ram",
        text: ` RAM ${ctx.ramGB}GB `,
      })
    }
    if (v.exec) {
      right.push({
        bg: "yellow",
        fg: "base",
        id: "exec",
        text: ` ${formatDuration(ctx.execMs ?? 0)} `,
      })
    }
    if (v.clock) {
      right.push({
        bg: "blue",
        fg: "base",
        id: "clock",
        text: ` ${CLOCK}  ${clock}`,
      })
    }
  }
  return { left, right }
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching the ANSI ESC (\x1b) is the intent.
const ANSI_RE = /\x1b\[[0-9;]*m/g
/** Terminal cells a string occupies (ANSI stripped; one cell per code point). */
export function visibleLen(s: string): number {
  return [...s.replace(ANSI_RE, "")].length
}

/**
 * Render a chained group: a one-space pad in the first segment's colour, the
 * segments back to back (the colour change is the boundary), a one-space pad
 * in the last segment's colour.
 */
function renderGroup(
  segments: readonly PromptSegment[],
  p: TerminalPalette
): string {
  const first = segments[0]
  const last = segments.at(-1)
  if (!first || !last) return ""
  let out = `${bg(hexToRgb(p[first.bg]))} `
  for (const s of segments) {
    out += bg(hexToRgb(p[s.bg])) + fg(hexToRgb(p[s.fg])) + s.text
  }
  return `${out}${bg(hexToRgb(p[last.bg]))} ${RESET}`
}

const groupWidth = (segments: readonly PromptSegment[]): number =>
  segments.length === 0
    ? 0
    : 2 + segments.reduce((n, s) => n + visibleLen(s.text), 0)

/**
 * Choose the segments for line 1 so it fits `cols`, dropping the least
 * important first. Pure, so the drop order is unit-testable.
 */
export function fitPromptLine(ctx: PromptCtx): {
  left: PromptSegment[]
  right: PromptSegment[]
  dropped: DropStep[]
} {
  const cols = ctx.cols ?? Number.POSITIVE_INFINITY
  let visible = ALL_VISIBLE
  let segments = segmentsFor(ctx, visible)
  const dropped: DropStep[] = []
  for (const step of DROP_ORDER) {
    const gap = segments.right.length ? 1 : 0
    if (groupWidth(segments.left) + gap + groupWidth(segments.right) <= cols)
      break
    visible = applyDrop(visible, step)
    dropped.push(step)
    segments = segmentsFor(ctx, visible)
  }
  return { ...segments, dropped }
}

/** Lines in the full prompt block (the last one is the input line). */
export const PROMPT_LINES = 2

// Build the full prompt. `block` is printed once per new prompt; `inputPrefix`
// is the last line ("» ") reused for in-place line-editing reprints (\r +
// prefix), so the decorative line above isn't redrawn.
export function buildPrompt(ctx: PromptCtx): {
  block: string
  inputPrefix: string
} {
  const p = ctx.palette
  const { left, right } = fitPromptLine(ctx)
  const leftText = renderGroup(left, p)
  const rightText = renderGroup(right, p)
  const pad = ctx.cols
    ? Math.max(1, ctx.cols - groupWidth(left) - groupWidth(right))
    : 3
  const line1 = right.length
    ? `${leftText}${" ".repeat(pad)}${rightText}`
    : leftText

  const arrow = (ctx.exitCode ?? 0) > 0 ? p.red : p.mauve
  const inputPrefix = `${BOLD}${fg(hexToRgb(arrow))}»${RESET} `

  return { block: `${line1}\r\n${inputPrefix}`, inputPrefix }
}

// oh-my-posh "transient_prompt": once a command is submitted, its full block
// collapses to this compact single line (path + arrow), so the scrollback isn't
// dominated by repeated prompt blocks — only the *active* prompt stays full.
export function buildTransientPrompt(ctx: {
  cwd: string
  palette: TerminalPalette
  exitCode?: number
}): string {
  const p = ctx.palette
  const arrow = (ctx.exitCode ?? 0) > 0 ? p.red : p.mauve
  return `${fg(hexToRgb(p.lavender))}${ctx.cwd}${RESET} ${BOLD}${fg(hexToRgb(arrow))}»${RESET} `
}

//TODO Make this more robust and more options like freeBSD, plan9?? etc
// Detect the visitor's OS from the User-Agent (Client Hints when available).
export function detectOs(): OsId {
  if (typeof navigator === "undefined") return "nixos"
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string }
  }
  const p = (nav.userAgentData?.platform ?? navigator.userAgent).toLowerCase()
  if (p.includes("android")) return "android"
  if (/iphone|ipad|ipod|ios/.test(p)) return "ios"
  if (p.includes("mac")) return "macos"
  if (p.includes("win")) return "windows"
  return "linux"
}
