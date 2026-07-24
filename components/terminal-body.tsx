"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { FitAddon } from "@xterm/addon-fit"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useRef, useState } from "react"
import { useXTerm } from "react-xtermjs"
import { completeLine, suggestLine } from "@/lib/terminal/complete"
import { type FastfetchInfo, renderFastfetch } from "@/lib/terminal/fastfetch"
import {
  handleKey,
  initPager,
  type PagerState,
  renderPager,
} from "@/lib/terminal/pager"
import {
  paletteForTheme,
  TERMINAL_FONT_FAMILY,
  TERMINAL_PROMPT,
  type TerminalPalette,
  xtermTheme,
} from "@/lib/terminal/theme"
import { isTheme, THEMES } from "@/lib/themes"
import { useLocale } from "@/providers/locale-provider"

// Mutable per-session terminal state, kept in a ref so the xterm data handler
// (bound once to the instance) always sees the latest without re-subscribing.
type Mode = "shell" | "nvim"
type Session = {
  mode: Mode
  line: string
  history: string[]
  histIndex: number
  pager: PagerState
  pagerLines: readonly string[]
  fileName: string
  // Active zsh-style completion menu (null when not cycling candidates).
  menu: { base: string; candidates: string[]; index: number } | null
  // Current ghost-text suggestion (full predicted line), or null.
  suggestion: string | null
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

const COMMANDS =
  "help  ff  ls  cat <file>  nvim <file>  theme <name>  clear  whoami  exit"

export function TerminalBody({
  files,
  initialFile,
  onClose,
}: {
  files: Record<string, string>
  initialFile: string | null
  onClose: () => void
}) {
  const { locale } = useLocale()
  const { resolvedTheme, setTheme } = useTheme()
  // paletteForTheme returns a shared constant → stable identity for deps.
  const palette = paletteForTheme(resolvedTheme)
  const fit = useMemo(() => new FitAddon(), [])
  // Stable references: useXTerm effect-depends on these, so fresh literals each
  // render would re-init the terminal every render → setState loop. Theme is set
  // once here and then updated live via the effect below.
  const addons = useMemo(() => [fit], [fit])
  const options = useMemo(
    () => ({
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

  const startedAt = useRef(Date.now())
  const session = useRef<Session>({
    fileName: "",
    histIndex: 0,
    history: [],
    line: "",
    menu: null,
    mode: "shell",
    pager: initPager(),
    pagerLines: [],
    suggestion: null,
  })

  // biome-ignore lint/correctness/useExhaustiveDependencies: one-time setup bound to the xterm instance; handlers read live values via the `session` ref, and the closed-over props are stable for a session's lifetime.
  useEffect(() => {
    if (!instance) return
    const term = instance
    const s = session.current

    const prompt = () => term.write(`\r\n${TERMINAL_PROMPT}`)

    const fastfetch = () => {
      const info: FastfetchInfo = {
        browser: shortBrowser(navigator.userAgent),
        colors: 256,
        locale,
        resolution: `${window.screen.width}x${window.screen.height}`,
        themeLabel: "terminal (Catppuccin)",
        uptime: formatUptime(Date.now() - startedAt.current),
      }
      for (const line of renderFastfetch(info)) term.writeln(line)
    }

    const drawPager = () => {
      term.write("\x1b[?25l\x1b[2J\x1b[H")
      const frame = renderPager(s.pager, s.pagerLines, {
        cols: term.cols,
        fileName: s.fileName,
        rows: term.rows,
      })
      term.write(frame.join("\r\n"))
    }

    const openNvim = (path: string) => {
      const content = files[path]
      if (content === undefined) {
        term.write(`\r\nnvim: ${path}: no such file`)
        prompt()
        return
      }
      s.mode = "nvim"
      s.pager = initPager()
      s.pagerLines = content.split("\n")
      s.fileName = path
      setBar({ mode: "NORMAL", tab: `nvim ${baseName(path)}` })
      drawPager()
    }

    const runCommand = (raw: string): boolean => {
      const [cmd, ...args] = raw.split(/\s+/)
      const arg = args.join(" ")
      switch (cmd) {
        case "":
          return true
        case "h":
        case "help":
          term.write(`\r\ncommands: ${COMMANDS}`)
          return true
        case "ff":
        case "fastfetch":
        case "neofetch":
          term.write("\r\n")
          fastfetch()
          return true
        case "ls":
          term.write(`\r\n${Object.keys(files).sort().join("\r\n")}`)
          return true
        case "cat": {
          const file = files[arg]
          if (file === undefined) {
            term.write(`\r\ncat: ${arg}: no such file`)
            return true
          }
          term.write(`\r\n${file.replace(/\n/g, "\r\n")}`)
          return true
        }
        case "nvim":
        case "vim":
        case "code":
          if (!arg) {
            term.write("\r\nusage: nvim <file>  (try `ls`)")
            return true
          }
          openNvim(arg)
          return false
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
          term.write(`\r\nzsh: command not found: ${cmd}`)
          return true
      }
    }

    const replaceLine = (next: string) => {
      term.write(`\r${TERMINAL_PROMPT}\x1b[K${next}`)
      s.line = next
    }

    // Redraw the line plus its dim ghost-text suggestion, leaving the cursor
    // right after the typed text (the ghost sits ahead of it).
    const renderLine = () => {
      const suggestion = suggestLine(s.line, Object.keys(files), s.history)
      s.suggestion = suggestion
      term.write(`\r${TERMINAL_PROMPT}\x1b[K${s.line}`)
      if (suggestion && suggestion.length > s.line.length) {
        const ghost = suggestion.slice(s.line.length)
        term.write(`\x1b[2m${ghost}\x1b[0m\x1b[${ghost.length}D`)
      }
    }

    // Redraw without the ghost (before Enter/Ctrl-C so no dim tail lingers).
    const clearGhost = () => {
      s.suggestion = null
      term.write(`\r${TERMINAL_PROMPT}\x1b[K${s.line}`)
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
      const { wordStart, candidates } = completeLine(s.line, Object.keys(files))
      if (candidates.length <= 1) return
      const base = s.line.slice(0, wordStart)
      const next = base + (candidates[0] ?? "")
      s.menu = { base, candidates, index: 0 }
      s.line = next
      s.suggestion = null
      term.write(`\r\n${candidates.join("  ")}\r\n${TERMINAL_PROMPT}${next}`)
    }

    const cycleMenu = (dir: 1 | -1) => {
      const menu = s.menu
      if (!menu) return
      const len = menu.candidates.length
      menu.index = (menu.index + dir + len) % len
      replaceLine(menu.base + (menu.candidates[menu.index] ?? ""))
    }

    const onShellData = (data: string) => {
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
        clearGhost()
        const line = s.line.trim()
        s.line = ""
        if (line) {
          s.history.push(line)
          s.histIndex = s.history.length
        }
        const reprompt = runCommand(line)
        if (reprompt && s.mode === "shell") prompt()
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

    const onNvimData = (data: string) => {
      const result = handleKey(s.pager, data, s.pagerLines, term.rows - 1)
      s.pager = result.state
      if (result.quit) {
        s.mode = "shell"
        term.write("\x1b[?25h\x1b[2J\x1b[H")
        setBar({ mode: "NORMAL", tab: "zsh" })
        term.write(TERMINAL_PROMPT)
        return
      }
      drawPager()
      setBar({
        mode: s.pager.mode.toUpperCase(),
        tab: `nvim ${baseName(s.fileName)}`,
      })
    }

    fit.fit()
    fastfetch()
    if (initialFile) openNvim(initialFile)
    else prompt()

    const sub = term.onData((data) =>
      s.mode === "nvim" ? onNvimData(data) : onShellData(data)
    )
    const onResize = () => fit.fit()
    window.addEventListener("resize", onResize)
    term.focus()

    return () => {
      sub.dispose()
      window.removeEventListener("resize", onResize)
    }
  }, [instance])

  return (
    <>
      <div
        className="min-h-0 w-full flex-1 overflow-hidden rounded-t-md"
        ref={ref}
      />
      <ZjStatusBar mode={bar.mode} palette={palette} tab={bar.tab} />
    </>
  )
}
