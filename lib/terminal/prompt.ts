// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Recreation of the user's oh-my-posh Dracula-purple powerline prompt as a
// 24-bit-ANSI string for the web terminal. Pure (no DOM) + unit-tested; the
// nerd glyphs render via the subsetted Symbols Nerd Font loaded in
// terminal-body. `detectOs` is the one browser-reading helper (SSR-guarded).

type Rgb = readonly [number, number, number]

const PURPLE: Rgb = [189, 147, 249] // #bd93f9
const BORDER: Rgb = [139, 92, 246] // #8b5cf6
const RED: Rgb = [239, 83, 80] // #ef5350
const BLACK: Rgb = [0, 0, 0]

const RESET = "\x1b[0m"
const fg = ([r, g, b]: Rgb): string => `\x1b[38;2;${r};${g};${b}m`
const bg = ([r, g, b]: Rgb): string => `\x1b[48;2;${r};${g};${b}m`

// Nerd Font glyphs (subset shipped in assets/fonts/symbols-nerd.woff2).
const CPU_MEM = " "
const GIT = " "
const SHELL = "  "
const CLOCK = " "
const PATH_ICON = " "

export type OsId = "macos" | "windows" | "linux" | "android" | "ios" | "nixos"

const OS_ICON: Record<OsId, string> = {
  android: " ",
  ios: " ",
  linux: " ",
  macos: " ",
  nixos: " ",
  windows: " ",
}

// The static git segment the user asked for (repo name, not live git).
const REPO = "KangaZero/KangaFlow"

type Cell = { text: string; fg: Rgb; bg: Rgb }

// A left-aligned block chain: each segment is a background-coloured run of
// space-padded text, so the colour change between adjacent segments *is* the
// seam — no separator glyph. Spaces are always one cell wide in any font,
// unlike the box/block glyphs the latin font subset drops (which rendered at
// ~70% on the DOM renderer). The last segment resets onto the transparent bg.
function powerlineLeft(cells: readonly Cell[]): string {
  let out = ""
  for (const c of cells) {
    out += bg(c.bg) + fg(c.fg) + c.text
  }
  return out + RESET
}

// biome-ignore lint/suspicious/noControlCharactersInRegex: matching the ANSI ESC (\x1b) is the intent.
const ANSI_RE = /\x1b\[[0-9;]*m/g
function visibleLen(s: string): number {
  return [...s.replace(ANSI_RE, "")].length
}

// "3:04:05 PM | Monday" — matches the theme's time_format.
function formatClock(now: Date): string {
  const time = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  })
  const day = now.toLocaleDateString("en-US", { weekday: "long" })
  return `${time} | ${day}`
}

export type PromptCtx = {
  cwd: string // display path (e.g. "~/timeline")
  os: OsId
  cores: number
  ramGB: number
  now: Date
  exitCode?: number
  cols?: number // terminal width; right-aligns the git block when known
}

// Build the full multi-line prompt. `block` is printed once per new prompt;
// `inputPrefix` is the last line ("» ") reused for in-place line-editing
// reprints (\r + prefix), so the decorative lines above aren't redrawn.
export function buildPrompt(ctx: PromptCtx): {
  block: string
  inputPrefix: string
} {
  // Line 1 left: OS + CPU cores + approx RAM, then a border-purple exec cell.
  const line1Left = powerlineLeft([
    {
      bg: PURPLE,
      fg: BLACK,
      text: ` ${OS_ICON[ctx.os]}  ${CPU_MEM} CPU: ${ctx.cores} | RAM: ${ctx.ramGB}GB `,
    },
    { bg: BORDER, fg: BLACK, text: " 0ms " },
  ])

  // Line 1 right: static repo git segment as a right-aligned colour block.
  const git = `${bg(PURPLE)}${fg(BLACK)} ${GIT} ${REPO}  main ${RESET}`

  const pad = ctx.cols
    ? Math.max(1, ctx.cols - visibleLen(line1Left) - visibleLen(git))
    : 3
  const line1 = `${line1Left}${" ".repeat(pad)}${git}`

  // Line 2: colour-block chain — user · shell · time · path.
  const line2 = powerlineLeft([
    { bg: PURPLE, fg: BLACK, text: " KangaZero " },
    { bg: BORDER, fg: BLACK, text: ` ${SHELL} zsh ` },
    { bg: PURPLE, fg: BLACK, text: ` ${CLOCK} ${formatClock(ctx.now)} ` },
    { bg: BORDER, fg: BLACK, text: ` ${PATH_ICON} ${ctx.cwd} ` },
  ])

  // Line 3: the input line — » turns red on a non-zero exit.
  const arrow = (ctx.exitCode ?? 0) > 0 ? RED : PURPLE
  const inputPrefix = `${fg(arrow)}»${RESET} `

  return { block: `${line1}\r\n${line2}\r\n${inputPrefix}`, inputPrefix }
}

// oh-my-posh "transient_prompt": once a command is submitted, its full
// multi-line block collapses to this compact single line (path + arrow), so the
// scrollback isn't dominated by repeated 3-line prompts — only the *active*
// prompt keeps the full block. Pure string; terminal-body drives the redraw.
export function buildTransientPrompt(ctx: {
  cwd: string
  exitCode?: number
}): string {
  const arrow = (ctx.exitCode ?? 0) > 0 ? RED : PURPLE
  return `${fg(PURPLE)}${ctx.cwd}${RESET} ${fg(arrow)}»${RESET} `
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
