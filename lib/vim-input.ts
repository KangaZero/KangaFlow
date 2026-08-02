// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure modal (vim) editing model for a single-line native <input>/<textarea>.
// Browsers give no plugin seam on form fields, so we intercept keydown ourselves
// and drive the element's value + caret — but the *decision* of what a key does
// lives here as a pure reducer (no DOM), so it's trivially unit-tested. The hook
// (use-vim-input) supplies the live value/caret each keystroke and applies the
// result; it persists what the DOM can't hold (mode, pending op, count, pending
// find/text-object, visual anchor, the yank register) and mirrors the register
// to the system clipboard.
//
// Modes: INSERT is mostly pass-through (only Esc leaves). NORMAL acts — motions,
// x/D, the d/c/y operators, p/P paste. VISUAL extends a selection (anchor…cursor)
// that d/c/x/y then operate on.
// Motions: h l 0 $ · w b / W B (word/WORD) · f F t T <char> (find/till).
// Operators: d (delete) c (change) y (yank) — with motions (dw), doubled (dd/yy),
// or text objects (ciw, daw, di", ca(). Every delete/change also fills the
// register (→ clipboard), like vim's unnamed register.
// Counts: a numeric prefix repeats (10w, 3dw, 2fx); 2d3w multiplies to 6. A
// leading 0 is the line-start motion; a 0 *after* a digit is part of the count.

export type VimMode = "normal" | "insert" | "visual"
type Operator = "" | "d" | "c" | "y" | "gu" | "gU" | "g~"
type FindKind = "" | "f" | "F" | "t" | "T"
type TextObjKind = "" | "i" | "a"

export type VimState = {
  mode: VimMode
  value: string
  cursor: number // caret index in [0, value.length]
  pending?: Operator // captured operator awaiting a motion / object
  count?: number // count being typed (0 = none)
  opCount?: number // count captured when the operator was pressed
  find?: FindKind // a pending find awaiting its target char
  textobj?: TextObjKind // a pending text object (i/a) awaiting its object char
  replace?: boolean // `r` pressed — the next key is the replacement char
  gprefix?: boolean // `g` pressed — awaiting gu/gU/g~/gg
  lastFind?: FindKind // last resolved find, for ; / ,
  lastFindChar?: string // its target char
  anchor?: number // VISUAL selection anchor (fixed end)
  register?: string // yank/delete register (mirrors the clipboard)
}

export type VimResult = {
  value: string
  cursor: number
  mode: VimMode
  pending: Operator
  count: number
  opCount: number
  find: FindKind
  textobj: TextObjKind
  replace: boolean
  gprefix: boolean
  lastFind: FindKind
  lastFindChar: string
  anchor: number
  register: string
  // true → we owned this key (caller preventDefaults + stopPropagates).
  // false → we didn't; let the browser / host handler take it.
  handled: boolean
}

function make(o: {
  value: string
  cursor: number
  mode: VimMode
  handled?: boolean
  pending?: Operator
  count?: number
  opCount?: number
  find?: FindKind
  textobj?: TextObjKind
  replace?: boolean
  gprefix?: boolean
  lastFind?: FindKind
  lastFindChar?: string
  anchor?: number
  register?: string
}): VimResult {
  return {
    anchor: o.anchor ?? o.cursor,
    count: o.count ?? 0,
    cursor: o.cursor,
    find: o.find ?? "",
    gprefix: o.gprefix ?? false,
    handled: o.handled ?? true,
    lastFind: o.lastFind ?? "",
    lastFindChar: o.lastFindChar ?? "",
    mode: o.mode,
    opCount: o.opCount ?? 0,
    pending: o.pending ?? "",
    register: o.register ?? "",
    replace: o.replace ?? false,
    textobj: o.textobj ?? "",
    value: o.value,
  }
}

// Clamp a NORMAL/VISUAL caret so it sits *on* a character (block cursor).
function clampBlock(value: string, n: number): number {
  return Math.max(0, Math.min(n, Math.max(0, value.length - 1)))
}

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
    case "W":
      return wordBoundary(value, cursor, 1, true)
    case "B":
      return wordBoundary(value, cursor, -1, true)
    case "e":
      return wordEnd(value, cursor, false)
    case "E":
      return wordEnd(value, cursor, true)
    case "^": {
      let i = 0
      while (i < value.length && /\s/.test(value.charAt(i))) i++
      return i
    }
    default:
      return null
  }
}

