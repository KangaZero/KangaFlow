// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The on-screen Corne keyboard's behaviour as a pure state machine: layer
// resolution (momentary hold / tap-to-lock / both = Adjust), the one-shot Shift
// (double-tap = caps) and one-shot Ctrl, chord detection, and token → edit
// action. `step` takes the current state plus one event and returns the next
// state and the edit actions to perform; the widget applies those to the text
// target. No React, no DOM, no clock: time arrives on the event.

import {
  CORNE_KEYS,
  capsOf,
  isCharToken,
  isFnToken,
  type KeyId,
  type KeyToken,
  keyById,
  type LayerId,
  type LayerKey,
  type PrintableChar,
  shiftOf,
  tokenAt,
} from "@/lib/corne-layout"

// Timing (ms). A press shorter than TAP_MS with nothing else pressed meanwhile
// is a tap; two Shift taps within DOUBLE_TAP_MS engage caps.
export const TAP_MS = 230
export const DOUBLE_TAP_MS = 380
export const REPEAT_DELAY_MS = 420
export const REPEAT_RATE_MS = 55

export const SHIFT_MODES = ["off", "oneshot", "caps"] as const
export type ShiftMode = (typeof SHIFT_MODES)[number]

type DownKey = {
  token: KeyToken
  at: number
  // Another key went down while this one was held — so it is a hold, not a tap.
  chorded: boolean
}

export type EngineState = {
  held: readonly LayerKey[]
  locked: LayerId | null
  shiftMode: ShiftMode
  lastShiftTapAt: number | null
  shiftHeld: number
  ctrlOneShot: boolean
  ctrlHeld: number
  physicalShift: boolean
  down: ReadonlyMap<KeyId, DownKey>
}

export const INITIAL_ENGINE_STATE: EngineState = {
  ctrlHeld: 0,
  ctrlOneShot: false,
  down: new Map(),
  held: [],
  lastShiftTapAt: null,
  locked: null,
  physicalShift: false,
  shiftHeld: 0,
  shiftMode: "off",
}

// Where an arrow / Home / End moves the caret. PgUp/PgDn jump to the start/end
// of the whole text (a text field has no "page").
export const CARET_MOVES = [
  "left",
  "right",
  "up",
  "down",
  "lineStart",
  "lineEnd",
  "docStart",
  "docEnd",
] as const
export type CaretMove = (typeof CARET_MOVES)[number]

export type EditAction =
  | { type: "insert"; text: string }
  | { type: "deleteBackward" }
  | { type: "deleteForward" }
  | { type: "deleteWordBackward" }
  | { type: "move"; move: CaretMove }
  | { type: "enter" }
  | { type: "tab" }
  | { type: "escape" }
  // Ctrl + a character key: select-all in a text field, a control code in a
  // terminal (Ctrl+C → ETX, …).
  | { type: "ctrl"; char: PrintableChar }

export type EngineEvent =
  | { type: "press"; key: KeyId; at: number }
  | { type: "release"; key: KeyId; at: number }
  // Re-fire a held repeatable key (Backspace, arrows) — driven by a timer.
  | { type: "repeat"; key: KeyId }
  // Header tab fallback: lock a layer (base unlocks).
  | { type: "selectLayer"; layer: LayerId }
  | { type: "physicalShift"; down: boolean }
  // Closing the widget: drop every held key and transient modifier.
  | { type: "reset" }

export type StepResult = {
  state: EngineState
  actions: readonly EditAction[]
  // The pressed key should auto-repeat while held.
  repeat: boolean
}

const REPEATABLE: ReadonlySet<KeyToken> = new Set([
  "Bksp",
  "WBksp",
  "Del",
  "Left",
  "Right",
  "Up",
  "Down",
])

const MOVE_FOR: Partial<Record<KeyToken, CaretMove>> = {
  Down: "down",
  End: "lineEnd",
  Home: "lineStart",
  Left: "left",
  PgDn: "docEnd",
  PgUp: "docStart",
  Right: "right",
  Up: "up",
}

const LAYER_KEY_FOR: Partial<Record<KeyToken, LayerKey>> = {
  Lower: "lower",
  Raise: "raise",
}

// ── Derived state ───────────────────────────────────────────────────────────

/**
 * The layer the keys currently show. A held or locked Lower/Raise picks its
 * layer; both at once (held or locked, in any mix) is Adjust.
 */
export function resolveLayer(
  held: readonly LayerKey[],
  locked: LayerId | null
): LayerId {
  if (locked === "adjust") return "adjust"
  const lower = held.includes("lower") || locked === "lower"
  const raise = held.includes("raise") || locked === "raise"
  if (lower && raise) return "adjust"
  if (lower) return "lower"
  if (raise) return "raise"
  return "base"
}

