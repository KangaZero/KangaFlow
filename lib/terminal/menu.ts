// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// zsh "menu-select" style completion list for the web terminal: one candidate
// per row with an optional dim description column, the selected row
// highlighted. Pure (no DOM); terminal-body writes the rows and redraws them in
// place while Tab cycles.

import { hexToRgb } from "@/lib/terminal/prompt"
import type { TerminalPalette } from "@/lib/terminal/theme"

const RESET = "\x1b[0m"
const BOLD = "\x1b[1m"
const DIM = "\x1b[2m"
const fgHex = (hex: string): string => `\x1b[38;2;${hexToRgb(hex).join(";")}m`
const bgHex = (hex: string): string => `\x1b[48;2;${hexToRgb(hex).join(";")}m`

/** Above this many candidates the list would swamp the screen: use one line. */
export const MENU_MAX_ROWS = 12

/**
 * Rows for the completion menu, or a single space-joined line when there are
 * too many candidates (no highlight then — Tab still cycles the input).
 */
export function renderMenu(
  candidates: readonly string[],
  selected: number,
  describe: (candidate: string) => string,
  palette: TerminalPalette
): string[] {
  if (candidates.length > MENU_MAX_ROWS) return [candidates.join("  ")]
  const nameWidth = candidates.reduce((n, c) => Math.max(n, c.length), 0)
  const descriptions = candidates.map(describe)
  const descWidth = descriptions.reduce((n, d) => Math.max(n, d.length), 0)
  return candidates.map((candidate, i) => {
    const desc = descriptions[i] ?? ""
    const name = ` ${candidate.padEnd(nameWidth)} `
    const tail = descWidth ? ` -- ${desc.padEnd(descWidth)} ` : ""
    if (i === selected) {
      return `  ${bgHex(palette.mauve)}${fgHex(palette.base)}${BOLD}${name}${RESET}${bgHex(palette.mauve)}${fgHex(palette.base)}${tail}${RESET}`
    }
    return `  ${fgHex(palette.text)}${name}${RESET}${DIM}${fgHex(palette.overlay)}${tail}${RESET}`
  })
}
