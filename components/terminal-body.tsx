"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// ─── KNOWN ISSUES / TODO ────────────────────────────────────────────────────
// The in-browser terminal works but is rough. Outstanding bugs to fix:
//
// 1. Completion over-triggers. Tab/→ can still act when the argument is already
//    complete. `acceptSuggestion()` trusts `s.suggestion`, which can be stale
//    (not every code path calls `renderLine()` to refresh it), and Tab on an
//    already-filled `cmd <file> ` re-lists every file because the empty trailing
//    word matches all candidates. Recompute before accepting and treat an exact
//    match as "nothing to do".
// 2. Esc in the editor exits the whole dialog instead of returning to NORMAL
//    mode — Radix Dialog's onEscapeKeyDown closes it before CodeMirror sees Esc.
//    Fix in code-editor.tsx / terminal-dialog.tsx: preventDefault + stop
//    propagation on Esc while the editor overlay is open so vim handles it.
// 3. Ghost/menu redraw glitches: opening or cycling the completion menu doesn't
//    always clear a previously drawn ghost, so stale dim text can linger.
// 4. `clear` leaves the fresh prompt on row 2 (2J+H then prints \r\n+prompt);
//    it should home the cursor and print the prompt at the top.
// 5. No in-line cursor editing: ← / Home / End / mid-line insert are unhandled
//    (append-only), and → is overloaded solely to accept the ghost.
// 6. Editor is ephemeral: `:w` is a silent no-op and edits are discarded on
//    close (by design) — should signal this or disable write.
// 7. Multi-line paste is appended as a single line (newlines aren't split into
//    separate command runs).
// ─────────────────────────────────────────────────────────────────────────────

import { FitAddon } from "@xterm/addon-fit"
import type {
  ITerminalAddon,
  ITerminalInitOnlyOptions,
  ITerminalOptions,
} from "@xterm/xterm"
import localFont from "next/font/local"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useRef, useState } from "react"
import { useXTerm } from "react-xtermjs"
import { CodeEditor } from "@/components/code-editor"
import {
  createColumns,
  frameDelayMs,
  isMatrixTheme,
  MATRIX_SCHEMES,
  type MatrixOptions,
  parseMatrixArgs,
  renderFrame,
  stepColumn,
} from "@/lib/terminal/cmatrix"
import { completeLine, suggestLine } from "@/lib/terminal/complete"
import { type FastfetchInfo, renderFastfetch } from "@/lib/terminal/fastfetch"
import {
  buildPageFiles,
  flatFileForSource,
  hrefForPage,
  pageByName,
  pageForRoute,
  TERMINAL_PAGE_NAMES,
} from "@/lib/terminal/pages"
import {
  buildPrompt,
  buildTransientPrompt,
  detectOs,
} from "@/lib/terminal/prompt"
import {
  paletteForTheme,
  TERMINAL_FONT_FAMILY,
  type TerminalPalette,
  xtermTheme,
} from "@/lib/terminal/theme"
import {
  buildVfs,
  cwdForRoute,
  displayCwd,
  listDir,
  resolvePath,
} from "@/lib/terminal/vfs"
import { isTheme, THEMES } from "@/lib/themes"
import { useLocale } from "@/providers/locale-provider"

// Subset Symbols Nerd Font supplying the oh-my-posh prompt icons (OS / git /
// shell / clock / path — 12 PUA codepoints, ~2.1KB). JetBrains Mono renders the
// text; xterm's `customGlyphs` draws the powerline separators; this fills only
// the true Private-Use-Area icon glyphs.
const nerdSymbols = localFont({
  display: "swap",
  src: "../assets/fonts/symbols-nerd.woff2",
  style: "normal",
  weight: "400",
})

