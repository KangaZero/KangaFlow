// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Pure music logic for the About page piano (components/about/piano-screen):
// the 88 keys, note names spelled for a chosen key, the computer-keyboard
// bindings, and chord detection with a Roman-numeral reading in that key.

export const FIRST_KEY = 21 // A0
export const LAST_KEY = 108 // C8

export const PITCH_CLASSES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const
export type PitchClass = (typeof PITCH_CLASSES)[number]

/** Any integer (MIDI note or interval) → its pitch class, 0–11. */
export function pitchClass(n: number): PitchClass {
  return PITCH_CLASSES[((n % 12) + 12) % 12] ?? 0
}

const BLACK: ReadonlySet<PitchClass> = new Set([1, 3, 6, 8, 10])
export const isBlackKey = (midi: number): boolean => BLACK.has(pitchClass(midi))

/** Equal temperament, A4 (MIDI 69) = 440 Hz. */
export const frequency = (midi: number): number => 440 * 2 ** ((midi - 69) / 12)

export type PianoKey = { midi: number; black: boolean; whiteIndex: number }

/**
 * The 88 keys, A0 → C8. Black keys carry the index of the white key to
 * their right, which is where they sit over the boundary.
 */
export const PIANO_KEYS: readonly PianoKey[] = (() => {
  const keys: PianoKey[] = []
  let white = 0
  for (let midi = FIRST_KEY; midi <= LAST_KEY; midi += 1) {
    const black = isBlackKey(midi)
    keys.push({ black, midi, whiteIndex: white })
    if (!black) white += 1
  }
  return keys
})()
export const WHITE_KEY_COUNT = PIANO_KEYS.filter((key) => !key.black).length

// ── Keys and spelling ────────────────────────────────────────────────────

const SHARP_NAMES = [
  "C",
  "C♯",
  "D",
  "D♯",
  "E",
  "F",
  "F♯",
  "G",
  "G♯",
  "A",
  "A♯",
  "B",
] as const
const FLAT_NAMES = [
  "C",
  "D♭",
  "D",
  "E♭",
  "E",
  "F",
  "G♭",
  "G",
  "A♭",
  "A",
  "B♭",
  "B",
] as const
type NoteNames = typeof SHARP_NAMES | typeof FLAT_NAMES

export const MODE_IDS = [
  "major",
  "minor",
  "harmonicMinor",
  "dorian",
  "phrygian",
  "lydian",
  "mixolydian",
  "locrian",
] as const
export type ModeId = (typeof MODE_IDS)[number]

/**
 * Each mode's scale steps and where it starts inside the major scale; that
 * offset gives its key signature, and with it sharps vs flats.
 */
const MODES = {
  dorian: { fromMajor: 2, steps: [0, 2, 3, 5, 7, 9, 10] },
  harmonicMinor: { fromMajor: 9, steps: [0, 2, 3, 5, 7, 8, 11] },
  locrian: { fromMajor: 11, steps: [0, 1, 3, 5, 6, 8, 10] },
  lydian: { fromMajor: 5, steps: [0, 2, 4, 6, 7, 9, 11] },
  major: { fromMajor: 0, steps: [0, 2, 4, 5, 7, 9, 11] },
  minor: { fromMajor: 9, steps: [0, 2, 3, 5, 7, 8, 10] },
  mixolydian: { fromMajor: 7, steps: [0, 2, 4, 5, 7, 9, 10] },
  phrygian: { fromMajor: 4, steps: [0, 1, 3, 5, 7, 8, 10] },
} as const satisfies Record<
  ModeId,
  { fromMajor: number; steps: readonly number[] }
>

/** Major keys written with flats: F, B♭, E♭, A♭, D♭, G♭. */
const FLAT_MAJORS: ReadonlySet<PitchClass> = new Set([5, 10, 3, 8, 1, 6])

export type MusicalKey = {
  tonic: PitchClass
  mode: ModeId
  /** Pitch classes of the scale, tonic first. */
  scale: readonly PitchClass[]
  names: NoteNames
}

