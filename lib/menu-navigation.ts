// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure keyboard model for the settings pause menu: which key means what, and
// index arithmetic. No DOM, so it unit-tests without rendering the dialog.

export const SETTINGS_TABS = ["controls", "audio", "display", "system"] as const
export type SettingsTab = (typeof SETTINGS_TABS)[number]

export type MenuIntent =
  | "up"
  | "down"
  | "left"
  | "right"
  | "nextTab"
  | "prevTab"
  | "select"

// Arrows and vim's hjkl always work (the menu has no text fields, so bare keys
// are safe here); q/e and [/] page between tabs like a game's shoulder buttons.
// Escape is not here: the dialog itself closes on it.
const KEY_INTENTS = {
  " ": "select",
  "[": "prevTab",
  "]": "nextTab",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  Enter: "select",
  e: "nextTab",
  h: "left",
  j: "down",
  k: "up",
  l: "right",
  q: "prevTab",
} as const satisfies Record<string, MenuIntent>

function isIntentKey(key: string): key is keyof typeof KEY_INTENTS {
  return Object.hasOwn(KEY_INTENTS, key)
}

/**
 * The menu action a key press asks for, or undefined. Any held modifier opts
 * out, so global shortcuts (⌘, to close settings, ⌘K, …) still reach the
 * shortcut dispatcher while the menu is open.
 */
export function menuIntentFromKey(
  event: Pick<KeyboardEvent, "key" | "metaKey" | "ctrlKey" | "altKey">
): MenuIntent | undefined {
  if (event.metaKey || event.ctrlKey || event.altKey) return undefined
  return isIntentKey(event.key) ? KEY_INTENTS[event.key] : undefined
}

/** Step `index` by `delta` through a list of `length`, wrapping at both ends. */
export function wrapIndex(
  index: number,
  delta: number,
  length: number
): number {
  if (length <= 0) return 0
  return (((index + delta) % length) + length) % length
}