export function activeLayer(state: EngineState): LayerId {
  return resolveLayer(state.held, state.locked)
}

/** Shift is in effect for the NEXT character (held, physical, one-shot). */
export function isShiftActive(state: EngineState): boolean {
  return (
    state.shiftHeld > 0 || state.physicalShift || state.shiftMode === "oneshot"
  )
}

export function isCtrlActive(state: EngineState): boolean {
  return state.ctrlHeld > 0 || state.ctrlOneShot
}

/** Whether a layer key reads as engaged (held, locked, or under Adjust). */
export function isLayerKeyEngaged(state: EngineState, key: LayerKey): boolean {
  return (
    state.held.includes(key) ||
    state.locked === key ||
    state.locked === "adjust"
  )
}

/** The face a character key shows / types under the current modifiers. */
export function applyShift(
  state: EngineState,
  char: PrintableChar
): PrintableChar {
  if (isShiftActive(state)) return shiftOf(char)
  if (state.shiftMode === "caps") return capsOf(char)
  return char
}

// ── Pure transitions ────────────────────────────────────────────────────────

/** A release counts as a tap when it was quick and nothing chorded with it. */
export function isTap(
  down: { at: number; chorded: boolean },
  at: number
): boolean {
  return !down.chorded && at - down.at < TAP_MS
}

/** Tapping a layer key toggles its lock (tapping the locked one unlocks). */
export function lockAfterTap(
  locked: LayerId | null,
  key: LayerKey
): LayerId | null {
  return locked === key ? null : key
}

/**
 * Shift tap: off → one-shot; one-shot → caps when the second tap lands within
 * DOUBLE_TAP_MS, otherwise back off; caps → off.
 */
export function shiftAfterTap(
  mode: ShiftMode,
  lastTapAt: number | null,
  at: number
): ShiftMode {
  switch (mode) {
    case "off":
      return "oneshot"
    case "oneshot":
      return lastTapAt !== null && at - lastTapAt < DOUBLE_TAP_MS
        ? "caps"
        : "off"
    case "caps":
      return "off"
  }
}

/** A typed key spends a pending one-shot Shift; caps survives. */
export function shiftAfterUse(mode: ShiftMode): ShiftMode {
  return mode === "oneshot" ? "off" : mode
}

/** The edit a non-modifier token performs under the current modifiers. */
export function actionFor(
  state: EngineState,
  token: KeyToken
): EditAction | null {
  if (isCharToken(token)) {
    if (isCtrlActive(state)) return { char: token, type: "ctrl" }
    return { text: applyShift(state, token), type: "insert" }
  }
  const move = MOVE_FOR[token]
  if (move !== undefined) return { move, type: "move" }
  switch (token) {
    case "Bksp":
      return isCtrlActive(state)
        ? { type: "deleteWordBackward" }
        : { type: "deleteBackward" }
    case "WBksp":
      return { type: "deleteWordBackward" }
    case "Del":
      return { type: "deleteForward" }
    case "Space":
      return { text: " ", type: "insert" }
    case "Enter":
      return { type: "enter" }
    case "Tab":
      return { type: "tab" }
    case "Esc":
      return { type: "escape" }
    default:
      // Gui / Alt / F-keys / NOOP have nothing to do inside a text field.
      return null
  }
}

/** Inert tokens light up when pressed but never edit (Gui, Alt, F-keys, NOOP). */
export function isInertToken(token: KeyToken): boolean {
  return (
    token === "Gui" || token === "Alt" || token === "NOOP" || isFnToken(token)
  )
}

function withDown(
  down: ReadonlyMap<KeyId, DownKey>,
  key: KeyId,
  entry: DownKey | null
): ReadonlyMap<KeyId, DownKey> {
  const next = new Map<KeyId, DownKey>()
  // Anything already held when another key lands is part of a chord.
  for (const [id, value] of down) {
    next.set(id, entry === null ? value : { ...value, chorded: true })
  }
  if (entry === null) next.delete(key)
  else next.set(key, entry)
  return next
}

const NO_CHANGE = (state: EngineState): StepResult => ({
  actions: [],
  repeat: false,
  state,
})

function press(state: EngineState, key: KeyId, at: number): StepResult {
  const corneKey = keyById(key)
  if (
    corneKey === undefined ||
    corneKey.kind === "ext" ||
    state.down.has(key)
  ) {
    return NO_CHANGE(state)
  }
  const token = tokenAt(activeLayer(state), corneKey)
  const down = withDown(state.down, key, { at, chorded: false, token })
  const layerKey = LAYER_KEY_FOR[token]
  if (layerKey !== undefined) {
    return {
      actions: [],
      repeat: false,
      state: { ...state, down, held: [...state.held, layerKey] },
    }
  }
  if (token === "Shift") {
    return {
      actions: [],
      repeat: false,
      state: { ...state, down, shiftHeld: state.shiftHeld + 1 },
    }
  }
  if (token === "Ctrl") {
    return {
      actions: [],
      repeat: false,
      state: { ...state, ctrlHeld: state.ctrlHeld + 1, down },
    }
  }
  const action = actionFor(state, token)
  if (action === null) {
    return { actions: [], repeat: false, state: { ...state, down } }
  }
  return {
    actions: [action],
    repeat: REPEATABLE.has(token),
    // Any real keystroke spends the pending one-shots.
    state: {
      ...state,
      ctrlOneShot: false,
      down,
      shiftMode: shiftAfterUse(state.shiftMode),
    },
  }
}

