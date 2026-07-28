// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Catppuccin palettes for the in-browser terminal: Latte (light) and Mocha
// (dark). Selected from the app theme so the terminal has its own light/dark
// look. Brand/identity colour constants (like the tech-icon hues), so they live
// here rather than as themeable globals.css tokens. Kept free of xterm/DOM
// imports so both the client terminal body and the prerendered dialog shell can
// use it.

export type TerminalPalette = {
  base: string
  // DOM backing painted *behind* the transparent xterm canvas (a CSS colour on
  // the mount element). Under allowTransparency the canvas clearRects and never
  // fills the theme background, so contrast has to come from here: dark → none
  // (light text reads over the dark wallpaper); light → a low-alpha scrim so
  // dark text + the fastfetch accents stay legible over the busy photo.
  scrim: string
  text: string
  mauve: string
  pink: string
  red: string
  blue: string
  teal: string
  yellow: string
  green: string
  overlay: string
  cursor: string
  black: string
  white: string
  brightBlack: string
  brightWhite: string
}

export const MOCHA: TerminalPalette = {
  base: "#1e1e2e",
  black: "#45475a",
  blue: "#89b4fa",
  brightBlack: "#585b70",
  brightWhite: "#a6adc8",
  cursor: "#f5e0dc",
  green: "#a6e3a1",
  mauve: "#cba6f7",
  overlay: "#6c7086",
  pink: "#f5c2e7",
  red: "#f38ba8",
  scrim: "transparent", // light text over the dark wallpaper needs no backing
  teal: "#94e2d5",
  text: "#cdd6f4",
  white: "#bac2de",
  yellow: "#f9e2af",
}

export const LATTE: TerminalPalette = {
  base: "#eff1f5",
  black: "#5c5f77",
  blue: "#1e66f5",
  brightBlack: "#6c6f85",
  brightWhite: "#bcc0cc",
  cursor: "#dc8a78",
  green: "#40a02b",
  mauve: "#8839ef",
  overlay: "#9ca0b0",
  pink: "#ea76cb",
  red: "#d20f39",
  scrim: "rgba(239,241,245,0.7)", // base #eff1f5 @ 70% — dark text + fastfetch accents stay legible over the photo
  teal: "#179299",
  text: "#4c4f69",
  white: "#acb0be",
  yellow: "#df8e1d",
}

// Light theme → Latte; dark AND the terminal theme → Mocha. Returns the shared
// constant (stable identity) so it's safe as a hook/effect dependency.
export function paletteForTheme(theme: string | undefined): TerminalPalette {
  return theme === "light" ? LATTE : MOCHA
}

// Build an xterm ITheme-compatible object from a palette.
export function xtermTheme(p: TerminalPalette) {
  return {
    // Always transparent (paired with allowTransparency) so the wallpaper shows
    // through; the canvas clearRects and never fills this. Readability contrast
    // comes from the DOM scrim behind the canvas — see TerminalPalette.scrim.
    background: "rgba(0,0,0,0)",
    black: p.black,
    blue: p.blue,
    brightBlack: p.brightBlack,
    brightBlue: p.blue,
    brightCyan: p.teal,
    brightGreen: p.green,
    brightMagenta: p.mauve,
    brightRed: p.red,
    brightWhite: p.brightWhite,
    brightYellow: p.yellow,
    cursor: p.cursor,
    cyan: p.teal,
    foreground: p.text,
    green: p.green,
    magenta: p.mauve,
    red: p.red,
    white: p.white,
    yellow: p.yellow,
  }
}

export const TERMINAL_FONT_FAMILY =
  '"JetBrains Mono", "Fira Code", ui-monospace, SFMono-Regular, Menlo, monospace'

// zsh-like prompt using ANSI 16-colour codes (cyan path, magenta arrow) so it
// follows the live xterm theme instead of hardcoding a flavour.
export const TERMINAL_PROMPT = "\x1b[36m~/kangaflow\x1b[0m \x1b[35m❯\x1b[0m "
