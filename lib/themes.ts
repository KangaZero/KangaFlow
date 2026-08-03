// Single source of truth for the app's themes. The literal tuple drives both
// the runtime theme list (next-themes) and the `Theme` union, so adding a theme
// here updates types, the cycle order, and validation everywhere at once.
export const THEMES = ["light", "dark", "terminal"] as const

export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME = "terminal"

// Narrows next-themes' `string | undefined` down to a known Theme.
export function isTheme(value: string | undefined | null): value is Theme {
  return value != null && (THEMES as readonly string[]).includes(value)
}

// Advance to the next theme in declared order, wrapping around. Used by both
// the cycle button and the keyboard shortcut.
export function nextTheme(current: Theme): Theme {
  const index = THEMES.indexOf(current)
  //INFO: I do not think the nullish coalescing operator fallback will ever hit but just incase and to satisfy TS
  return THEMES[(index + 1) % THEMES.length] ?? DEFAULT_THEME
}