// Mutable per-session shell state, kept in a ref so the xterm data handler
// (bound once to the instance) always sees the latest without re-subscribing.
type Session = {
  line: string
  history: string[]
  histIndex: number
  // Last command's exit code (drives the ❯ colour) + the current prompt's last
  // line, reused for in-place line-editing reprints (the decorative lines above
  // are printed once per prompt, not on every keystroke).
  exitCode: number
  promptPrefix: string
  // Active zsh-style completion menu (null when not cycling candidates).
  menu: { base: string; candidates: string[]; index: number } | null
  // Current ghost-text suggestion (full predicted line), or null.
  suggestion: string | null
  // True while the nvim editor overlay has control (xterm ignores input).
  editorOpen: boolean
  // True while the cmatrix screensaver is running (the next keystroke stops it).
  matrixRunning: boolean
  // Current working directory (absolute VFS path) for cd/pwd/ls/cat/nvim.
  cwd: string
  // Name of the page the app is currently on (drives cd's "already at" guard);
  // tracked here because navigation changes the route but not this once-bound
  // handler's closed-over props.
  currentPage: string
}

type BarState = { mode: string; tab: string }

function shortBrowser(ua: string): string {
  if (ua.includes("Firefox")) return "Firefox"
  if (ua.includes("Edg")) return "Edge"
  if (ua.includes("Chrome")) return "Chrome"
  if (ua.includes("Safari")) return "Safari"
  return "browser"
}

function formatUptime(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return "less than a minute"
  if (mins === 1) return "1 min"
  if (mins < 60) return `${mins} mins`
  const hours = Math.floor(mins / 60)
  return `${hours}h ${mins % 60}m`
}

function baseName(path: string): string {
  return path.split("/").at(-1) ?? path
}

// zjstatus mode segment: kanji label + palette bg, mirroring the user's zellij
// config (定 normal, 索 search, 命 command).
function modeSegment(
  mode: string,
  palette: TerminalPalette
): { label: string; bg: string } {
  switch (mode) {
    case "SEARCH":
      return { bg: palette.yellow, label: "索" }
    case "COMMAND":
      return { bg: palette.blue, label: "命" }
    default:
      return { bg: palette.pink, label: "定" }
  }
}

// A DOM status bar under the xterm canvas that reproduces the user's zjstatus
// look (Catppuccin segments, kanji mode indicator, active tab, git branch).
function ZjStatusBar({
  mode,
  tab,
  palette,
}: BarState & { palette: TerminalPalette }) {
  const segment = modeSegment(mode, palette)
  return (
    <div
      className="flex items-stretch overflow-hidden font-mono text-xs"
      style={{ background: palette.base, color: palette.text }}
    >
      <span
        className="flex items-center px-2 font-bold"
        style={{ background: segment.bg, color: palette.base }}
      >
        {segment.label} {mode}
      </span>
      <span
        className="flex items-center px-2 font-bold"
        style={{ background: palette.mauve, color: palette.base }}
      >
        1 {tab}
      </span>
      <span className="flex-1" />
      <span
        className="flex items-center px-2"
        style={{ color: palette.overlay }}
      >
        kangaflow
      </span>
      <span
        className="flex items-center px-2 font-bold"
        style={{ background: palette.red, color: palette.base }}
      >
        main
      </span>
    </div>
  )
}

// `help` output: aligned command + description. ANSI 16-colour so it maps to
// the active xterm theme palette (magenta command, dim grey description).
const HELP: readonly (readonly [cmd: string, desc: string])[] = [
  ["help", "show this help"],
  ["ff", "system info (fastfetch)"],
  ["cmatrix", "digital rain (--help for options)"],
  ["ls", "list the current directory"],
  ["cd <page>", "go to a page (home, achievements, timeline, environment)"],
  ["pwd", "print the working directory"],
  ["cat <file>", "print a file"],
  ["nvim <file>", "edit a file in vim"],
  ["theme <name>", "switch theme (light | dark | terminal)"],
  ["clear", "clear the screen"],
  ["whoami", "print the current user"],
  ["exit", "close the terminal"],
]

