// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Corne v4 (crkbd) × Colemak Mod-DH: the ONE source of truth for the on-screen
// keyboard widget. The owner's real Vial keymap (layers, tap dances, thumbs,
// extension keys), the key geometry, and the physical-key lookup all live
// here; the engine, the caret helper and the UI derive from it. Pure data +
// pure lookups (no React/DOM).
//
// Hand-encoded from the owner's Vial export (`cole.vil`, vial_protocol 6).
// Vial stores `layout[layer]` as 8 rows × 7 cols: rows 0–3 = left half
// (col 0 = outer pinky … col 5 = inner, col 6 = v4 extension key), rows 4–7 =
// right half mirrored (col 0 = outer pinky … col 5 = inner, col 6 = extension).
// Thumb rows 3 / 7 use cols 3–5, col 5 being the inner (big) thumb. The tables
// below are written in SCREEN order instead: left half outer→inner, right half
// inner→outer, so each row reads left-to-right as it appears on the board.
//
// Vial layers 0–3 map to base / lower / raise / adjust. Layer 4 (a QWERTY
// layer with TG(0)) is not reachable from layer 0 in this keymap and layer 5
// is all KC_TRNS, so neither is shown. KC_TRNS cells are written out as the
// key they fall through to (only the held layer thumbs use it).

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
// Every keymap cell is one token. Each family is listed once; the token union,
// the type guards and the typed `KeyAction` are all derived from these lists.
// Non-character legends and aria-labels live in i18n under
// `widgets.keyboard.keys.<token>` (a missing translation is a type error).

// Keys with a text-field meaning (typed or caret/edit actions).
export const NAMED_KEYS = [
  "Tab",
  "Bksp",
  "Enter",
  "Space",
  "Esc",
  "Up",
  "Down",
  "Left",
  "Right",
  "PgUp",
  "PgDn",
] as const
export type NamedKey = (typeof NAMED_KEYS)[number]

// Modifiers the on-screen keyboard acts on (one-shot / held).
export const MODIFIERS = ["Ctrl", "Shift"] as const
export type Modifier = (typeof MODIFIERS)[number]

// FN_MO13 = Lower, FN_MO23 = Raise (Vial tri-layer: both held = Adjust),
// MO(3) = Adjust directly.
export const LAYER_TOKENS = ["Lower", "Raise", "Adjust"] as const
export type LayerToken = (typeof LAYER_TOKENS)[number]

// Display-only keys: real on the hardware, meaningless inside a web text field
// (OS modifiers, firmware toggles, mouse keys, media, browser navigation).
export const INERT_KEYS = [
  "Gui",
  "Alt",
  "Caps",
  "PrtSc",
  "RgbTog",
  "MsUp",
  "MsDown",
  "MsLeft",
  "MsRight",
  "WhUp",
  "WhDown",
  "WhLeft",
  "WhRight",
  "Btn1",
  "Btn2",
  "Btn3",
  "Mute",
  "VolUp",
  "VolDown",
  "Play",
  "Stop",
  "Next",
  "Prev",
  "WBack",
  "WFwd",
] as const
export type InertKey = (typeof INERT_KEYS)[number]

// Function keys are display-only too, but their legend is the token itself.
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

// KC_NO: an unbound key (rendered as a blank keycap).
export const NONE = "None"
export type NoneToken = typeof NONE

export type KeyToken =
  | PrintableChar
  | NamedKey
  | Modifier
  | LayerToken
  | InertKey
  | FnToken
  | NoneToken

// Tokens whose legend / aria-label come from `widgets.keyboard.keys.<token>`.
export type LegendToken = Exclude<KeyToken, PrintableChar | FnToken>

const includes = <T extends string>(list: readonly T[], token: string) =>
  (list as readonly string[]).includes(token)

export function isFnToken(token: KeyToken): token is FnToken {
  return includes(FN_TOKENS, token)
}

function isNamedKey(token: KeyToken): token is NamedKey {
  return includes(NAMED_KEYS, token)
}

function isModifier(token: KeyToken): token is Modifier {
  return includes(MODIFIERS, token)
}

