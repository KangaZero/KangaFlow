// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Corne v4 (crkbd) × Colemak Mod-DH (ortho): the ONE source of truth for the
// on-screen keyboard widget. Layers, key geometry, legends, the honesty flags
// (verified / conventional / placeholder / unverified) and the physical
// `KeyboardEvent.code` → Corne key map all live here; the engine, the caret
// helper and the UI derive from it. Pure data + pure lookups (no React/DOM).
//
// What is verified vs not:
// - 3×6 column-staggered matrix + 3 thumbs per half = 42 keys (foostan/crkbd).
// - Colemak-DH alpha block (columns 1–5 of the base layer).
// - Outer columns (Tab/Ctrl/Shift, Bksp/'/Shift) are CONVENTIONAL placeholders.
// - Thumbs and the Lower/Raise/Adjust layers are PLACEHOLDERS until the owner
//   exports the real QMK/ZMK/Vial keymap.
// - The v4 extension keys (42–46 switch builds) have UNVERIFIED positions, so
//   they only render as ghosts behind a toggle and never act.

// ── Characters ──────────────────────────────────────────────────────────────

// Split a string literal into a union of its characters, so the printable set
// is written once and every layout cell is checked against it.
type CharsOf<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head | CharsOf<Tail>
  : never

const LOWER_LETTERS = "abcdefghijklmnopqrstuvwxyz"
const UNSHIFTED_SYMBOLS = "0123456789`-=[]\\;',./"

type Letter = CharsOf<typeof LOWER_LETTERS>
type UnshiftedSymbol = CharsOf<typeof UNSHIFTED_SYMBOLS>
export type UnshiftedChar = Letter | UnshiftedSymbol

// US-ANSI shift pairs for the non-letter keys.
export const SHIFTED_SYMBOL = {
  "-": "_",
  ",": "<",
  ";": ":",
  ".": ">",
  "'": '"',
  "[": "{",
  "]": "}",
  "/": "?",
  "\\": "|",
  "`": "~",
  "=": "+",
  "0": ")",
  "1": "!",
  "2": "@",
  "3": "#",
  "4": "$",
  "5": "%",
  "6": "^",
  "7": "&",
  "8": "*",
  "9": "(",
} as const satisfies Record<UnshiftedSymbol, string>

export type ShiftedChar =
  | Uppercase<Letter>
  | (typeof SHIFTED_SYMBOL)[UnshiftedSymbol]
export type PrintableChar = UnshiftedChar | ShiftedChar

function isLetter(char: PrintableChar): char is Letter {
  return LOWER_LETTERS.includes(char)
}

function isUnshiftedSymbol(char: PrintableChar): char is UnshiftedSymbol {
  return Object.hasOwn(SHIFTED_SYMBOL, char)
}

/** The character a key types with Shift held (shifted chars stay as they are). */
export function shiftOf(char: PrintableChar): PrintableChar {
  if (isLetter(char)) return char.toUpperCase() as Uppercase<Letter>
  if (isUnshiftedSymbol(char)) return SHIFTED_SYMBOL[char]
  return char
}

/** Caps lock shifts letters only; punctuation keeps its unshifted face. */
export function capsOf(char: PrintableChar): PrintableChar {
  return isLetter(char) ? shiftOf(char) : char
}

// Spoken names for punctuation (letters/digits read fine as themselves). The
// name is the i18n key suffix: `widgets.keyboard.chars.<name>`.
export const CHAR_NAMES = {
  _: "underscore",
  "-": "minus",
  ",": "comma",
  ";": "semicolon",
  ":": "colon",
  "!": "exclamation",
  "?": "question",
  ".": "period",
  "'": "apostrophe",
  '"': "quote",
  "(": "leftParen",
  ")": "rightParen",
  "[": "leftBracket",
  "]": "rightBracket",
  "{": "leftBrace",
  "}": "rightBrace",
  "@": "at",
  "*": "asterisk",
  "/": "slash",
  "\\": "backslash",
  "&": "ampersand",
  "#": "hash",
  "%": "percent",
  "`": "backtick",
  "^": "caret",
  "+": "plus",
  "<": "lessThan",
  "=": "equals",
  ">": "greaterThan",
  "|": "pipe",
  "~": "tilde",
  $: "dollar",
} as const satisfies Partial<Record<PrintableChar, string>>

export type CharName = (typeof CHAR_NAMES)[keyof typeof CHAR_NAMES]