// The index of the last char of the current/next word — the *inclusive* landing
// for `e`/`E` (unlike w/$, whose exclusive end is a real position). Operators add
// +1 (de). `big` (E) splits on whitespace only.
function wordEnd(value: string, cursor: number, big: boolean): number {
  const n = value.length
  const cls = (c: string): number =>
    /\s/.test(c) ? 0 : big ? 1 : /\w/.test(c) ? 1 : 2
  let i = cursor + 1
  while (i < n && cls(value.charAt(i)) === 0) i++
  if (i >= n) return cursor // nowhere further to go
  const k = cls(value.charAt(i))
  while (i + 1 < n && cls(value.charAt(i + 1)) === k) i++
  return i
}

// Apply a motion `n` times; null if the key isn't a motion.
function motionN(
  value: string,
  cursor: number,
  key: string,
  n: number
): number | null {
  let c = cursor
  for (let i = 0; i < n; i++) {
    const t = motionTarget(value, c, key)
    if (t === null) return i === 0 ? null : c
    if (t === c) break
    c = t
  }
  return c
}

function findTarget(
  value: string,
  cursor: number,
  kind: Exclude<FindKind, "">,
  ch: string,
  n: number
): number | null {
  const forward = kind === "f" || kind === "t"
  let idx = cursor
  for (let k = 0; k < n; k++) {
    idx = forward ? value.indexOf(ch, idx + 1) : value.lastIndexOf(ch, idx - 1)
    if (idx === -1) return null
  }
  if (kind === "t") return idx - 1
  if (kind === "T") return idx + 1
  return idx
}

// The opposite direction of a find, for `,` (repeat the last f/F/t/T reversed).
function reverseFind(k: Exclude<FindKind, "">): Exclude<FindKind, ""> {
  return k === "f" ? "F" : k === "F" ? "f" : k === "t" ? "T" : "t"
}

// Flip the case of every letter in `s` (for ~ and g~).
function toggleCase(s: string): string {
  return s.replace(/./g, (c) =>
    c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase()
  )
}

// --- Text objects (iw/aw + quote/bracket pairs) ----------------------------

const BRACKETS: Record<string, [string, string]> = {
  "(": ["(", ")"],
  ")": ["(", ")"],
  "[": ["[", "]"],
  "]": ["[", "]"],
  "{": ["{", "}"],
  "}": ["{", "}"],
  "<": ["<", ">"],
  ">": ["<", ">"],
  B: ["{", "}"],
  b: ["(", ")"],
}

// The [from, to) span of a word/WORD object under the cursor. `i` is the word
// run; `a` adds trailing (else leading) whitespace.
function wordObject(
  value: string,
  cursor: number,
  kind: "i" | "a",
  big: boolean
): [number, number] | null {
  const n = value.length
  if (n === 0) return null
  const at = Math.min(cursor, n - 1)
  const cls = (c: string): number =>
    /\s/.test(c) ? 0 : big ? 1 : /\w/.test(c) ? 1 : 2
  const c0 = cls(value.charAt(at))
  let s = at
  let e = at
  while (s > 0 && cls(value.charAt(s - 1)) === c0) s--
  while (e < n && cls(value.charAt(e)) === c0) e++
  if (kind === "i") return [s, e]
  let e2 = e
  while (e2 < n && cls(value.charAt(e2)) === 0) e2++
  if (e2 > e) return [s, e2]
  let s2 = s
  while (s2 > 0 && cls(value.charAt(s2 - 1)) === 0) s2--
  return [s2, e]
}

