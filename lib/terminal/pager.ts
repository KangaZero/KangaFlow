// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// A pure, read-only "vim pager" state machine for an in-browser xterm.js
// terminal. It models a minimal read-only Neovim viewing a static buffer of
// lines: motions, half/full-page scrolling, forward search, and a command line
// that can only quit. Deliberately free of React, xterm, and Node APIs so the
// logic is trivially unit-testable and reusable — the terminal component just
// pipes `onData` chunks into `handleKey` and paints `renderPager` output.

export type PagerMode = "normal" | "command" | "search"

export type PagerState = {
  topLine: number // first visible buffer line (0-based)
  cursorLine: number // 0-based
  cursorCol: number // 0-based
  mode: PagerMode
  input: string // text typed after ':' or '/' (also holds a pending g/Z prefix)
  lastSearch: string
  message: string // statusline right-side message
}

type PagerResult = { state: PagerState; quit: boolean }

// Control bytes xterm emits for the keys we react to.
const ESC = "\x1b"
const ENTER_CR = "\r"
const ENTER_LF = "\n"
const BACKSPACE_DEL = "\x7f"
const BACKSPACE_BS = "\b"
const CTRL_D = "\x04"
const CTRL_U = "\x15"
const CTRL_F = "\x06"
const CTRL_B = "\x02"

// Minimal, theme-neutral ANSI. Dim gutter, dim-blue EOF tildes, reverse status.
const ANSI_RESET = "\x1b[0m"
const ANSI_DIM = "\x1b[2m"
const ANSI_DIM_BLUE = "\x1b[2;34m"
const ANSI_REVERSE = "\x1b[7m"

export function initPager(): PagerState {
  return {
    cursorCol: 0,
    cursorLine: 0,
    input: "",
    lastSearch: "",
    message: "",
    mode: "normal",
    topLine: 0,
  }
}

function clamp(value: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, value))
}

function lineText(lines: readonly string[], index: number): string {
  return lines[index] ?? ""
}

// Re-clamp the cursor into the buffer, the column into the current line, and
// scroll `topLine` just enough to keep the cursor visible. The single choke
// point every mutation flows through so nothing can drift out of range.
function normalizeView(
  state: PagerState,
  lines: readonly string[],
  viewportRows: number
): PagerState {
  const count = lines.length
  const maxLine = Math.max(0, count - 1)
  const rows = Math.max(1, viewportRows)

  const cursorLine = clamp(state.cursorLine, 0, maxLine)
  const maxCol = Math.max(0, lineText(lines, cursorLine).length - 1)
  const cursorCol = clamp(state.cursorCol, 0, maxCol)

  let topLine = clamp(state.topLine, 0, maxLine)
  if (cursorLine < topLine) topLine = cursorLine
  if (cursorLine > topLine + rows - 1) topLine = cursorLine - rows + 1
  topLine = clamp(topLine, 0, maxLine)

  return { ...state, cursorCol, cursorLine, topLine }
}

// Apply a patch, drop any transient message, and re-normalize the view.
function motion(
  state: PagerState,
  patch: Partial<PagerState>,
  lines: readonly string[],
  viewportRows: number
): PagerState {
  return normalizeView({ ...state, message: "", ...patch }, lines, viewportRows)
}

// Forward substring scan from `start`, wrapping once through the whole buffer.
function findForward(
  lines: readonly string[],
  start: number,
  needle: string
): { line: number; col: number } | null {
  const count = lines.length
  if (count === 0 || needle === "") return null
  for (let i = 0; i < count; i++) {
    const index = (((start + i) % count) + count) % count
    const col = lineText(lines, index).indexOf(needle)
    if (col !== -1) return { col, line: index }
  }
  return null
}

// Backward counterpart used by `N`.
function findBackward(
  lines: readonly string[],
  start: number,
  needle: string
): { line: number; col: number } | null {
  const count = lines.length
  if (count === 0 || needle === "") return null
  for (let i = 0; i < count; i++) {
    const index = (((start - i) % count) + count) % count
    const col = lineText(lines, index).indexOf(needle)
    if (col !== -1) return { col, line: index }
  }
  return null
}

function isPrintable(key: string): boolean {
  return key.length === 1 && key >= " " && key !== BACKSPACE_DEL
}