function isLayerToken(token: KeyToken): token is LayerToken {
  return includes(LAYER_TOKENS, token)
}

function isInertKey(token: KeyToken): token is InertKey {
  return includes(INERT_KEYS, token)
}

export function isLegendToken(token: KeyToken): token is LegendToken {
  return token === NONE || !(isCharToken(token) || isFnToken(token))
}

export function isCharToken(token: KeyToken): token is PrintableChar {
  return !(
    token === NONE ||
    isNamedKey(token) ||
    isModifier(token) ||
    isLayerToken(token) ||
    isInertKey(token) ||
    isFnToken(token)
  )
}

// ── Typed key actions ───────────────────────────────────────────────────────

export const LAYER_IDS = ["base", "lower", "raise", "adjust"] as const
export type LayerId = (typeof LAYER_IDS)[number]

// The momentary layer keys, by the layer each one holds.
export const LAYER_KEYS = ["lower", "raise", "adjust"] as const
export type LayerKey = (typeof LAYER_KEYS)[number]

const LAYER_KEY_OF = {
  Adjust: "adjust",
  Lower: "lower",
  Raise: "raise",
} as const satisfies Record<LayerToken, LayerKey>

export type KeyAction =
  | { kind: "char"; char: PrintableChar }
  | { kind: "named"; key: NamedKey }
  | { kind: "mod"; mod: Modifier }
  | { kind: "layer"; layer: LayerKey }
  // Shown on the board, does nothing on a web keyboard.
  | { kind: "inert"; token: InertKey | FnToken }
  | { kind: "none" }

/** What a token does, as a discriminated union the engine can switch over. */
export function actionOf(token: KeyToken): KeyAction {
  if (token === NONE) return { kind: "none" }
  if (isNamedKey(token)) return { key: token, kind: "named" }
  if (isModifier(token)) return { kind: "mod", mod: token }
  if (isLayerToken(token)) return { kind: "layer", layer: LAYER_KEY_OF[token] }
  if (isInertKey(token) || isFnToken(token)) return { kind: "inert", token }
  return { char: token, kind: "char" }
}

/** Inert and unbound keys never act. */
export function isInertToken(token: KeyToken): boolean {
  const { kind } = actionOf(token)
  return kind === "inert" || kind === "none"
}

// ── Hold-taps (Vial tap dances) ─────────────────────────────────────────────

// A key that does one thing when tapped and another when held past the
// tapping term.
export type HoldTap = { readonly tap: KeyToken; readonly hold: KeyToken }
export type Binding = KeyToken | HoldTap

// Every tap dance in the keymap uses a 200 ms term (also QMK setting 7).
export const TAPPING_TERM_MS = 200

// Vial tap_dance entries are [on_tap, on_hold, on_double_tap, on_tap_hold,
// term]. Only tap and hold are modelled: TD0's tap-hold is macro M0
// (Ctrl+Alt+Tab, an OS window switcher) and TD1's tap-hold repeats Space; no
// entry uses double tap except TD3. TD3 is LShift on tap / hold / double tap
// (RGUI on tap-hold), so it is encoded as a plain Shift.
const TD = {
  q: { hold: "Esc", tap: "q" }, // TD(0)
  semicolon: { hold: "Bksp", tap: ";" }, // TD(2)
  slash: { hold: "Enter", tap: "/" }, // TD(4)
  space: { hold: "Ctrl", tap: "Space" }, // TD(1)
} as const satisfies Record<string, HoldTap>

function isHoldTap(binding: Binding): binding is HoldTap {
  return typeof binding === "object"
}

export function tapOf(binding: Binding): KeyToken {
  return isHoldTap(binding) ? binding.tap : binding
}

export function holdOf(binding: Binding): KeyToken | null {
  return isHoldTap(binding) ? binding.hold : null
}

/** A binding is inert when neither its tap nor its hold can act. */
export function isInertBinding(binding: Binding): boolean {
  const hold = holdOf(binding)
  return isInertToken(tapOf(binding)) && (hold === null || isInertToken(hold))
}

// ── Layers ──────────────────────────────────────────────────────────────────

