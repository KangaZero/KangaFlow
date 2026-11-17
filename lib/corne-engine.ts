// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The on-screen Corne keyboard's behaviour as a pure state machine: layer
// resolution (Vial tri-layer: Lower + Raise = Adjust, MO(3) = Adjust directly;
// held = momentary, tapped = lock), hold-tap keys (the keymap's tap dances),
// the one-shot Shift (double-tap = caps) and one-shot Ctrl, chord detection,
// and token → edit action. `step` takes the current state plus one event and
// returns the next state and the edit actions to perform; the widget applies
// those to the text target. No React, no DOM, no clock: time arrives on the
// event.

import {
  actionOf,
  type Binding,
  bindingAt,
  CORNE_KEYS,
  type CorneKey,
  capsOf,
  holdOf,
  isInertBinding,
  type KeyAction,
  type KeyId,
  type KeyToken,
  keyById,
  type LayerId,
  type LayerKey,
  type NamedKey,
  type PrintableChar,
  shiftOf,
  TAPPING_TERM_MS,
  tapOf,
} from "@/lib/corne-layout"

// Timing (ms). Two Shift taps within DOUBLE_TAP_MS engage caps. Tap vs hold
// uses the keymap's TAPPING_TERM_MS.
export const DOUBLE_TAP_MS = 380
export const REPEAT_DELAY_MS = 420
export const REPEAT_RATE_MS = 55

export const SHIFT_MODES = ["off", "oneshot", "caps"] as const
export type ShiftMode = (typeof SHIFT_MODES)[number]