function handleCommand(state: PagerState, key: string): PagerResult {
  const back: PagerState = { ...state, input: "", mode: "normal" }
  if (key === ESC) return { quit: false, state: back }

  if (key === ENTER_CR || key === ENTER_LF) {
    const cmd = state.input.trim()
    if (cmd === "") return { quit: false, state: back }
    if (cmd === "q" || cmd === "q!" || cmd === "wq" || cmd === "x") {
      return { quit: true, state: back }
    }
    return {
      quit: false,
      state: { ...back, message: "E492: Not an editor command" },
    }
  }

  if (key === BACKSPACE_DEL || key === BACKSPACE_BS) {
    return { quit: false, state: { ...state, input: state.input.slice(0, -1) } }
  }
  if (isPrintable(key)) {
    return { quit: false, state: { ...state, input: `${state.input}${key}` } }
  }
  return { quit: false, state }
}

function handleSearch(
  state: PagerState,
  key: string,
  lines: readonly string[],
  viewportRows: number
): PagerResult {
  if (key === ESC) {
    return { quit: false, state: { ...state, input: "", mode: "normal" } }
  }

  if (key === ENTER_CR || key === ENTER_LF) {
    const needle = state.input
    const back: PagerState = { ...state, input: "", mode: "normal" }
    if (needle === "") return { quit: false, state: back }

    const hit = findForward(lines, state.cursorLine + 1, needle)
    if (hit === null) {
      return {
        quit: false,
        state: {
          ...back,
          lastSearch: needle,
          message: `E486: Pattern not found: ${needle}`,
        },
      }
    }
    const moved = normalizeView(
      {
        ...back,
        cursorCol: hit.col,
        cursorLine: hit.line,
        lastSearch: needle,
        message: `/${needle}`,
      },
      lines,
      viewportRows
    )
    return { quit: false, state: moved }
  }

  if (key === BACKSPACE_DEL || key === BACKSPACE_BS) {
    return { quit: false, state: { ...state, input: state.input.slice(0, -1) } }
  }
  if (isPrintable(key)) {
    return { quit: false, state: { ...state, input: `${state.input}${key}` } }
  }
  return { quit: false, state }
}

// Repeat the last search in a direction; `n` forward, `N` backward.
function repeatSearch(
  state: PagerState,
  forward: boolean,
  lines: readonly string[],
  viewportRows: number
): PagerResult {
  if (state.lastSearch === "") {
    return {
      quit: false,
      state: { ...state, message: "E35: No previous regular expression" },
    }
  }
  const hit = forward
    ? findForward(lines, state.cursorLine + 1, state.lastSearch)
    : findBackward(lines, state.cursorLine - 1, state.lastSearch)
  if (hit === null) {
    return {
      quit: false,
      state: {
        ...state,
        message: `E486: Pattern not found: ${state.lastSearch}`,
      },
    }
  }
  return {
    quit: false,
    state: motion(
      state,
      { cursorCol: hit.col, cursorLine: hit.line },
      lines,
      viewportRows
    ),
  }
}