export function musicalKey(tonic: PitchClass, mode: ModeId): MusicalKey {
  const { fromMajor, steps } = MODES[mode]
  const relativeMajor = pitchClass(tonic - fromMajor)
  return {
    mode,
    names: FLAT_MAJORS.has(relativeMajor) ? FLAT_NAMES : SHARP_NAMES,
    scale: steps.map((step) => pitchClass(tonic + step)),
    tonic,
  }
}

export const pitchName = (pc: PitchClass, key: MusicalKey): string =>
  key.names[pc]

/** "C♯4", "D♭4": a MIDI note spelled for the key, with its octave. */
export const noteName = (midi: number, key: MusicalKey): string =>
  `${key.names[pitchClass(midi)]}${Math.floor(midi / 12) - 1}`

// ── Computer-keyboard bindings ───────────────────────────────────────────

/**
 * Physical keys (KeyboardEvent.code, so any layout works), DAW style: the
 * home row plays white keys, the row above the black keys between them.
 * Values are semitones above the C the octave setting points at.
 */
export const KEY_BINDINGS = {
  KeyA: 0,
  KeyD: 4,
  KeyE: 3,
  KeyF: 5,
  KeyG: 7,
  KeyH: 9,
  KeyJ: 11,
  KeyK: 12,
  KeyL: 14,
  KeyO: 13,
  KeyP: 15,
  KeyS: 2,
  KeyT: 6,
  KeyU: 10,
  KeyW: 1,
  KeyY: 8,
  Semicolon: 16,
} as const satisfies Record<string, number>
export type BoundCode = keyof typeof KEY_BINDINGS

export function isBoundCode(code: string): code is BoundCode {
  return Object.hasOwn(KEY_BINDINGS, code)
}

/** The label printed on a bound piano key ("A", ";"), by semitone offset. */
export const BINDING_LABELS: ReadonlyMap<number, string> = new Map(
  Object.entries(KEY_BINDINGS).map(([code, offset]) => [
    offset,
    code === "Semicolon" ? ";" : code.slice(3),
  ])
)
export const BOUND_SPAN = Math.max(...Object.values(KEY_BINDINGS))

export const OCTAVES = [1, 2, 3, 4, 5, 6, 7] as const
export type Octave = (typeof OCTAVES)[number]

/** MIDI note of C in an octave (C4 = 60). */
export const octaveBase = (octave: Octave): number => 12 * (octave + 1)

export function clampOctave(n: number): Octave {
  return OCTAVES.find((octave) => octave === Math.round(n)) ?? (n < 1 ? 1 : 7)
}

// ── Intervals and chords ─────────────────────────────────────────────────

const INTERVAL_NAMES = [
  "P1",
  "m2",
  "M2",
  "m3",
  "M3",
  "P4",
  "TT",
  "P5",
  "m6",
  "M6",
  "m7",
  "M7",
] as const

/** Two notes → "P5", "m3"…; whole octaves read "P8". */
export function intervalName(low: number, high: number): string {
  const span = Math.abs(high - low)
  if (span > 0 && span % 12 === 0) return "P8"
  return INTERVAL_NAMES[span % 12] ?? "P1"
}

/** Chord quality for the Roman numeral: case and the °/ø/+ mark. */
type Quality = "major" | "minor" | "diminished" | "halfDiminished" | "augmented"