function helpText(): string {
  const pad = HELP.reduce((n, [cmd]) => Math.max(n, cmd.length), 0)
  const rows = HELP.map(
    ([cmd, desc]) =>
      `  \x1b[1;35m${cmd.padEnd(pad)}\x1b[0m  \x1b[90m${desc}\x1b[0m`
  )
  return `\r\n\x1b[1mCommands\x1b[0m\r\n${rows.join("\r\n")}`
}

export function TerminalBody({
  files,
  initialFile,
  onClose,
  routePath = "/",
}: {
  files: Record<string, string>
  initialFile: string | null
  onClose: () => void
  // Current route pathname → the terminal starts in that page's folder.
  routePath?: string
}) {
  const { locale } = useLocale()
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  // paletteForTheme returns a shared constant → stable identity for deps.
  const palette = paletteForTheme(resolvedTheme)
  // Flat page filesystem: each routable page is a dir holding `index.tsx`
  // (see lib/terminal/pages). Real repo paths → terminal display paths here.
  const pageFiles = useMemo(() => buildPageFiles(files), [files])
  // Virtual filesystem over the flat page map (pages become folders).
  const vfs = useMemo(() => buildVfs(Object.keys(pageFiles)), [pageFiles])
  const fit = useMemo(() => new FitAddon(), [])
  // Stable references: useXTerm effect-depends on these, so fresh literals each
  // render would re-init the terminal every render → setState loop. Theme is set
  // once here and then updated live via the effect below.
  const addons: ITerminalAddon[] = useMemo(() => [fit], [fit])
  const options: ITerminalOptions & ITerminalInitOnlyOptions = useMemo(
    () => ({
      allowTransparency: true,
      cursorBlink: true,
      fontFamily: TERMINAL_FONT_FAMILY,
      fontSize: 13,
    }),
    []
  )
  const { ref, instance } = useXTerm({ addons, options })
  const [bar, setBar] = useState<BarState>({ mode: "NORMAL", tab: "zsh" })

  // Theme the live terminal from the app palette; runs on mount and on any
  // light↔dark switch (palette is a stable constant, so no needless churn).
  useEffect(() => {
    if (instance) instance.options.theme = xtermTheme(palette)
  }, [instance, palette])

  const [editor, setEditor] = useState<{ content: string } | null>(null)
  const dark = resolvedTheme !== "light"
  // Live theme for the once-bound data handler (ff reads it on each run).
  const darkRef = useRef(dark)
  darkRef.current = dark
  // Live theme *name* for cmatrix, which picks a colour scheme per theme and so
  // needs light/dark/terminal distinguished (unlike the light/dark-only palette).
  const themeRef = useRef(resolvedTheme)
  themeRef.current = resolvedTheme
  // Live locale + router for `cd`, read inside the once-bound data handler.
  const localeRef = useRef(locale)
  localeRef.current = locale
  const routerRef = useRef(router)
  routerRef.current = router

  const startedAt = useRef(Date.now())
  const session = useRef<Session>({
    currentPage: pageForRoute(routePath)?.name ?? "home",
    cwd: cwdForRoute(routePath, vfs),
    editorOpen: false,
    exitCode: 0,
    histIndex: 0,
    history: [],
    line: "",
    matrixRunning: false,
    menu: null,
    promptPrefix: "",
    suggestion: null,
  })

  // Machine facts for the prompt, read once (stable per session). The browser
  // exposes core count + approximate RAM (Chrome-only) but NOT CPU usage.
  const machine = useMemo(
    () => ({
      cores:
        typeof navigator === "undefined"
          ? 4
          : (navigator.hardwareConcurrency ?? 4),
      os: detectOs(),
      ramGB:
        typeof navigator === "undefined"
          ? 8
          : ((navigator as Navigator & { deviceMemory?: number })
              .deviceMemory ?? 8),
    }),
    []
  )

  // Build a fresh prompt block and remember its last line for line-editing
  // reprints. `cols` right-aligns the git block.
  const makePrompt = (cwd: string, exitCode: number, cols: number): string => {
    const { block, inputPrefix } = buildPrompt({
      cols,
      cores: machine.cores,
      cwd: displayCwd(cwd),
      exitCode,
      now: new Date(),
      os: machine.os,
      ramGB: machine.ramGB,
    })
    session.current.promptPrefix = inputPrefix
    return block
  }

  // Return from the nvim editor overlay to the shell prompt.
  const closeEditor = () => {
    setEditor(null)
    session.current.editorOpen = false
    setBar({ mode: "NORMAL", tab: "zsh" })
    if (instance) {
      instance.write(
        `\r\n${makePrompt(session.current.cwd, session.current.exitCode, instance.cols)}`
      )
      instance.focus()
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: one-time setup bound to the xterm instance; handlers read live values via the `session` ref, and the closed-over props are stable for a session's lifetime.
  useEffect(() => {
    if (!instance) return
    const term = instance
    const s = session.current

    const prompt = () =>
      term.write(`\r\n${makePrompt(s.cwd, s.exitCode, term.cols)}`)

    const fastfetch = () => {
      const info: FastfetchInfo = {
        browser: shortBrowser(navigator.userAgent),
        colors: 256,
        dark: darkRef.current,
        locale,
        resolution: `${window.screen.width}x${window.screen.height}`,
        themeLabel: darkRef.current ? "Catppuccin Mocha" : "Catppuccin Latte",
        uptime: formatUptime(Date.now() - startedAt.current),
      }
      for (const line of renderFastfetch(info)) term.writeln(line)
    }

    // cmatrix screensaver. The only animated command: it owns a timer that
    // paints frames until the next keystroke stops it (see onShellData). rng is
    // Math.random here; the pure engine takes it as a param so it stays testable.
    let matrixTimer: ReturnType<typeof setInterval> | null = null
    const rng = () => Math.random()

    const startMatrix = (options: MatrixOptions) => {
      s.matrixRunning = true
      // Hide the cursor and clear the screen for a clean canvas.
      term.write("\x1b[?25l\x1b[2J")
      const rows = term.rows
      const width = term.cols
      const scheme = MATRIX_SCHEMES[options.theme]
      const columns = createColumns(width, rows, rng, options.density)
      matrixTimer = setInterval(() => {
        for (const col of columns) {
          if (col) stepColumn(col, rows, rng)
        }
        term.write(renderFrame(columns, rows, width, scheme, options.bold))
      }, frameDelayMs(options.speed))
    }

    const stopMatrix = () => {
      if (matrixTimer !== null) clearInterval(matrixTimer)
      matrixTimer = null
      s.matrixRunning = false
      // Restore the cursor, wipe the rain, and drop back to a fresh prompt.
      term.write("\x1b[?25h\x1b[2J\x1b[H")
      prompt()
    }

    // Hand off to the CodeMirror (real vim) editor overlay. Returns whether it
    // opened, so the shell can decide whether to reprint the prompt.
    const openEditor = (path: string): boolean => {
      const content = pageFiles[path]
      if (content === undefined) {
        term.write(`\r\nnvim: ${path}: no such file`)
        return false
      }
      s.editorOpen = true
      setEditor({ content })
      setBar({ mode: "NORMAL", tab: `nvim ${baseName(path)}` })
      return true
    }

    const runCommand = (raw: string): boolean => {
      const [cmd, ...args] = raw.split(/\s+/)
      const arg = args.join(" ")
      s.exitCode = 0
      switch (cmd) {
        case "":
          return true
        case "h":
        case "help":
          term.write(helpText())
          return true
        case "ff":
        case "fastfetch":
        case "neofetch":
          term.write("\r\n")
          fastfetch()
          return true
        case "cmatrix":
        case "matrix": {
          const appTheme = isMatrixTheme(themeRef.current)
            ? themeRef.current
            : "terminal"
          const parsed = parseMatrixArgs(args, appTheme)
          if (parsed.kind === "help") {
            term.write(`\r\n${parsed.text}`)
            return true
          }
          if (parsed.kind === "error") {
            s.exitCode = 1
            term.write(`\r\n${parsed.message}`)
            return true
          }
          startMatrix(parsed.options)
          // The timer + stopMatrix own the screen now; don't reprint the prompt.
          return false
        }
        case "pwd":
          term.write(`\r\n${s.cwd}`)
          return true
        case "cd": {
          // cd is page navigation: resolve the arg to a routable page and drive
          // the real Next.js router. The flat tree is one level deep, so "~",
          // "/" and ".." all mean home.
          const raw = arg.trim()
          // Bare `cd` lists the navigable pages instead of navigating anywhere.
          if (raw === "") {
            const listed = TERMINAL_PAGE_NAMES.map(
              (p) => `\x1b[34m${p}\x1b[0m`
            ).join("  ")
            term.write(`\r\n${listed}`)
            return true
          }
          const name =
            raw === "~" || raw === "/" || raw === ".."
              ? "home"
              : raw.replace(/^\/+|\/+$/g, "")
          const page = pageByName(name)
          if (!page) {
            s.exitCode = 1
            term.write(`\r\ncd: no such page: ${arg}`)
            return true
          }
          if (name === s.currentPage) {
            term.write(`\r\nalready at dir: ${name}`)
            return true
          }
          s.currentPage = name
          s.cwd = page.route ? `/${page.route}` : "/"
          // Client-side route change; the terminal dialog stays open over it.
          routerRef.current.push(hrefForPage(localeRef.current, page))
          term.write(`\r\ncd → ${name}`)
          return true
        }
        case "ls": {
          const target = arg ? resolvePath(s.cwd, arg) : s.cwd
          const entries = listDir(vfs, target)
          if (!entries) {
            term.write(`\r\nls: cannot access '${arg}': not a directory`)
            return true
          }
          const rendered = entries
            .map((e) =>
              e.type === "dir" ? `\x1b[34m${e.name}/\x1b[0m` : e.name
            )
            .join("  ")
          term.write(`\r\n${rendered}`)
          return true
        }
        case "cat": {
          const key = resolvePath(s.cwd, arg).replace(/^\//, "")
          const file = pageFiles[key]
          if (file === undefined) {
            term.write(`\r\ncat: ${arg}: no such file`)
            return true
          }
          term.write(`\r\n${file.replace(/\n/g, "\r\n")}`)
          return true
        }
        case "nvim":
        case "vim": {
          if (!arg) {
            term.write("\r\nusage: nvim <file>  (try `ls`)")
            return true
          }
          const key = resolvePath(s.cwd, arg).replace(/^\//, "")
          // If the editor opened it owns the screen; otherwise reprint prompt.
          return !openEditor(key)
        }
        case "code":
          term.write(
            "\r\nsorry but vscode is not allowed only nvim/vim available! The correct option"
          )
          return true
        case "theme":
          if (isTheme(arg)) {
            setTheme(arg)
            term.write(`\r\ntheme → ${arg}`)
          } else {
            term.write(`\r\ntheme: choose one of ${THEMES.join(", ")}`)
          }
          return true
        case "clear":
          term.write("\x1b[2J\x1b[H")
          return true
        case "whoami":
          term.write("\r\nkangazero")
          return true
        case "exit":
        case "q":
          onClose()
          return false
        default:
          s.exitCode = 1
          term.write(`\r\nzsh: command not found: ${cmd}`)
          return true
      }
    }

    const replaceLine = (next: string) => {
      term.write(`\r${s.promptPrefix}\x1b[K${next}`)
      s.line = next
    }

    // Redraw the line plus its dim ghost-text suggestion, leaving the cursor
    // right after the typed text (the ghost sits ahead of it).
    const renderLine = () => {
      const suggestion = suggestLine(s.line, Object.keys(pageFiles), s.history)
      s.suggestion = suggestion
      term.write(`\r${s.promptPrefix}\x1b[K${s.line}`)
      if (suggestion && suggestion.length > s.line.length) {
        const ghost = suggestion.slice(s.line.length)
        term.write(`\x1b[2m${ghost}\x1b[0m\x1b[${ghost.length}D`)
      }
    }

    // Redraw without the ghost (before Enter/Ctrl-C so no dim tail lingers).
    const clearGhost = () => {
      s.suggestion = null
      term.write(`\r${s.promptPrefix}\x1b[K${s.line}`)
    }

    // Transient prompt (oh-my-posh transient_prompt): the input sits on the 3rd
    // line of its prompt block. On submit, jump to the block's top, clear it,
    // and redraw a compact one-line prompt echoing the command — so scrollback
    // keeps only single-line prompts and just the *active* prompt stays full.
    const collapsePrompt = (cmd: string) => {
      s.suggestion = null
      const transient = buildTransientPrompt({
        cwd: displayCwd(s.cwd),
        exitCode: s.exitCode,
      })
      term.write(`\r\x1b[2A\x1b[0J${transient}${cmd}`)
    }

    // Fill the current ghost suggestion (Tab / →). Returns whether it applied.
    const acceptSuggestion = (): boolean => {
      if (s.suggestion === null) return false
      s.line = s.suggestion
      renderLine()
      return true
    }

    // Ambiguous completion: list candidates and open a cycling menu.
    const openMenu = () => {
      const files = Object.keys(pageFiles)
      // If the line is exactly one complete command with no trailing space,
      // advance to its argument completion — so `cd`+Tab lists pages (and
      // `theme`+Tab lists themes) instead of sitting on the finished command.
      const first = completeLine(s.line, files)
      const line =
        first.wordStart === 0 &&
        first.candidates.length === 1 &&
        first.candidates[0] === first.word
          ? `${s.line} `
          : s.line
      const { wordStart, candidates } = completeLine(line, files)
      if (candidates.length <= 1) return
      const base = line.slice(0, wordStart)
      const next = base + (candidates[0] ?? "")
      s.menu = { base, candidates, index: 0 }
      s.line = next
      s.suggestion = null
      term.write(
        `\r\n${candidates.join("  ")}\r\n${makePrompt(s.cwd, s.exitCode, term.cols)}${next}`
      )
    }

    const cycleMenu = (dir: 1 | -1) => {
      const menu = s.menu
      if (!menu) return
      const len = menu.candidates.length
      menu.index = (menu.index + dir + len) % len
      replaceLine(menu.base + (menu.candidates[menu.index] ?? ""))
    }

    const onShellData = (data: string) => {
      // While the rain is running, any key stops it (and swallows that key).
      if (s.matrixRunning) {
        stopMatrix()
        return
      }
      // Tab: cycle an open menu, else accept the ghost, else open a menu.
      if (data === "\t") {
        if (s.menu) cycleMenu(1)
        else if (!acceptSuggestion()) openMenu()
        return
      }
      if (data === "\x1b[Z") {
        cycleMenu(-1)
        return
      }
      if (data === "\x1b[C") {
        // Right arrow accepts the ghost (no in-line cursor editing to conflict).
        if (!s.menu) acceptSuggestion()
        return
      }
      // Any other key ends an active completion menu.
      s.menu = null
      if (data === "\r") {
        collapsePrompt(s.line)
        const line = s.line.trim()
        s.line = ""
        if (line) {
          s.history.push(line)
          s.histIndex = s.history.length
        }
        const reprompt = runCommand(line)
        if (reprompt && !s.editorOpen) prompt()
        return
      }
      if (data === "\x7f") {
        if (s.line) {
          s.line = s.line.slice(0, -1)
          renderLine()
        }
        return
      }
      if (data === "\x03") {
        clearGhost()
        s.line = ""
        term.write("^C")
        prompt()
        return
      }
      if (data === "\x1b[A") {
        if (s.histIndex > 0) {
          s.histIndex -= 1
          s.line = s.history[s.histIndex] ?? ""
          renderLine()
        }
        return
      }
      if (data === "\x1b[B") {
        if (s.histIndex < s.history.length) {
          s.histIndex += 1
          s.line = s.history[s.histIndex] ?? ""
          renderLine()
        }
        return
      }
      // Printable text (ignore other escape sequences).
      if (data >= " " && !data.startsWith("\x1b")) {
        s.line += data
        renderLine()
      }
    }

    // The CSS var --font-mono is a next/font placeholder that xterm can't
    // resolve, so read the concrete family name and apply it. The Symbols Nerd
    // Font supplies the prompt's icon glyphs (OS/git/clock/path); JetBrains
    // Mono renders the text. We render with the default DOM renderer — it
    // composites over the transparent wallpaper backing correctly (WebGL/canvas
    // don't), and the prompt uses block-style separators so it needs no
    // canvas-only `customGlyphs` vector drawing.
    const mono = getComputedStyle(document.documentElement)
      .getPropertyValue("--font-mono")
      .trim()
    const nerd = nerdSymbols.style.fontFamily
    term.options.fontFamily = mono
      ? `${mono}, ${nerd}, ${TERMINAL_FONT_FAMILY}`
      : `${nerd}, ${TERMINAL_FONT_FAMILY}`

    fit.fit()
    fastfetch()
    // Open straight into the editor if a file was requested (page code button),
    // else drop to the shell prompt.
    // PageCodeButton passes a real deep source path; map it to the flat
    // terminal file before opening (falling back to the raw value).
    const startFile = initialFile
      ? (flatFileForSource(initialFile) ?? initialFile)
      : null
    if (!(startFile && openEditor(startFile))) prompt()

    // While the editor overlay owns the screen, xterm ignores keystrokes.
    const sub = term.onData((data) => {
      if (!s.editorOpen) onShellData(data)
    })
    // Refit whenever the CONTAINER changes size, not just the window. A plain
    // window "resize" listener misses tiling column-width changes and floating-
    // window drag-resize (the box changes but the viewport doesn't). rAF-coalesce
    // so a drag that fires many resize ticks only refits once per frame; skip
    // zero-size boxes (mid-close/animation) so fit() doesn't compute bad dims.
    const container = ref.current
    let refitRaf = 0
    const refit = (): void => {
      cancelAnimationFrame(refitRaf)
      refitRaf = requestAnimationFrame(() => {
        if (
          container &&
          container.clientWidth > 0 &&
          container.clientHeight > 0
        ) {
          fit.fit()
        }
      })
    }
    const observer = new ResizeObserver(refit)
    if (container) observer.observe(container)
    term.focus()

    return () => {
      sub.dispose()
      cancelAnimationFrame(refitRaf)
      observer.disconnect()
      if (matrixTimer !== null) clearInterval(matrixTimer)
    }
  }, [instance])

  return (
    <>
      <div className="relative h-full w-full flex-1">
        {/* Scrim behind the transparent xterm canvas: readability backing that
            still lets the wallpaper through (light theme only; dark = none). */}
        <div
          className="h-full w-full rounded-t-md"
          ref={ref}
          style={{ background: palette.scrim }}
        />
        {editor ? (
          <div className="absolute inset-0">
            <CodeEditor
              dark={dark}
              onClose={closeEditor}
              onMode={(mode) =>
                setBar((prev) => ({ ...prev, mode: mode.toUpperCase() }))
              }
              value={editor.content}
            />
          </div>
        ) : null}
      </div>
      <ZjStatusBar mode={bar.mode} palette={palette} tab={bar.tab} />
    </>
  )
}