function handleNormal(
  state: PagerState,
  key: string,
  lines: readonly string[],
  viewportRows: number
): PagerResult {
  // `state.input` doubles as a one-key pending prefix (`g` or `Z`) in normal
  // mode, so two-key sequences work without widening the state contract.
  const pending = state.input
  if (pending === "g") {
    const cleared: PagerState = { ...state, input: "" }
    if (key === "g") {
      return {
        quit: false,
        state: motion(cleared, { cursorLine: 0 }, lines, viewportRows),
      }
    }
    return handleNormal(cleared, key, lines, viewportRows)
  }
  if (pending === "Z") {
    const cleared: PagerState = { ...state, input: "" }
    if (key === "Z") return { quit: true, state: cleared }
    return handleNormal(cleared, key, lines, viewportRows)
  }

  const maxLine = Math.max(0, lines.length - 1)
  const half = Math.max(1, Math.floor(Math.max(1, viewportRows) / 2))
  const full = Math.max(1, viewportRows)

  switch (key) {
    case "g":
      return { quit: false, state: { ...state, input: "g", message: "" } }
    case "Z":
      return { quit: false, state: { ...state, input: "Z", message: "" } }
    case ":":
      return {
        quit: false,
        state: { ...state, input: "", message: "", mode: "command" },
      }
    case "/":
      return {
        quit: false,
        state: { ...state, input: "", message: "", mode: "search" },
      }
    case "j":
      return {
        quit: false,
        state: motion(
          state,
          { cursorLine: state.cursorLine + 1 },
          lines,
          viewportRows
        ),
      }
    case "k":
      return {
        quit: false,
        state: motion(
          state,
          { cursorLine: state.cursorLine - 1 },
          lines,
          viewportRows
        ),
      }
    case "h":
      return {
        quit: false,
        state: motion(
          state,
          { cursorCol: state.cursorCol - 1 },
          lines,
          viewportRows
        ),
      }
    case "l":
      return {
        quit: false,
        state: motion(
          state,
          { cursorCol: state.cursorCol + 1 },
          lines,
          viewportRows
        ),
      }
    case "0":
      return {
        quit: false,
        state: motion(state, { cursorCol: 0 }, lines, viewportRows),
      }
    case "$":
      return {
        quit: false,
        state: motion(
          state,
          { cursorCol: Number.MAX_SAFE_INTEGER },
          lines,
          viewportRows
        ),
      }
    case "G":
      return {
        quit: false,
        state: motion(state, { cursorLine: maxLine }, lines, viewportRows),
      }
    case "n":
      return repeatSearch(state, true, lines, viewportRows)
    case "N":
      return repeatSearch(state, false, lines, viewportRows)
    case CTRL_D:
      return {
        quit: false,
        state: motion(
          state,
          {
            cursorLine: state.cursorLine + half,
            topLine: state.topLine + half,
          },
          lines,
          viewportRows
        ),
      }
    case CTRL_U:
      return {
        quit: false,
        state: motion(
          state,
          {
            cursorLine: state.cursorLine - half,
            topLine: state.topLine - half,
          },
          lines,
          viewportRows
        ),
      }
    case CTRL_F:
      return {
        quit: false,
        state: motion(
          state,
          {
            cursorLine: state.cursorLine + full,
            topLine: state.topLine + full,
          },
          lines,
          viewportRows
        ),
      }
    case CTRL_B:
      return {
        quit: false,
        state: motion(
          state,
          {
            cursorLine: state.cursorLine - full,
            topLine: state.topLine - full,
          },
          lines,
          viewportRows
        ),
      }
    default:
      return { quit: false, state }
  }
}

export function handleKey(
  state: PagerState,
  key: string,
  lines: readonly string[],
  viewportRows: number
): PagerResult {
  switch (state.mode) {
    case "command":
      return handleCommand(state, key)
    case "search":
      return handleSearch(state, key, lines, viewportRows)
    default:
      return handleNormal(state, key, lines, viewportRows)
  }
}

// Roughly emulate vim's ruler percentage (Top/Bot/All/NN%).
function scrollPercent(
  state: PagerState,
  lines: readonly string[],
  textRows: number
): string {
  const count = lines.length
  if (count === 0 || count <= textRows) return "All"
  if (state.topLine <= 0) return "Top"
  if (state.topLine + textRows >= count) return "Bot"
  return `${Math.floor((state.topLine / Math.max(1, count - textRows)) * 100)}%`
}

export function renderPager(
  state: PagerState,
  lines: readonly string[],
  opts: { fileName: string; cols: number; rows: number }
): string[] {
  const { cols, fileName, rows } = opts
  if (rows <= 0) return []

  const textRows = rows - 1
  const gutterDigits = Math.max(3, String(Math.max(1, lines.length)).length)
  const textWidth = Math.max(0, cols - gutterDigits - 1)

  const out: string[] = []
  for (let r = 0; r < textRows; r++) {
    const bufIndex = state.topLine + r
    if (bufIndex < lines.length) {
      const num = String(bufIndex + 1).padStart(gutterDigits)
      const text = lineText(lines, bufIndex).slice(0, textWidth)
      out.push(`${ANSI_DIM}${num} ${ANSI_RESET}${text}`)
    } else {
      out.push(`${ANSI_DIM_BLUE}~${ANSI_RESET}`)
    }
  }

  const cmdArea =
    state.mode === "command"
      ? `:${state.input}`
      : state.mode === "search"
        ? `/${state.input}`
        : state.message
  const left = `${fileName} [${state.mode.toUpperCase()}]${
    cmdArea === "" ? "" : `  ${cmdArea}`
  }`
  const pct = scrollPercent(state, lines, textRows)
  const right = `${state.cursorLine + 1},${state.cursorCol + 1}   ${pct}`

  const gap = Math.max(1, cols - left.length - right.length)
  const status = `${left}${" ".repeat(gap)}${right}`.padEnd(cols).slice(0, cols)
  out.push(`${ANSI_REVERSE}${status}${ANSI_RESET}`)

  return out
}