export function charNameOf(char: PrintableChar): CharName | null {
  return Object.hasOwn(CHAR_NAMES, char)
    ? CHAR_NAMES[char as keyof typeof CHAR_NAMES]
    : null
}

// ── Tokens ──────────────────────────────────────────────────────────────────

// Non-character key functions. Their legends and aria-labels live in i18n under
// `widgets.keyboard.keys.<token>` (the template-literal key makes a missing
// translation a type error).
export const SPECIAL_TOKENS = [
  "Tab",
  "Bksp",
  "Ctrl",
  "Shift",
  "Enter",
  "Space",
  "Esc",
  "Gui",
  "Alt",
  "Lower",
  "Raise",
  "Up",
  "Down",
  "Left",
  "Right",
  "Home",
  "End",
  "PgUp",
  "PgDn",
  "Del",
  "WBksp",
  "NOOP",
] as const
export type SpecialToken = (typeof SPECIAL_TOKENS)[number]

export const FN_TOKENS = [
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "F10",
  "F11",
  "F12",
] as const
export type FnToken = (typeof FN_TOKENS)[number]

export type KeyToken = PrintableChar | SpecialToken | FnToken

export function isSpecialToken(token: KeyToken): token is SpecialToken {
  return (SPECIAL_TOKENS as readonly string[]).includes(token)
}

export function isFnToken(token: KeyToken): token is FnToken {
  return (FN_TOKENS as readonly string[]).includes(token)
}

export function isCharToken(token: KeyToken): token is PrintableChar {
  return !(isSpecialToken(token) || isFnToken(token))
}

// ── Layers ──────────────────────────────────────────────────────────────────

export const LAYER_IDS = ["base", "lower", "raise", "adjust"] as const
export type LayerId = (typeof LAYER_IDS)[number]

// The two thumb keys that switch layers (held = momentary, tap = lock).
export const LAYER_KEYS = ["lower", "raise"] as const
export type LayerKey = (typeof LAYER_KEYS)[number]

export const HALVES = ["L", "R"] as const
export type Half = (typeof HALVES)[number]

type Row6 = readonly [
  KeyToken,
  KeyToken,
  KeyToken,
  KeyToken,
  KeyToken,
  KeyToken,
]
type HalfRows = readonly [Row6, Row6, Row6]
type LayerDef = {
  // Placeholder layers render every key with the dashed "?" badge.
  placeholder: boolean
  L: HalfRows
  R: HalfRows
}

export const LAYERS = {
  // Numbers + function keys — PLACEHOLDER.
  adjust: {
    L: [
      ["Tab", "F1", "F2", "F3", "F4", "F5"],
      ["Ctrl", "F6", "F7", "F8", "F9", "F10"],
      ["Shift", "F11", "F12", "NOOP", "NOOP", "NOOP"],
    ],
    placeholder: true,
    R: [
      ["/", "7", "8", "9", "-", "Bksp"],
      ["*", "4", "5", "6", "+", "="],
      ["0", "1", "2", "3", ".", "Shift"],
    ],
  },
  // Colemak Mod-DH matrix/ortho. Alphas verified; outer columns conventional.
  base: {
    L: [
      ["Tab", "q", "w", "f", "p", "b"],
      ["Ctrl", "a", "r", "s", "t", "g"],
      ["Shift", "z", "x", "c", "d", "v"],
    ],
    placeholder: false,
    R: [
      ["j", "l", "u", "y", ";", "Bksp"],
      ["m", "n", "e", "i", "o", "'"],
      ["k", "h", ",", ".", "/", "Shift"],
    ],
  },
  // Symbols — PLACEHOLDER until the real keymap export.
  lower: {
    L: [
      ["Tab", "!", "@", "#", "$", "%"],
      ["Ctrl", "`", "~", "\\", "|", "NOOP"],
      ["Shift", "NOOP", "NOOP", "NOOP", "NOOP", "NOOP"],
    ],
    placeholder: true,
    R: [
      ["^", "&", "*", "(", ")", "Bksp"],
      ["-", "=", "[", "]", "{", "}"],
      ["_", "+", "<", ">", "?", "Shift"],
    ],
  },
  // Navigation — PLACEHOLDER.
  raise: {
    L: [
      ["Tab", "Esc", "NOOP", "NOOP", "NOOP", "NOOP"],
      ["Ctrl", "Gui", "Alt", "Shift", "Ctrl", "NOOP"],
      ["Shift", "NOOP", "NOOP", "NOOP", "NOOP", "NOOP"],
    ],
    placeholder: true,
    R: [
      ["PgUp", "Home", "Up", "End", "NOOP", "Bksp"],
      ["PgDn", "Left", "Down", "Right", "NOOP", "NOOP"],
      ["NOOP", "WBksp", "NOOP", "NOOP", "Del", "Shift"],
    ],
  },
} as const satisfies Record<LayerId, LayerDef>

