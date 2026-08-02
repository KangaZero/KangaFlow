// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure modal (vim) editing model for a single-line native <input>/<textarea>.
// Browsers give no plugin seam on form fields, so we intercept keydown ourselves
// and drive the element's value + caret — but the *decision* of what a key does
// lives here as a pure reducer (no DOM), so it's trivially unit-tested. The hook
// (use-vim-input) supplies the live value/caret from the element each keystroke
// and applies the result; mode is the only state it must persist between events.
//
// Design: INSERT mode is mostly pass-through — the browser inserts text natively,
// we only catch Esc to leave. NORMAL mode is where we act: motions, x/D, and the
// d/c operators. Any unrecognised *printable* key in NORMAL is swallowed (so it
// can't type); control keys (Enter, ArrowUp/Down, Tab, Escape…) fall through to
// the host so a search box keeps its list-nav / submit / close behaviour.

export type VimMode = "normal" | "insert"

export type VimState = {
  mode: VimMode
  value: string
  cursor: number // caret index in [0, value.length]
  // A captured operator awaiting its motion ("d" or "c"); "" when none.
  pending: "" | "d" | "c"
}

export type VimResult = {
  value: string
  cursor: number
  mode: VimMode
  pending: "" | "d" | "c"
  // true → we owned this key (caller preventDefaults + stopPropagates).
  // false → we didn't; let the browser / host handler take it.
  handled: boolean
}

// The caret index a motion key lands on, or null if the key isn't a motion.
// Shared by plain motions and the d/c operators so both agree on "how far".
function motionTarget(
  value: string,
  cursor: number,
  key: string
): number | null {
  switch (key) {
    case "h":
    case "ArrowLeft":
      return Math.max(0, cursor - 1)
    case "l":
    case "ArrowRight":
      return Math.min(value.length, cursor + 1)
    case "0":
      return 0
    case "$":
      return value.length
    case "w":
      return wordBoundary(value, cursor, 1)
    case "b":
      return wordBoundary(value, cursor, -1)
    default:
      return null
  }
}

// Apply a captured operator (d/c) with its motion key. `dd`/`cc` (op key repeated)
// clear the whole line; a motion deletes the span between caret and target; `c`
// then drops into INSERT. A non-motion key cancels the pending operator.
function applyOperator(state: VimState, key: string): VimResult {
  const { value, cursor, pending } = state
  const finalMode: VimMode = pending === "c" ? "insert" : "normal"

  if (key === pending) {
    return { cursor: 0, handled: true, mode: finalMode, pending: "", value: "" }
  }

  const target = motionTarget(value, cursor, key)
  if (target === null) {
    // Not a motion → abandon the operator, stay put in NORMAL.
    return { cursor, handled: true, mode: "normal", pending: "", value }
  }

  const from = Math.min(cursor, target)
  const to = Math.max(cursor, target)
  return {
    cursor: from,
    handled: true,
    mode: finalMode,
    pending: "",
    value: value.slice(0, from) + value.slice(to),
  }
}

// Reduce one keydown into the next editing state. `key` is the raw
// KeyboardEvent.key (Shift already folded in: "I", "A", "$", "D"…).
export function vimReduce(state: VimState, key: string): VimResult {
  const { mode, value, cursor, pending } = state

  if (mode === "insert") {
    // Leave INSERT on Esc (vim nudges the caret one left); otherwise the browser
    // types the character for us.
    if (key === "Escape") {
      return {
        cursor: Math.max(0, cursor - 1),
        handled: true,
        mode: "normal",
        pending: "",
        value,
      }
    }
    return { cursor, handled: false, mode: "insert", pending: "", value }
  }

  // NORMAL mode. First, resolve a pending d/c operator.
  if (pending !== "") return applyOperator(state, key)

  // In NORMAL the caret sits *on* a character (block cursor), so it clamps to
  // the last index, not past the end — that off-by-one vs INSERT is deliberate
  // and matches vim. Operators still use motionTarget's exclusive end.
  const clampNormal = (n: number): number =>
    Math.max(0, Math.min(n, Math.max(0, value.length - 1)))
  const move = (next: number): VimResult => ({
    cursor: clampNormal(next),
    handled: true,
    mode: "normal",
    pending: "",
    value,
  })
  const insertAt = (next: number): VimResult => ({
    cursor: next,
    handled: true,
    mode: "insert",
    pending: "",
    value,
  })

  switch (key) {
    case "i":
      return insertAt(cursor)
    case "a":
      return insertAt(Math.min(value.length, cursor + 1))
    case "I":
      return insertAt(0)
    case "A":
      return insertAt(value.length)
    case "h":
    case "ArrowLeft":
      return move(Math.max(0, cursor - 1))
    case "l":
    case "ArrowRight":
      return move(Math.min(value.length, cursor + 1))
    case "0":
      return move(0)
    case "$":
      return move(value.length)
    case "w":
      return move(wordBoundary(value, cursor, 1))
    case "b":
      return move(wordBoundary(value, cursor, -1))
    case "x": {
      if (cursor >= value.length) return move(cursor)
      const next = value.slice(0, cursor) + value.slice(cursor + 1)
      // Deleting the last char pulls the block cursor back onto the new last one.
      return {
        cursor: Math.max(0, Math.min(cursor, next.length - 1)),
        handled: true,
        mode: "normal",
        pending: "",
        value: next,
      }
    }
    case "D":
      return {
        cursor,
        handled: true,
        mode: "normal",
        pending: "",
        value: value.slice(0, cursor),
      }
    case "C":
      return {
        cursor,
        handled: true,
        mode: "insert",
        pending: "",
        value: value.slice(0, cursor),
      }
    case "d":
      return { cursor, handled: true, mode: "normal", pending: "d", value }
    case "c":
      return { cursor, handled: true, mode: "normal", pending: "c", value }
    default:
      // Swallow stray printable keys so they can't type in NORMAL mode; let
      // control keys (Enter, ArrowUp/Down, Tab, Escape, Home/End) fall through
      // to the host handler.
      return {
        cursor,
        handled: key.length === 1,
        mode: "normal",
        pending: "",
        value,
      }
  }
}

// The caret index one "word" forward (dir 1) or back (dir -1) from `cursor`,
// used by the w/b motions and the dw/cw operators. Words are runs of the same
// character class (vim-style, three classes) separated by whitespace, so
// punctuation counts as its own word: 0 = whitespace, 1 = word char (\w),
// 2 = punctuation. `charAt` keeps indexing total (never undefined).
export function wordBoundary(
  value: string,
  cursor: number,
  dir: 1 | -1
): number {
  const n = value.length
  const cls = (c: string): 0 | 1 | 2 =>
    /\s/.test(c) ? 0 : /\w/.test(c) ? 1 : 2

  if (dir === 1) {
    // `w`: skip the rest of the current run, then any whitespace, landing on the
    // next word's first char.
    let i = cursor
    const start = cls(value.charAt(i))
    if (start !== 0) {
      while (i < n && cls(value.charAt(i)) === start) i++
    }
    while (i < n && cls(value.charAt(i)) === 0) i++
    return Math.min(i, Math.max(0, n - 1))
  }

  // `b`: step back over whitespace, then to the start of that run.
  let i = cursor - 1
  while (i >= 0 && cls(value.charAt(i)) === 0) i--
  if (i >= 0) {
    const start = cls(value.charAt(i))
    while (i - 1 >= 0 && cls(value.charAt(i - 1)) === start) i--
  }
  return Math.max(0, i)
}