export const HALVES = ["L", "R"] as const
export type Half = (typeof HALVES)[number]

type Row6 = readonly [Binding, Binding, Binding, Binding, Binding, Binding]
type HalfRows = readonly [Row6, Row6, Row6]
type Thumbs = readonly [Binding, Binding, Binding]
// Extension keys, top row first.
type Ext = readonly [Binding, Binding]
type LayerDef = {
  L: HalfRows
  R: HalfRows
  // L outer→inner, R inner→outer (screen order, like the rows).
  thumbs: Record<Half, Thumbs>
  ext: Record<Half, Ext>
}

// All four v4 extension keys are KC_NO on layers 0–3.
const EXT_UNBOUND = {
  L: [NONE, NONE],
  R: [NONE, NONE],
} as const satisfies Record<Half, Ext>

export const LAYERS = {
  // Vial layer 3 — mouse keys, media, arrows, browser navigation.
  adjust: {
    ext: EXT_UNBOUND,
    L: [
      [NONE, "RgbTog", "MsUp", "Mute", "VolDown", "VolUp"],
      ["Gui", "MsLeft", "MsDown", "MsRight", "WhLeft", "WhRight"],
      [NONE, "PrtSc", "WBack", "WFwd", "WhUp", "WhDown"],
    ],
    R: [
      ["Enter", "Btn1", "Up", "Btn2", "Bksp", NONE],
      ["Btn3", "Left", "Down", "Right", "Gui", NONE],
      ["Prev", "Stop", "Play", "Next", NONE, NONE],
    ],
    thumbs: {
      L: ["Alt", "Lower", TD.space],
      R: ["Adjust", "Raise", "Shift"],
    },
  },
  // Vial layer 0 — Colemak Mod-DH.
  base: {
    ext: EXT_UNBOUND,
    L: [
      ["Esc", TD.q, "w", "f", "p", "b"],
      ["Gui", "a", "r", "s", "t", "g"],
      ["Ctrl", "z", "x", "c", "d", "v"],
    ],
    R: [
      ["j", "l", "u", "y", TD.semicolon, NONE],
      ["m", "n", "e", "i", "o", NONE],
      ["k", "h", ",", ".", TD.slash, NONE],
    ],
    thumbs: {
      L: ["Alt", "Lower", TD.space],
      R: ["Adjust", "Raise", "Shift"],
    },
  },
  // Vial layer 1 — numbers and function keys.
  lower: {
    ext: EXT_UNBOUND,
    L: [
      ["Esc", "1", "2", "3", "4", "5"],
      ["Gui", "6", "7", "8", "9", "0"],
      [NONE, "F1", "F2", "F3", "F4", "F5"],
    ],
    R: [
      ["6", "7", "8", "9", "0", NONE],
      ["F11", "F12", NONE, "PgUp", "PgDn", NONE],
      ["F6", "F7", "F8", "F9", "F10", NONE],
    ],
    thumbs: {
      L: ["Alt", "Lower", TD.space],
      R: ["Adjust", "Raise", "Shift"],
    },
  },
  // Vial layer 2 — symbols.
  raise: {
    ext: EXT_UNBOUND,
    L: [
      ["Esc", "!", "@", "#", "$", "%"],
      ["Gui", "Tab", NONE, NONE, "'", "`"],
      [NONE, "Caps", NONE, NONE, '"', "~"],
    ],
    R: [
      ["^", "&", "*", "(", ")", NONE],
      ["-", "=", "[", "]", "\\", NONE],
      ["_", "+", "{", "}", "|", NONE],
    ],
    thumbs: {
      L: ["Alt", "Lower", "Space"],
      R: ["Adjust", "Raise", "Shift"],
    },
  },
} as const satisfies Record<LayerId, LayerDef>

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

// v4 extension keys: matrix col 6, rows 0–1 of each half (from the keymap),
// i.e. the innermost column, top two rows. The exact physical offset is an
// approximation.
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

// ── Bindings per layer ──────────────────────────────────────────────────────