// The [from, to) span inside/around the pair enclosing the cursor.
function pairObject(
  value: string,
  cursor: number,
  kind: "i" | "a",
  open: string,
  close: string
): [number, number] | null {
  const n = value.length
  let o = -1
  let c = -1
  if (open === close) {
    // Quotes: collect them, pair left-to-right, and pick the first pair whose
    // closing quote is at/after the cursor — so `ci"` works whether the cursor
    // is inside the string or before it on the line (matching vim).
    const quotes: number[] = []
    for (let i = 0; i < n; i++) {
      if (value.charAt(i) === open) quotes.push(i)
    }
    for (let k = 0; k + 1 < quotes.length; k += 2) {
      const a = quotes[k] as number
      const bx = quotes[k + 1] as number
      if (cursor <= bx) {
        o = a
        c = bx
        break
      }
    }
  } else {
    // Brackets: scan left for the unmatched open, then right for its close.
    let depth = 0
    for (let i = cursor; i >= 0; i--) {
      const ch = value.charAt(i)
      if (ch === close && i !== cursor) depth++
      else if (ch === open) {
        if (depth === 0) {
          o = i
          break
        }
        depth--
      }
    }
    if (o !== -1) {
      let d = 0
      for (let i = o + 1; i < n; i++) {
        const ch = value.charAt(i)
        if (ch === open) d++
        else if (ch === close) {
          if (d === 0) {
            c = i
            break
          }
          d--
        }
      }
    }
  }
  if (o === -1 || c === -1) return null
  return kind === "i" ? [o + 1, c] : [o, c + 1]
}

function textObjectRange(
  value: string,
  cursor: number,
  kind: "i" | "a",
  obj: string
): [number, number] | null {
  if (obj === "w" || obj === "W") {
    return wordObject(value, cursor, kind, obj === "W")
  }
  if (obj === '"' || obj === "'" || obj === "`") {
    return pairObject(value, cursor, kind, obj, obj)
  }
  const b = BRACKETS[obj]
  return b ? pairObject(value, cursor, kind, b[0], b[1]) : null
}

