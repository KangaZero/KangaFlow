// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure tab-completion resolver for the in-browser shell: given the current input
// line and the known file list, work out which token is being completed, the
// matching candidates, and their longest common prefix. Free of xterm/React so
// the terminal only owns menu state + drawing.
import { THEMES } from "@/lib/themes"

// Single source of truth for the shell's command names (also drives completion
// of the first word).
export const SHELL_COMMANDS = [
  "cat",
  "clear",
  "code",
  "exit",
  "ff",
  "help",
  "ls",
  "nvim",
  "theme",
  "vim",
  "whoami",
] as const

export type Completion = {
  word: string // the token being completed
  wordStart: number // its start index within the line
  candidates: string[] // full-token matches, sorted
  commonPrefix: string // longest common prefix of the candidates
}

function longestCommonPrefix(items: readonly string[]): string {
  let prefix = items[0] ?? ""
  for (const item of items) {
    while (prefix !== "" && !item.startsWith(prefix)) {
      prefix = prefix.slice(0, -1)
    }
  }
  return prefix
}

export function completeLine(
  line: string,
  files: readonly string[]
): Completion {
  const wordStart = line.lastIndexOf(" ") + 1
  const word = line.slice(wordStart)
  const firstSpace = line.indexOf(" ")
  const command = firstSpace === -1 ? "" : line.slice(0, firstSpace)

  let pool: readonly string[]
  if (wordStart === 0) {
    // Still on the first token → complete a command name.
    pool = SHELL_COMMANDS
  } else if (
    command === "cat" ||
    command === "nvim" ||
    command === "vim" ||
    command === "code"
  ) {
    pool = files
  } else if (command === "theme") {
    pool = THEMES
  } else {
    pool = []
  }

  const candidates = pool.filter((entry) => entry.startsWith(word)).sort()
  return {
    candidates,
    commonPrefix: longestCommonPrefix(candidates),
    word,
    wordStart,
  }
}

// The inline "ghost text" suggestion for the current line (fish/zsh-autosuggest
// style): the most recent matching history entry, else the deterministic
// completion (a unique match, or the shared prefix). Always starts with `line`.
// Returns null when there's nothing safe to suggest (ambiguous or complete).
export function suggestLine(
  line: string,
  files: readonly string[],
  history: readonly string[]
): string | null {
  if (line === "") return null

  for (let i = history.length - 1; i >= 0; i--) {
    const entry = history[i]
    if (entry && entry !== line && entry.startsWith(line)) return entry
  }

  const { word, wordStart, candidates, commonPrefix } = completeLine(
    line,
    files
  )
  if (candidates.length === 0) return null
  const base = line.slice(0, wordStart)
  if (candidates.length === 1) {
    const only = candidates[0]
    // Exact match → already complete, nothing to suggest.
    if (!only || only === word) return null
    return `${base}${only} `
  }
  if (commonPrefix.length > word.length) return base + commonPrefix
  return null
}