/** What a key is bound to on `layer`. */
export function bindingAt(layer: LayerId, key: CorneKey): Binding {
  const def = LAYERS[layer]
  switch (key.kind) {
    case "ext":
      return def.ext[key.half][key.index]
    case "thumb":
      return def.thumbs[key.half][key.index]
    case "matrix":
      return def[key.half][key.row][key.col]
  }
}

// ── Physical mirroring ──────────────────────────────────────────────────────
// Lights the Corne key for a physical key press (`KeyboardEvent.code`). Used
// only to LIGHT keys; real typing is never intercepted or remapped. Two modes,
// chosen by the "QWERTY mapping" setting:
//
// - QWERTY mapping ON (default): by POSITION. `code` names the key's spot on
//   a QWERTY board, so a visitor's laptop KeyE lights the Corne key in that
//   spot ("f" in Colemak-DH). Teaches where Colemak-DH puts each letter.
// - OFF: by LEGEND. The owner's Corne runs Colemak in firmware, so pressing
//   its "f" key already sends KeyF; KeyF must light the base "f" key.

// Physical QWERTY position → the Corne key in the same spot.
const QWERTY_POSITION_MAP = {
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

// `code` → the token that key produces with an OS QWERTY layout (letters come
// from `Key<X>`). Matched against the base layer for the legend mode.
const CODE_TOKEN = {
  AltLeft: "Alt",
  AltRight: "Alt",
  Backquote: "`",
  Backslash: "\\",
  Backspace: "Bksp",
  BracketLeft: "[",
  BracketRight: "]",
  Comma: ",",
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl",
  Digit0: "0",
  Digit1: "1",
  Digit2: "2",
  Digit3: "3",
  Digit4: "4",
  Digit5: "5",
  Digit6: "6",
  Digit7: "7",
  Digit8: "8",
  Digit9: "9",
  Enter: "Enter",
  Equal: "=",
  Escape: "Esc",
  MetaLeft: "Gui",
  MetaRight: "Gui",
  Minus: "-",
  Period: ".",
  Quote: "'",
  Semicolon: ";",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  Slash: "/",
  Space: "Space",
  Tab: "Tab",
} as const satisfies Record<string, KeyToken>

// Token → base-layer key. Tap legends win over hold actions (Esc lights the
// Esc key, not q's hold); Enter / Backspace light the keys that hold them.
function buildLegendLookup(): ReadonlyMap<string, KeyId> {
  const lookup = new Map<string, KeyId>()
  const bindings = CORNE_KEYS.map(
    (key) => [key.id, bindingAt("base", key)] as const
  )
  const add = (token: KeyToken | null, id: KeyId): void => {
    if (token !== null && token !== NONE && !lookup.has(token)) {
      lookup.set(token, id)
    }
  }
  for (const [id, binding] of bindings) add(tapOf(binding), id)
  for (const [id, binding] of bindings) add(holdOf(binding), id)
  return lookup
}

const LEGEND_LOOKUP = buildLegendLookup()

const LETTER_CODE = /^Key([A-Z])$/

function tokenForCode(code: string): string | null {
  const letter = LETTER_CODE.exec(code)?.[1]
  if (letter !== undefined) return letter.toLowerCase()
  return Object.hasOwn(CODE_TOKEN, code)
    ? CODE_TOKEN[code as keyof typeof CODE_TOKEN]
    : null
}

/**
 * Corne key to light for a `KeyboardEvent.code`, or null when the code has no
 * key on the board (in that mode). `code` is `string` because it arrives from
 * a DOM event.
 */
export function keyForCode(code: string, qwertyMapping: boolean): KeyId | null {
  if (qwertyMapping) {
    return Object.hasOwn(QWERTY_POSITION_MAP, code)
      ? QWERTY_POSITION_MAP[code as keyof typeof QWERTY_POSITION_MAP]
      : null
  }
  const token = tokenForCode(code)
  return token === null ? null : (LEGEND_LOOKUP.get(token) ?? null)
}

/** Physical Shift keys feed the legend preview (shifted faces while held). */
export function isPhysicalShift(code: string): boolean {
  return code === "ShiftLeft" || code === "ShiftRight"
}