// Reduce one keydown into the next editing state. `key` is the raw
// KeyboardEvent.key (Shift already folded in: "I", "A", "$", "W"…).
export function vimReduce(state: VimState, key: string): VimResult {
  const { mode, value, cursor } = state
  const pending = state.pending ?? ""
  const count = state.count ?? 0
  const opCount = state.opCount ?? 0
  const find = state.find ?? ""
  const textobj = state.textobj ?? ""
  const replace = state.replace ?? false
  const gprefix = state.gprefix ?? false
  const lastFind = state.lastFind ?? ""
  const lastFindChar = state.lastFindChar ?? ""
  const anchor = state.anchor ?? cursor
  const register = state.register ?? ""

  // Every result keeps the register + last-find memory unless it sets its own.
  const m = (o: Parameters<typeof make>[0]): VimResult =>
    make({ lastFind, lastFindChar, register, ...o })
  const keep = m({
    anchor: mode === "visual" ? anchor : cursor,
    cursor,
    mode,
    value,
  })

  // Apply an operator to a [from, to) span: d deletes, c deletes → INSERT, y
  // copies (all fill the register); gu/gU/g~ transform case in place.
  const operate = (op: Operator, from: number, to: number): VimResult => {
    if (op === "gu" || op === "gU" || op === "g~") {
      const seg = value.slice(from, to)
      const cased =
        op === "gu"
          ? seg.toLowerCase()
          : op === "gU"
            ? seg.toUpperCase()
            : toggleCase(seg)
      const next = value.slice(0, from) + cased + value.slice(to)
      return m({ cursor: clampBlock(next, from), mode: "normal", value: next })
    }
    const removed = value.slice(from, to)
    if (op === "y") {
      return m({
        cursor: clampBlock(value, from),
        mode: "normal",
        register: removed,
        value,
      })
    }
    const next = value.slice(0, from) + value.slice(to)
    return m({
      cursor: op === "c" ? from : clampBlock(next, from),
      mode: op === "c" ? "insert" : "normal",
      register: removed,
      value: next,
    })
  }

  if (mode === "insert") {
    if (key === "Escape") {
      return m({ cursor: Math.max(0, cursor - 1), mode: "normal", value })
    }
    return m({ cursor, handled: false, mode: "insert", value })
  }

  // A pending find swallows the NEXT key as its literal target char.
  if (find !== "") {
    if (key.length !== 1) return keep // Esc/Enter/… cancels the find
    // Operator × motion counts multiply (2df. deletes through the 2nd match).
    const fn = (opCount || 1) * (count || 1)
    const target = findTarget(value, cursor, find, key, fn)
    if (target === null) return keep
    // Remember it for ; / ,.
    const memo = { lastFind: find, lastFindChar: key }
    if (pending !== "") {
      const forward = find === "f" || find === "t"
      return operate(
        pending,
        forward ? cursor : target,
        forward ? target + 1 : cursor
      )
    }
    const c = clampBlock(value, target)
    return mode === "visual"
      ? m({ anchor, cursor: c, mode: "visual", value, ...memo })
      : m({ cursor: c, mode: "normal", value, ...memo })
  }

  // g-prefix: gu/gU/g~ start a case operator (apply now in VISUAL); gg → start.
  if (gprefix) {
    const caseOp: Operator =
      key === "u" ? "gu" : key === "U" ? "gU" : key === "~" ? "g~" : ""
    if (caseOp !== "") {
      if (mode === "visual") {
        const from = Math.min(anchor, cursor)
        const to = Math.min(value.length, Math.max(anchor, cursor) + 1)
        return operate(caseOp, from, to)
      }
      return m({
        cursor,
        mode: "normal",
        opCount: count,
        pending: caseOp,
        value,
      })
    }
    if (key === "g") {
      return mode === "visual"
        ? m({ anchor, cursor: 0, mode: "visual", value })
        : m({ cursor: 0, mode: "normal", value })
    }
    return keep // unknown g-command → cancel
  }

  // A pending `r` swallows the next key as the replacement char. NORMAL replaces
  // `count` chars from the caret; VISUAL replaces every selected char.
  if (replace) {
    if (key.length !== 1) return keep // Esc/… cancels
    if (mode === "visual") {
      const from = Math.min(anchor, cursor)
      const to = Math.min(value.length, Math.max(anchor, cursor) + 1)
      const next =
        value.slice(0, from) + key.repeat(to - from) + value.slice(to)
      return m({ cursor: clampBlock(next, from), mode: "normal", value: next })
    }
    // Vim: [count]r fails (no change) if fewer than count chars remain.
    const k = count || 1
    if (k > value.length - cursor) {
      return m({ cursor: clampBlock(value, cursor), mode: "normal", value })
    }
    const next =
      value.slice(0, cursor) + key.repeat(k) + value.slice(cursor + k)
    return m({
      cursor: clampBlock(next, cursor + k - 1),
      mode: "normal",
      value: next,
    })
  }

  // A pending text object (i/a) swallows the next key as its object char.
  if (textobj !== "") {
    const range = textObjectRange(value, cursor, textobj, key)
    if (!range)
      return m({ cursor, mode: pending !== "" ? "normal" : mode, value })
    if (pending !== "") return operate(pending, range[0], range[1])
    // VISUAL: set the selection to the object.
    return m({
      anchor: range[0],
      cursor: clampBlock(value, range[1] - 1),
      mode: "visual",
      value,
    })
  }

  // Count digits: 1–9 always build; 0 builds only when a count is in progress
  // (otherwise 0 is the line-start motion below).
  if (/^\d$/.test(key) && !(key === "0" && count === 0)) {
    return m({
      anchor,
      count: count * 10 + Number(key),
      cursor,
      mode,
      opCount,
      pending,
      value,
    })
  }

  // Start a find (f/F/t/T) — preserve any operator + count for the target char.
  if (key === "f" || key === "F" || key === "t" || key === "T") {
    return m({
      anchor,
      count,
      cursor,
      find: key,
      mode,
      opCount,
      pending,
      value,
    })
  }

  // A pending operator consumes the next motion / object / doubled key.
  if (pending !== "") {
    if (key === "i" || key === "a") {
      return m({
        count,
        cursor,
        mode: "normal",
        opCount,
        pending,
        textobj: key,
        value,
      })
    }
    // The doubling key is the operator itself (dd/cc/yy) or its second letter
    // for the case ops (guu/gUU/g~~) — meaning "the whole line".
    const dbl = pending.length === 1 ? pending : pending.slice(1)
    if (key === dbl) {
      if (pending === "gu" || pending === "gU" || pending === "g~") {
        return operate(pending, 0, value.length)
      }
      if (pending === "y") {
        return m({ cursor, mode: "normal", register: value, value })
      }
      return make({
        cursor: 0,
        mode: pending === "c" ? "insert" : "normal",
        register: value,
        value: "",
      })
    }
    // cw/cW on a non-blank behaves like ce/cE — it does NOT eat the trailing
    // whitespace (:help cw). dw still does.
    if (
      pending === "c" &&
      (key === "w" || key === "W") &&
      !/\s/.test(value.charAt(cursor))
    ) {
      const end = motionN(
        value,
        cursor,
        key === "w" ? "e" : "E",
        (opCount || 1) * (count || 1)
      )
      if (end !== null) return operate("c", cursor, end + 1)
    }
    const target = motionN(value, cursor, key, (opCount || 1) * (count || 1))
    if (target === null) return m({ cursor, mode: "normal", value }) // cancel
    // e/E are inclusive motions (de deletes through the word-end char).
    const inclusive = key === "e" || key === "E"
    return operate(
      pending,
      Math.min(cursor, target),
      Math.max(cursor, target) + (inclusive ? 1 : 0)
    )
  }

  const n = count || 1

  if (key === "Escape") {
    return mode === "visual"
      ? m({ cursor, mode: "normal", value })
      : m({ cursor, handled: false, mode: "normal", value })
  }

  if (key === "v") {
    return mode === "visual"
      ? m({ cursor, mode: "normal", value })
      : m({ anchor: cursor, cursor, mode: "visual", value })
  }

  // `g` opens the g-prefix (gu/gU/g~/gg), resolved on the next key above.
  if (key === "g") {
    return mode === "visual"
      ? m({ anchor, cursor, gprefix: true, mode: "visual", value })
      : m({ cursor, gprefix: true, mode: "normal", value })
  }

  // VISUAL operators act immediately on the inclusive selection.
  if (mode === "visual") {
    if (key === "d" || key === "x" || key === "c" || key === "y") {
      const from = Math.min(anchor, cursor)
      const to = Math.min(value.length, Math.max(anchor, cursor) + 1)
      return operate(key === "x" ? "d" : key, from, to)
    }
    if (key === "i" || key === "a") {
      return m({ anchor, cursor, mode: "visual", textobj: key, value })
    }
    if (key === "r") {
      return m({ anchor, cursor, mode: "visual", replace: true, value })
    }
    if (key === "p") {
      // Replace the selection with the register.
      const from = Math.min(anchor, cursor)
      const to = Math.min(value.length, Math.max(anchor, cursor) + 1)
      const next = value.slice(0, from) + register + value.slice(to)
      return m({
        cursor: clampBlock(next, from + Math.max(0, register.length - 1)),
        mode: "normal",
        value: next,
      })
    }
  }

  // Motions (NORMAL and VISUAL) honour the count and clamp onto a char.
  const target = motionN(value, cursor, key, n)
  if (target !== null) {
    const c = clampBlock(value, target)
    return mode === "visual"
      ? m({ anchor, cursor: c, mode: "visual", value })
      : m({ cursor: c, mode: "normal", value })
  }

  // NORMAL-only commands.
  if (mode === "normal") {
    switch (key) {
      case "i":
        return m({ cursor, mode: "insert", value })
      case "a":
        return m({
          cursor: Math.min(value.length, cursor + 1),
          mode: "insert",
          value,
        })
      case "I":
        return m({ cursor: 0, mode: "insert", value })
      case "A":
        return m({ cursor: value.length, mode: "insert", value })
      case "x": {
        if (cursor >= value.length)
          return m({ cursor: clampBlock(value, cursor), mode: "normal", value })
        const del = Math.min(n, value.length - cursor)
        return operate("d", cursor, cursor + del)
      }
      case "D":
        return operate("d", cursor, value.length)
      case "C":
        return operate("c", cursor, value.length)
      case "r":
        // Await the replacement char; keep the count so 3r<char> works.
        return m({ count, cursor, mode: "normal", replace: true, value })
      case "X": {
        // Delete `count` chars before the caret (Backspace-like).
        const k = Math.min(n, cursor)
        if (k <= 0)
          return m({ cursor: clampBlock(value, cursor), mode: "normal", value })
        return operate("d", cursor - k, cursor)
      }
      case "s":
        // Substitute char(s): delete forward then INSERT (= cl).
        return operate("c", cursor, Math.min(value.length, cursor + n))
      case "S":
        // Substitute line (= cc).
        return make({ cursor: 0, mode: "insert", register: value, value: "" })
      case "~": {
        // Toggle case of `count` chars and advance.
        const k = Math.min(n, value.length - cursor)
        if (k <= 0)
          return m({ cursor: clampBlock(value, cursor), mode: "normal", value })
        const next =
          value.slice(0, cursor) +
          toggleCase(value.slice(cursor, cursor + k)) +
          value.slice(cursor + k)
        return m({
          cursor: clampBlock(next, cursor + k),
          mode: "normal",
          value: next,
        })
      }
      case ";":
      case ",": {
        if (lastFind === "")
          return m({ cursor: clampBlock(value, cursor), mode: "normal", value })
        const kind = key === ";" ? lastFind : reverseFind(lastFind)
        // For t/T the caret already sits next to the target, so start one char
        // further or the repeat would re-find the same spot and stay stuck.
        const from =
          kind === "t" ? cursor + 1 : kind === "T" ? cursor - 1 : cursor
        const tgt = findTarget(value, from, kind, lastFindChar, n)
        return m({
          cursor:
            tgt === null ? clampBlock(value, cursor) : clampBlock(value, tgt),
          mode: "normal",
          value,
        })
      }
      case "d":
        return m({
          cursor,
          mode: "normal",
          opCount: count,
          pending: "d",
          value,
        })
      case "c":
        return m({
          cursor,
          mode: "normal",
          opCount: count,
          pending: "c",
          value,
        })
      case "y":
        return m({
          cursor,
          mode: "normal",
          opCount: count,
          pending: "y",
          value,
        })
      case "Y":
        return m({ cursor, mode: "normal", register: value, value })
      case "p": {
        if (register === "")
          return m({ cursor: clampBlock(value, cursor), mode: "normal", value })
        const at = value.length === 0 ? 0 : cursor + 1
        const next = value.slice(0, at) + register + value.slice(at)
        return m({
          cursor: clampBlock(next, at + register.length - 1),
          mode: "normal",
          value: next,
        })
      }
      case "P": {
        if (register === "")
          return m({ cursor: clampBlock(value, cursor), mode: "normal", value })
        const next = value.slice(0, cursor) + register + value.slice(cursor)
        return m({
          cursor: clampBlock(next, cursor + register.length - 1),
          mode: "normal",
          value: next,
        })
      }
      default:
        break
    }
  }

  // Unhandled: swallow stray printable keys; let control keys fall through.
  return m({ ...keep, handled: key.length === 1 })
}

