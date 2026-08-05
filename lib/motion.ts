// Centralised Motion transition presets.
// Import from here instead of defining inline — edit once, affects every consumer.
// All values are `as const` so TypeScript infers the narrowest literal types.

// ── Springs ───────────────────────────────────────────────────────────────────

// Button press / whileTap feedback — fast, snappy.
export const SPRING_TAP = {
  damping: 18,
  stiffness: 500,
  type: "spring",
} as const

// List-item layout reorder — medium tempo, no mass.
export const SPRING_LIST = {
  damping: 22,
  stiffness: 340,
  type: "spring",
} as const

// Drag-to-reorder / track row layout — heavier feel via mass.
export const SPRING_REORDER = {
  damping: 20,
  mass: 0.8,
  stiffness: 320,
  type: "spring",
} as const

// Sliding pill / tab indicator.
export const SPRING_PILL = {
  damping: 26,
  stiffness: 340,
  type: "spring",
} as const

// Notification card enter / exit.
export const SPRING_CARD = {
  damping: 22,
  mass: 0.8,
  stiffness: 320,
  type: "spring",
} as const

// Notification content / draggable-window open.
export const SPRING_CONTENT = {
  damping: 26,
  stiffness: 320,
  type: "spring",
} as const

// Segmented-control pill (tighter, more authoritative).
export const SPRING_SEGMENTED = {
  damping: 32,
  stiffness: 400,
  type: "spring",
} as const

// Panel / sidebar / carousel slides.
export const SPRING_PANEL = {
  damping: 30,
  stiffness: 300,
  type: "spring",
} as const

// General layout reveal (environment overlay).
export const SPRING_LAYOUT = {
  damping: 30,
  stiffness: 320,
  type: "spring",
} as const

// Workspace column / window tile animations.
export const SPRING_TILE = {
  damping: 30,
  stiffness: 260,
  type: "spring",
} as const

// Workspace column with a hard duration cap (overrides spring physics to 100 ms).
export const SPRING_WORKSPACE = {
  damping: 30,
  duration: 100,
  stiffness: 260,
  type: "spring",
} as const

// Workspace pip / dot indicator — heavy damping, slow settle.
export const SPRING_PIP = {
  damping: 50,
  stiffness: 200,
  type: "spring",
} as const

// ── Tweens ────────────────────────────────────────────────────────────────────

// Quick easeOut — panel/launcher appear/disappear.
export const TWEEN_QUICK = {
  duration: 0.16,
  ease: "easeOut",
} as const

// Fast icon swap (play/pause/volume).
export const TWEEN_FAST = {
  duration: 0.12,
} as const

// Track / content crossfade.
export const TWEEN_TRACK = {
  duration: 0.3,
  ease: "easeOut",
} as const

// Smooth tab/nav pill slide — symmetrical, no overshoot.
export const TWEEN_SMOOTH = {
  duration: 0.2,
  ease: "easeInOut",
} as const
