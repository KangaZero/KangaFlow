"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// ─── KNOWN ISSUES / TODO(human) ─────────────────────────────────────────────
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
// 3. Sizing. fit() runs once before the open animation settles, so cols/rows can
//    be wrong on first open (and after the editor closes). Use a ResizeObserver
//    on the container instead of the one-shot fit + window listener.
// 4. Ghost/menu redraw glitches: opening or cycling the completion menu doesn't
//    always clear a previously drawn ghost, so stale dim text can linger.
// 5. `clear` leaves the fresh prompt on row 2 (2J+H then prints \r\n+prompt);
//    it should home the cursor and print the prompt at the top.
// 6. No in-line cursor editing: ← / Home / End / mid-line insert are unhandled
//    (append-only), and → is overloaded solely to accept the ghost.
// 7. Editor is ephemeral: `:w` is a silent no-op and edits are discarded on
//    close (by design) — should signal this or disable write.
// 8. Multi-line paste is appended as a single line (newlines aren't split into
//    separate command runs).
// ─────────────────────────────────────────────────────────────────────────────

import { FitAddon } from "@xterm/addon-fit"
import type {
  ITerminalAddon,
  ITerminalInitOnlyOptions,
  ITerminalOptions,
} from "@xterm/xterm"
import localFont from "next/font/local"
import { useTheme } from "next-themes"
import { useEffect, useMemo, useRef, useState } from "react"
import { useXTerm } from "react-xtermjs"
import { CodeEditor } from "@/components/code-editor"
import { completeLine, suggestLine } from "@/lib/terminal/complete"
import { type FastfetchInfo, renderFastfetch } from "@/lib/terminal/fastfetch"
import { buildPrompt, detectOs } from "@/lib/terminal/prompt"
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
  nodeAt,
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
  // Current working directory (absolute VFS path) for cd/pwd/ls/cat/nvim.
  cwd: string
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
  ["ls", "list the current directory"],
  ["cd <dir>", "change directory"],
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
  const { resolvedTheme, setTheme } = useTheme()
  // paletteForTheme returns a shared constant → stable identity for deps.
  const palette = paletteForTheme(resolvedTheme)
  // Virtual filesystem over the source snapshot (pages become folders).
  const vfs = useMemo(() => buildVfs(Object.keys(files)), [files])
  const fit = useMemo(() => new FitAddon(), [])
  // Stable references: useXTerm effect-depends on these, so fresh literals each
  // render would re-init the terminal every render → setState loop. Theme is set
  // once here and then updated live via the effect below.
  const addons: ITerminalAddon[] = useMemo(() => [fit], [fit])
  const options: ITerminalOptions & ITerminalInitOnlyOptions = useMemo(
    () => ({
      allowTransparency: true,
      cursorBlink: true,
      // xterm draws box-drawing + powerline separators (U+E0B0–E0D4) itself as
      // vector shapes fitted to the cell, so they never fall back to the Nerd
      // Font at the wrong width and clip. Only the true icons need the font.
      customGlyphs: true,
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

  const startedAt = useRef(Date.now())
  const session = useRef<Session>({
    cwd: cwdForRoute(routePath, vfs),
    editorOpen: false,
    exitCode: 0,
    histIndex: 0,
    history: [],
    line: "",
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
        themeLabel: darkRef.current
          ? "terminal (Catppuccin Mocha)"
          : "terminal (Catppuccin Latte)",
        uptime: formatUptime(Date.now() - startedAt.current),
      }
      for (const line of renderFastfetch(info)) term.writeln(line)
    }

    // Hand off to the CodeMirror (real vim) editor overlay. Returns whether it
    // opened, so the shell can decide whether to reprint the prompt.
    const openEditor = (path: string): boolean => {
      const content = files[path]
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
        case "pwd":
          term.write(`\r\n${s.cwd}`)
          return true
        case "cd": {
          const target = resolvePath(s.cwd, arg || "~")
          const node = nodeAt(vfs, target)
          if (!node) {
            term.write(`\r\ncd: ${arg}: no such file or directory`)
          } else if (node.type !== "dir") {
            term.write(`\r\ncd: ${arg}: not a directory`)
          } else {
            s.cwd = target
          }
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
          const file = files[key]
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
      const suggestion = suggestLine(s.line, Object.keys(files), s.history)
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

    // xterm's canvas renderer can't resolve CSS var(), so read the concrete
    // next/font family name from --font-mono (JetBrains Mono) and apply it.
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
    if (!(initialFile && openEditor(initialFile))) prompt()

    // While the editor overlay owns the screen, xterm ignores keystrokes.
    const sub = term.onData((data) => {
      if (!s.editorOpen) onShellData(data)
    })
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
      <div className="relative h-full w-full flex-1">
        <div className="h-full w-full rounded-t-md" ref={ref} />
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