type DownKey = {
  binding: Binding
  at: number
  // Another key went down while this one was held — so it is a hold, not a tap.
  chorded: boolean
  // The token acting while the key is down; null while a hold-tap has not yet
  // decided between its tap and its hold.
  active: KeyToken | null
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
  // A hold-tap pressed at `pressedAt` is still down after the tapping term —
  // driven by a timer. Stale timers (the key was released) are ignored.
  | { type: "holdTimeout"; key: KeyId; pressedAt: number }
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

const REPEATABLE: ReadonlySet<NamedKey> = new Set([
  "Bksp",
  "Left",
  "Right",
  "Up",
  "Down",
])

const MOVE_FOR: Partial<Record<NamedKey, CaretMove>> = {
  Down: "down",
  Left: "left",
  PgDn: "docEnd",
  PgUp: "docStart",
  Right: "right",
  Up: "up",
}

// ── Derived state ───────────────────────────────────────────────────────────

/**
 * The layer the keys currently show. Adjust wins when its own key is held or
 * locked, or when Lower and Raise are both on (held or locked, in any mix).
 */
export function resolveLayer(
  held: readonly LayerKey[],
  locked: LayerId | null
): LayerId {
  if (held.includes("adjust") || locked === "adjust") return "adjust"
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

/** Whether a layer key reads as engaged (held, locked, or Adjust is showing). */
export function isLayerKeyEngaged(state: EngineState, key: LayerKey): boolean {
  if (state.held.includes(key) || state.locked === key) return true
  return key === "adjust" && activeLayer(state) === "adjust"
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

/** A hold-tap on `key` is down and has not decided yet (the hook times it). */
export function isHoldPending(state: EngineState, key: KeyId): boolean {
  return state.down.get(key)?.active === null
}

// ── Pure transitions ────────────────────────────────────────────────────────

/** A release counts as a tap when it was quick and nothing chorded with it. */
export function isTap(
  down: { at: number; chorded: boolean },
  at: number
): boolean {
  return !down.chorded && at - down.at < TAPPING_TERM_MS
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

type EditKeyAction = Extract<KeyAction, { kind: "char" | "named" }>

/** The edit a character or named key performs under the current modifiers. */
export function editFor(state: EngineState, action: EditKeyAction): EditAction {
  if (action.kind === "char") {
    if (isCtrlActive(state)) return { char: action.char, type: "ctrl" }
    return { text: applyShift(state, action.char), type: "insert" }
  }
  const move = MOVE_FOR[action.key]
  if (move !== undefined) return { move, type: "move" }
  switch (action.key) {
    case "Bksp":
      return isCtrlActive(state)
        ? { type: "deleteWordBackward" }
        : { type: "deleteBackward" }
    case "Space":
      return { text: " ", type: "insert" }
    case "Enter":
      return { type: "enter" }
    case "Tab":
      return { type: "tab" }
    default:
      return { type: "escape" }
  }
}

const result = (
  state: EngineState,
  actions: readonly EditAction[] = [],
  repeat = false
): StepResult => ({ actions, repeat, state })

/** A token starts acting: a layer / modifier engages, an edit key fires. */
function engage(state: EngineState, token: KeyToken): StepResult {
  const action = actionOf(token)
  switch (action.kind) {
    case "layer":
      return result({ ...state, held: [...state.held, action.layer] })
    case "mod":
      return action.mod === "Shift"
        ? result({ ...state, shiftHeld: state.shiftHeld + 1 })
        : result({ ...state, ctrlHeld: state.ctrlHeld + 1 })
    case "inert":
    case "none":
      return result(state)
    case "char":
    case "named":
      return result(
        // Any real keystroke spends the pending one-shots.
        {
          ...state,
          ctrlOneShot: false,
          shiftMode: shiftAfterUse(state.shiftMode),
        },
        [editFor(state, action)],
        action.kind === "named" && REPEATABLE.has(action.key)
      )
  }
}

/** A token stops acting; a quick tap of a layer / modifier latches it. */
function disengage(
  state: EngineState,
  token: KeyToken,
  tap: boolean,
  at: number
): EngineState {
  const action = actionOf(token)
  if (action.kind === "layer") {
    return {
      ...state,
      held: state.held.filter((held) => held !== action.layer),
      locked: tap ? lockAfterTap(state.locked, action.layer) : state.locked,
    }
  }
  if (action.kind !== "mod") return state
  if (action.mod === "Shift") {
    return {
      ...state,
      lastShiftTapAt: tap ? at : state.lastShiftTapAt,
      shiftHeld: Math.max(0, state.shiftHeld - 1),
      shiftMode: tap
        ? shiftAfterTap(state.shiftMode, state.lastShiftTapAt, at)
        : state.shiftMode,
    }
  }
  return {
    ...state,
    ctrlHeld: Math.max(0, state.ctrlHeld - 1),
    ctrlOneShot: tap ? !state.ctrlOneShot : state.ctrlOneShot,
  }
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

function withActive(
  down: ReadonlyMap<KeyId, DownKey>,
  key: KeyId,
  active: KeyToken
): ReadonlyMap<KeyId, DownKey> {
  const entry = down.get(key)
  if (entry === undefined) return down
  return new Map(down).set(key, { ...entry, active })
}

/**
 * Another key landing decides every undecided hold-tap: a modifier hold
 * (space → Ctrl) becomes the hold, so "hold space + c" is Ctrl+C; any other
 * hold-tap fires its tap at once, so fast rolls ("q" then "u") keep order.
 */
function settlePending(state: EngineState): StepResult {
  let next = state
  const actions: EditAction[] = []
  for (const [id, entry] of state.down) {
    const hold = holdOf(entry.binding)
    if (entry.active !== null || hold === null) continue
    const token = actionOf(hold).kind === "mod" ? hold : tapOf(entry.binding)
    const engaged = engage(next, token)
    actions.push(...engaged.actions)
    next = { ...engaged.state, down: withActive(next.down, id, token) }
  }
  return result(next, actions)
}

function press(state: EngineState, key: KeyId, at: number): StepResult {
  const corneKey = keyById(key)
  if (corneKey === undefined || state.down.has(key)) return result(state)
  if (isInertBinding(bindingAt(activeLayer(state), corneKey))) {
    return result(state)
  }
  const settled = settlePending(state)
  const binding = bindingAt(activeLayer(settled.state), corneKey)
  if (holdOf(binding) !== null) {
    // Undecided until release, the tapping term, or another key press.
    const down = withDown(settled.state.down, key, {
      active: null,
      at,
      binding,
      chorded: false,
    })
    return result({ ...settled.state, down }, settled.actions)
  }
  const token = tapOf(binding)
  const engaged = engage(settled.state, token)
  const down = withDown(engaged.state.down, key, {
    active: token,
    at,
    binding,
    chorded: false,
  })
  return result(
    { ...engaged.state, down },
    [...settled.actions, ...engaged.actions],
    engaged.repeat
  )
}

function release(state: EngineState, key: KeyId, at: number): StepResult {
  const entry = state.down.get(key)
  if (entry === undefined) return result(state)
  const down = withDown(state.down, key, null)
  if (entry.active !== null) {
    return result(
      disengage({ ...state, down }, entry.active, isTap(entry, at), at)
    )
  }
  // A hold-tap decided by its own release: quick = tap, past the term = hold.
  const tap = tapOf(entry.binding)
  const quick = at - entry.at < TAPPING_TERM_MS
  const token = quick ? tap : (holdOf(entry.binding) ?? tap)
  const engaged = engage({ ...state, down }, token)
  return result(disengage(engaged.state, token, quick, at), engaged.actions)
}

function holdTimeout(
  state: EngineState,
  key: KeyId,
  pressedAt: number
): StepResult {
  const entry = state.down.get(key)
  const hold = entry === undefined ? null : holdOf(entry.binding)
  if (entry?.active !== null || entry.at !== pressedAt || hold === null) {
    return result(state)
  }
  const engaged = engage(state, hold)
  return result(
    { ...engaged.state, down: withActive(engaged.state.down, key, hold) },
    engaged.actions,
    engaged.repeat
  )
}

function repeat(state: EngineState, key: KeyId): StepResult {
  const active = state.down.get(key)?.active
  if (active === undefined || active === null) return result(state)
  const action = actionOf(active)
  if (action.kind !== "named" || !REPEATABLE.has(action.key)) {
    return result(state)
  }
  return result(state, [editFor(state, action)], true)
}

/** Advance the keyboard by one event. */
export function step(state: EngineState, event: EngineEvent): StepResult {
  switch (event.type) {
    case "press":
      return press(state, event.key, event.at)
    case "release":
      return release(state, event.key, event.at)
    case "holdTimeout":
      return holdTimeout(state, event.key, event.pressedAt)
    case "repeat":
      return repeat(state, event.key)
    case "selectLayer":
      return result({
        ...state,
        locked: event.layer === "base" ? null : event.layer,
      })
    case "physicalShift":
      return result({ ...state, physicalShift: event.down })
    case "reset":
      return result({
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
 * and sideways drift costs 2.5× forward distance. Only keys `canFocus` accepts
 * are candidates (the widget skips hidden extension keys and inert keys).
 * Returns null at the edge of the board.
 */
export function nearestKey(
  from: KeyId,
  direction: NavDirection,
  canFocus: (key: CorneKey) => boolean
): KeyId | null {
  const origin = centreOf(from)
  if (origin === null) return null
  const [vx, vy] = NAV_VECTOR[direction]
  let best: KeyId | null = null
  let bestScore = Number.POSITIVE_INFINITY
  for (const key of CORNE_KEYS) {
    if (key.id === from || !canFocus(key)) continue
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