// Thumbs, listed left→right per half (L outer→inner, R inner→outer). The same
// on every layer, and PLACEHOLDER as a whole.
export const THUMBS = {
  L: ["Gui", "Lower", "Space"],
  placeholder: true,
  R: ["Enter", "Raise", "Alt"],
} as const satisfies {
  placeholder: true
  L: readonly [KeyToken, KeyToken, KeyToken]
  R: readonly [KeyToken, KeyToken, KeyToken]
}

// ── Geometry (key units, u) ─────────────────────────────────────────────────

export const MATRIX_ROWS = [0, 1, 2] as const
export const MATRIX_COLS = [0, 1, 2, 3, 4, 5] as const
export const THUMB_INDICES = [0, 1, 2] as const
export const EXT_INDICES = [0, 1] as const

type MatrixRow = (typeof MATRIX_ROWS)[number]
type MatrixCol = (typeof MATRIX_COLS)[number]
type ThumbIndex = (typeof THUMB_INDICES)[number]
type ExtIndex = (typeof EXT_INDICES)[number]

export type KeyId =
  | `${Half}-${MatrixRow}-${MatrixCol}`
  | `${Half}T-${ThumbIndex}`
  | `${Half}X-${ExtIndex}`

type KeyPlacement = {
  id: KeyId
  half: Half
  x: number // left edge, in u, within the half
  y: number // top edge, in u
  h: number // height in u (width is always 1u)
  rotate: number // degrees
}

export type CorneKey =
  | (KeyPlacement & { kind: "matrix"; row: MatrixRow; col: MatrixCol })
  | (KeyPlacement & { kind: "thumb"; index: ThumbIndex })
  | (KeyPlacement & { kind: "ext"; index: ExtIndex })

// A half is 6u wide; thumbs hang below the 3 matrix rows.
export const HALF_WIDTH_U = 6
export const HALF_HEIGHT_U = 5.25

// Column stagger (left half, outer → inner): pinky lowest, middle highest.
const STAGGER_L = [0.5, 0.5, 0.22, 0, 0.12, 0.25] as const
const STAGGER_R = [...STAGGER_L].reverse()

// Fanned thumbs (left half, outer → inner); the right half mirrors them.
const THUMB_FAN_L = [
  { h: 1, rotate: 4, x: 2.85, y: 3.42 },
  { h: 1, rotate: 11, x: 3.92, y: 3.52 },
  { h: 1.5, rotate: 24, x: 5, y: 3.6 },
] as const
const THUMB_FAN_R = THUMB_FAN_L.map((t) => ({
  h: t.h,
  rotate: -t.rotate,
  x: HALF_WIDTH_U - t.x - 1,
  y: t.y,
})).reverse()

// v4 extension keys — POSITION UNVERIFIED (inner column, beside the matrix).
const EXT_SPOTS = {
  L: [
    { x: 6.12, y: 0.35 },
    { x: 6.12, y: 1.35 },
  ],
  R: [
    { x: -1.12, y: 0.35 },
    { x: -1.12, y: 1.35 },
  ],
} as const satisfies Record<Half, readonly { x: number; y: number }[]>

function buildKeys(): readonly CorneKey[] {
  const keys: CorneKey[] = []
  for (const half of HALVES) {
    const stagger = half === "L" ? STAGGER_L : STAGGER_R
    for (const row of MATRIX_ROWS) {
      for (const col of MATRIX_COLS) {
        keys.push({
          col,
          h: 1,
          half,
          id: `${half}-${row}-${col}`,
          kind: "matrix",
          rotate: 0,
          row,
          x: col,
          y: row + (stagger[col] ?? 0),
        })
      }
    }
    const fan = half === "L" ? THUMB_FAN_L : THUMB_FAN_R
    for (const index of THUMB_INDICES) {
      const spot = fan[index]
      if (spot === undefined) continue
      keys.push({
        half,
        id: `${half}T-${index}`,
        index,
        kind: "thumb",
        ...spot,
      })
    }
    for (const index of EXT_INDICES) {
      const spot = EXT_SPOTS[half][index]
      keys.push({
        h: 1,
        half,
        id: `${half}X-${index}`,
        index,
        kind: "ext",
        rotate: 0,
        ...spot,
      })
    }
  }
  return keys
}