/** Shapes as semitones above the root; earlier = preferred on a tie. */
const CHORDS = [
  { intervals: [0, 4, 7], numeral: "", quality: "major", symbol: "" },
  { intervals: [0, 3, 7], numeral: "", quality: "minor", symbol: "m" },
  { intervals: [0, 3, 6], numeral: "", quality: "diminished", symbol: "dim" },
  { intervals: [0, 4, 8], numeral: "", quality: "augmented", symbol: "aug" },
  { intervals: [0, 2, 7], numeral: "sus2", quality: "major", symbol: "sus2" },
  { intervals: [0, 5, 7], numeral: "sus4", quality: "major", symbol: "sus4" },
  { intervals: [0, 4, 7, 10], numeral: "7", quality: "major", symbol: "7" },
  {
    intervals: [0, 4, 7, 11],
    numeral: "maj7",
    quality: "major",
    symbol: "maj7",
  },
  { intervals: [0, 3, 7, 10], numeral: "7", quality: "minor", symbol: "m7" },
  {
    intervals: [0, 3, 6, 10],
    numeral: "7",
    quality: "halfDiminished",
    symbol: "m7♭5",
  },
  {
    intervals: [0, 3, 6, 9],
    numeral: "7",
    quality: "diminished",
    symbol: "dim7",
  },
  {
    intervals: [0, 3, 7, 11],
    numeral: "(maj7)",
    quality: "minor",
    symbol: "m(maj7)",
  },
  { intervals: [0, 4, 7, 9], numeral: "6", quality: "major", symbol: "6" },
  { intervals: [0, 3, 7, 9], numeral: "6", quality: "minor", symbol: "m6" },
  {
    intervals: [0, 2, 4, 7],
    numeral: "add9",
    quality: "major",
    symbol: "add9",
  },
  { intervals: [0, 2, 4, 7, 10], numeral: "9", quality: "major", symbol: "9" },
  {
    intervals: [0, 2, 4, 7, 11],
    numeral: "maj9",
    quality: "major",
    symbol: "maj9",
  },
  { intervals: [0, 2, 3, 7, 10], numeral: "9", quality: "minor", symbol: "m9" },
] as const satisfies readonly {
  intervals: readonly number[]
  numeral: string
  quality: Quality
  symbol: string
}[]
type ChordShape = (typeof CHORDS)[number]

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII"] as const
const QUALITY_MARK: Record<Quality, string> = {
  augmented: "+",
  diminished: "°",
  halfDiminished: "ø",
  major: "",
  minor: "",
}

function romanNumeral(
  root: PitchClass,
  chord: ChordShape,
  key: MusicalKey
): string | null {
  const degree = ROMAN[key.scale.indexOf(root)]
  if (!degree) return null
  const lower =
    chord.quality === "minor" ||
    chord.quality === "diminished" ||
    chord.quality === "halfDiminished"
  return `${lower ? degree.toLowerCase() : degree}${QUALITY_MARK[chord.quality]}${chord.numeral}`
}

export type ChordReading = {
  /** "Am7/C": root + symbol, slash bass when not in root position. */
  name: string
  /** "i7": the chord's function in the key; null when it falls outside. */
  roman: string | null
  /** Every note belongs to the key's scale. */
  diatonic: boolean
}

/**
 * Held MIDI notes → the best chord reading in `key`, or null (fewer than
 * three distinct pitch classes, or a shape not in the table).
 *
 * Every held pitch class is tried as the root. When a shape fits more than
 * one way (C–E–G–A is C6 and Am7/C), the reading with all notes in the key
 * wins, then the one rooted on the tonic, then the one in root position,
 * then the simpler shape.
 */
export function detectChord(
  held: readonly number[],
  key: MusicalKey
): ChordReading | null {
  const pcs = [...new Set(held.map(pitchClass))]
  if (pcs.length < 3) return null
  const bass = pitchClass(Math.min(...held))
  const inKey = pcs.filter((pc) => key.scale.includes(pc)).length
  let best: { chord: ChordShape; root: PitchClass; score: number } | null = null
  for (const root of pcs) {
    const shape = pcs.map((pc) => pitchClass(pc - root)).sort((a, b) => a - b)
    // for…of, not forEach: assignments inside a callback are invisible to
    // TypeScript's narrowing, so `best` would read as null after the loop.
    for (const [order, chord] of CHORDS.entries()) {
      const fits =
        chord.intervals.length === shape.length &&
        chord.intervals.every((interval, i) => interval === shape[i])
      if (!fits) continue
      const score =
        (root === key.tonic ? 5 : 0) + (root === bass ? 3 : 0) - order * 0.01
      if (!best || score > best.score) best = { chord, root, score }
    }
  }
  if (!best) return null
  const { chord, root } = best
  const diatonic = inKey === pcs.length
  return {
    diatonic,
    name: `${key.names[root]}${chord.symbol}${bass === root ? "" : `/${key.names[bass]}`}`,
    roman: diatonic ? romanNumeral(root, chord, key) : null,
  }
}