function release(state: EngineState, key: KeyId, at: number): StepResult {
  const entry = state.down.get(key)
  if (entry === undefined) return NO_CHANGE(state)
  const down = withDown(state.down, key, null)
  const tap = isTap(entry, at)
  const layerKey = LAYER_KEY_FOR[entry.token]
  if (layerKey !== undefined) {
    return NO_CHANGE({
      ...state,
      down,
      held: state.held.filter((held) => held !== layerKey),
      locked: tap ? lockAfterTap(state.locked, layerKey) : state.locked,
    })
  }
  if (entry.token === "Shift") {
    return NO_CHANGE({
      ...state,
      down,
      lastShiftTapAt: tap ? at : state.lastShiftTapAt,
      shiftHeld: Math.max(0, state.shiftHeld - 1),
      shiftMode: tap
        ? shiftAfterTap(state.shiftMode, state.lastShiftTapAt, at)
        : state.shiftMode,
    })
  }
  if (entry.token === "Ctrl") {
    return NO_CHANGE({
      ...state,
      ctrlHeld: Math.max(0, state.ctrlHeld - 1),
      ctrlOneShot: tap ? !state.ctrlOneShot : state.ctrlOneShot,
      down,
    })
  }
  return NO_CHANGE({ ...state, down })
}

function repeat(state: EngineState, key: KeyId): StepResult {
  const entry = state.down.get(key)
  if (entry === undefined || !REPEATABLE.has(entry.token))
    return NO_CHANGE(state)
  const action = actionFor(state, entry.token)
  return { actions: action ? [action] : [], repeat: true, state }
}

/** Advance the keyboard by one event. */
export function step(state: EngineState, event: EngineEvent): StepResult {
  switch (event.type) {
    case "press":
      return press(state, event.key, event.at)
    case "release":
      return release(state, event.key, event.at)
    case "repeat":
      return repeat(state, event.key)
    case "selectLayer":
      return NO_CHANGE({
        ...state,
        locked: event.layer === "base" ? null : event.layer,
      })
    case "physicalShift":
      return NO_CHANGE({ ...state, physicalShift: event.down })
    case "reset":
      return NO_CHANGE({
        ...INITIAL_ENGINE_STATE,
        locked: state.locked,
        shiftMode: state.shiftMode === "caps" ? "caps" : "off",
      })
  }
}

// ── Keyboard navigation between keys (roving tabindex) ──────────────────────

export const NAV_DIRECTIONS = ["left", "right", "up", "down"] as const
export type NavDirection = (typeof NAV_DIRECTIONS)[number]

const NAV_VECTOR: Record<NavDirection, readonly [number, number]> = {
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
  up: [0, -1],
}

// The right half sits this far (in u) from the left half's origin when laying
// both halves on one plane for navigation.
const RIGHT_HALF_OFFSET_U = 7.5

function centreOf(id: KeyId): readonly [number, number] | null {
  const key = keyById(id)
  if (key === undefined) return null
  const originX = key.half === "R" ? RIGHT_HALF_OFFSET_U : 0
  return [originX + key.x + 0.5, key.y + key.h / 2]
}

/**
 * The nearest key from `from` in `direction`: it must lie ahead along the axis,
 * and sideways drift costs 2.5× forward distance. Extension keys join only when
 * they are shown. Returns null at the edge of the board.
 */
export function nearestKey(
  from: KeyId,
  direction: NavDirection,
  includeExt: boolean
): KeyId | null {
  const origin = centreOf(from)
  if (origin === null) return null
  const [vx, vy] = NAV_VECTOR[direction]
  let best: KeyId | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const key of CORNE_KEYS) {
    if (key.id === from || (key.kind === "ext" && !includeExt)) continue
    const centre = centreOf(key.id)
    if (centre === null) continue
    const dx = centre[0] - origin[0]
    const dy = centre[1] - origin[1]
    const along = dx * vx + dy * vy
    if (along <= 0.1) continue
    const across = Math.abs(dx * vy) + Math.abs(dy * vx)
    const score = along + across * 2.5
    if (score < bestScore) {
      bestScore = score
      best = key.id
    }
  }
  return best
}