// The caret index one word forward (dir 1) or back (dir -1) from `cursor`, used
// by the w/b/W/B motions and the dw/cw operators. `big` (W/B) splits on
// whitespace only; otherwise words are runs of one class and punctuation is its
// own word: 0 = whitespace, 1 = word char (\w), 2 = punctuation. The forward end
// is *exclusive* (may be value.length) so operators delete through it; NORMAL
// motions clamp it back onto a char. `charAt` keeps indexing total.
export function wordBoundary(
  value: string,
  cursor: number,
  dir: 1 | -1,
  big = false
): number {
  const n = value.length
  const cls = (c: string): number =>
    /\s/.test(c) ? 0 : big ? 1 : /\w/.test(c) ? 1 : 2

  if (dir === 1) {
    let i = cursor
    const start = cls(value.charAt(i))
    if (start !== 0) {
      while (i < n && cls(value.charAt(i)) === start) i++
    }
    while (i < n && cls(value.charAt(i)) === 0) i++
    return i
  }

  let i = cursor - 1
  while (i >= 0 && cls(value.charAt(i)) === 0) i--
  if (i >= 0) {
    const start = cls(value.charAt(i))
    while (i - 1 >= 0 && cls(value.charAt(i - 1)) === start) i--
  }
  return Math.max(0, i)
}