export const CORNE_KEYS: readonly CorneKey[] = buildKeys()

const KEY_BY_ID: ReadonlyMap<KeyId, CorneKey> = new Map(
  CORNE_KEYS.map((key) => [key.id, key])
)

export function keyById(id: KeyId): CorneKey | undefined {
  return KEY_BY_ID.get(id)
}

// ── Token / status per layer ────────────────────────────────────────────────

/** What a key does on `layer`; extension keys never act. */
export function tokenAt(layer: LayerId, key: CorneKey): KeyToken {
  switch (key.kind) {
    case "ext":
      return "NOOP"
    case "thumb":
      return THUMBS[key.half][key.index]
    case "matrix":
      return LAYERS[layer][key.half][key.row][key.col]
  }
}

export const KEY_STATUSES = [
  "verified",
  "conventional",
  "placeholder",
  "unverified",
] as const
export type KeyStatus = (typeof KEY_STATUSES)[number]

const OUTER_COL: Record<Half, MatrixCol> = { L: 0, R: 5 }

/** How much of a key's legend is real (drives the dashed "?" / "≈" badges). */
export function statusAt(layer: LayerId, key: CorneKey): KeyStatus {
  if (key.kind === "ext") return "unverified"
  if (key.kind === "thumb") return "placeholder"
  if (LAYERS[layer].placeholder) return "placeholder"
  return key.col === OUTER_COL[key.half] ? "conventional" : "verified"
}

// ── Physical mirroring ──────────────────────────────────────────────────────

// Physical QWERTY position (`KeyboardEvent.code`, layout-independent) → the
// Corne key in the same spot. Used only to LIGHT keys; real typing is never
// intercepted or remapped.
export const PHYSICAL_KEY_MAP = {
  AltLeft: "LT-1",
  AltRight: "RT-1",
  Backspace: "R-0-5",
  BracketLeft: "R-0-5",
  CapsLock: "L-1-0",
  Comma: "R-2-2",
  ControlLeft: "L-1-0",
  ControlRight: "RT-2",
  Enter: "RT-0",
  KeyA: "L-1-1",
  KeyB: "L-2-5",
  KeyC: "L-2-3",
  KeyD: "L-1-3",
  KeyE: "L-0-3",
  KeyF: "L-1-4",
  KeyG: "L-1-5",
  KeyH: "R-1-0",
  KeyI: "R-0-2",
  KeyJ: "R-1-1",
  KeyK: "R-1-2",
  KeyL: "R-1-3",
  KeyM: "R-2-1",
  KeyN: "R-2-0",
  KeyO: "R-0-3",
  KeyP: "R-0-4",
  KeyQ: "L-0-1",
  KeyR: "L-0-4",
  KeyS: "L-1-2",
  KeyT: "L-0-5",
  KeyU: "R-0-1",
  KeyV: "L-2-4",
  KeyW: "L-0-2",
  KeyX: "L-2-2",
  KeyY: "R-0-0",
  KeyZ: "L-2-1",
  MetaLeft: "LT-0",
  Period: "R-2-3",
  Quote: "R-1-5",
  Semicolon: "R-1-4",
  ShiftLeft: "L-2-0",
  ShiftRight: "R-2-5",
  Slash: "R-2-4",
  Space: "LT-2",
  Tab: "L-0-0",
} as const satisfies Record<string, KeyId>

export type PhysicalCode = keyof typeof PHYSICAL_KEY_MAP

/**
 * Corne key for a `KeyboardEvent.code`, or null when the code has no spot on
 * the board. `code` is `string` because it arrives from a DOM event.
 */
export function keyForCode(code: string): KeyId | null {
  return Object.hasOwn(PHYSICAL_KEY_MAP, code)
    ? PHYSICAL_KEY_MAP[code as PhysicalCode]
    : null
}

/** Physical Shift keys feed the legend preview (shifted faces while held). */
export function isPhysicalShift(code: string): boolean {
  return code === "ShiftLeft" || code === "ShiftRight"
}
