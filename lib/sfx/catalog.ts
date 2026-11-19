// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Single source of truth for app sounds: the names, per-sound metadata
// (category, motion policy, rate limit) and each sound's RECIPE as a pure,
// testable plan of timed events. The "Magic menu" family: a timbre per role
// (music-box celesta, crystal chime, harp, choir pad, ✨ sparkle, hollow thud)
// in C lydian, rendered by lib/sfx/synth.ts.

export const SFX_NAMES = [
  "toggle-on",
  "toggle-off",
  "toast-in",
  "copy",
  "error-soft",
  "theme-switch",
  "unlock-common",
  "unlock-uncommon",
  "unlock-rare",
  "unlock-legendary",
  "unlock-mythic",
  "bubble-cover",
  "bubble-pop",
  "viewer-open",
  "term-boot",
  "term-error",
  "oneko-summon",
  "oneko-dismiss",
  "win-open",
  "win-close",
  "ws-switch",
  "overview-in",
  "overview-out",
  "notify",
  "alarm",
  "alarm-dismiss",
  "boop",
  // Settings pause menu: cursor tick, tab page, open and close.
  "menu-move",
  "menu-tab",
  "menu-open",
  "menu-close",
  // Project trading cards: booster tear, a card turning over, a card landing
  // face up (the SSR reuses unlock-mythic).
  "pack-tear",
  "card-flip",
  "card-reveal",
  // Login (recipes ready; wired by the login overhaul port).
  "lock-wake",
  "denied",
  "unlock-burn",
] as const
export type SfxName = (typeof SFX_NAMES)[number]

/** Sounds the login overhaul will call (exported so that port can wire them). */
export const LOGIN_SFX = [
  "lock-wake",
  "denied",
  "unlock-burn",
] as const satisfies readonly SfxName[]

export type SfxCategory =
  | "ui"
  | "achievements"
  | "navigation"
  | "terminal"
  | "environment"
  | "login"
  | "start"

export type SfxMeta = {
  category: SfxCategory
  /**
   * Accompanies motion (a transition/zoom/swarm). Under reduced motion these
   * are dropped; standalone feedback (toggles, errors, notifications) stays.
   */
  motion: boolean
  /** Minimum ms between two plays of this sound (or of its `group`). */
  minIntervalMs: number
  /** Sounds sharing a group rate-limit together (e.g. one arrival chime). */
  group?: string
}

export const SFX_META = {
  alarm: { category: "environment", minIntervalMs: 900, motion: false },
  "alarm-dismiss": {
    category: "environment",
    minIntervalMs: 300,
    motion: false,
  },
  boop: { category: "start", minIntervalMs: 60, motion: false },
  "bubble-cover": { category: "navigation", minIntervalMs: 400, motion: true },
  "bubble-pop": { category: "navigation", minIntervalMs: 400, motion: true },
  "card-flip": { category: "ui", minIntervalMs: 90, motion: false },
  "card-reveal": { category: "ui", minIntervalMs: 120, motion: true },
  copy: { category: "ui", minIntervalMs: 300, motion: false },
  denied: { category: "login", minIntervalMs: 300, motion: false },
  "error-soft": { category: "ui", minIntervalMs: 250, motion: false },
  "lock-wake": { category: "login", minIntervalMs: 800, motion: false },
  "menu-close": { category: "ui", minIntervalMs: 150, motion: false },
  "menu-move": { category: "ui", minIntervalMs: 30, motion: false },
  "menu-open": { category: "ui", minIntervalMs: 300, motion: false },
  "menu-tab": { category: "ui", minIntervalMs: 60, motion: false },
  notify: {
    category: "environment",
    group: "arrival",
    minIntervalMs: 450,
    motion: false,
  },
  "oneko-dismiss": { category: "terminal", minIntervalMs: 300, motion: false },
  "oneko-summon": { category: "terminal", minIntervalMs: 300, motion: false },
  "overview-in": { category: "environment", minIntervalMs: 200, motion: true },
  "overview-out": { category: "environment", minIntervalMs: 200, motion: true },
  "pack-tear": { category: "ui", minIntervalMs: 600, motion: false },
  "term-boot": { category: "terminal", minIntervalMs: 800, motion: false },
  "term-error": { category: "terminal", minIntervalMs: 150, motion: false },
  "theme-switch": { category: "ui", minIntervalMs: 400, motion: false },
  "toast-in": {
    category: "ui",
    group: "arrival",
    minIntervalMs: 450,
    motion: false,
  },
  "toggle-off": { category: "ui", minIntervalMs: 80, motion: false },
  "toggle-on": { category: "ui", minIntervalMs: 80, motion: false },
  "unlock-burn": { category: "login", minIntervalMs: 800, motion: true },
  "unlock-common": {
    category: "achievements",
    minIntervalMs: 200,
    motion: false,
  },
  "unlock-legendary": {
    category: "achievements",
    minIntervalMs: 200,
    motion: false,
  },
  "unlock-mythic": {
    category: "achievements",
    minIntervalMs: 200,
    motion: false,
  },
  "unlock-rare": {
    category: "achievements",
    minIntervalMs: 200,
    motion: false,
  },
  "unlock-uncommon": {
    category: "achievements",
    minIntervalMs: 200,
    motion: false,
  },
  "viewer-open": { category: "navigation", minIntervalMs: 250, motion: true },
  "win-close": { category: "environment", minIntervalMs: 100, motion: false },
  "win-open": { category: "environment", minIntervalMs: 100, motion: false },
  "ws-switch": { category: "environment", minIntervalMs: 120, motion: false },
} as const satisfies Record<SfxName, SfxMeta>

/* ---------------------------------------------------------------------- */
/* Recipes                                                                */
/* ---------------------------------------------------------------------- */

const C5 = 523.25
const LYDIAN = [0, 2, 4, 6, 7, 9, 11] as const
/** i-th note of C lydian from C5 (negative = lower). */
export function lydian(i: number): number {
  const octave = Math.floor(i / 7)
  const degree = LYDIAN[((i % 7) + 7) % 7] ?? 0
  return C5 * 2 ** (octave + degree / 12)
}

export type SfxEvent =
  | {
      kind: "celesta" | "crystal" | "pluck" | "bloop" | "plink"
      at: number
      f: number
      dur: number
      gain: number
    }
  | {
      kind: "choir"
      at: number
      freqs: readonly number[]
      dur: number
      gain: number
      attack: number
    }
  | { kind: "sparkle"; at: number; count: number; spread: number; gain: number }
  | { kind: "thud"; at: number; f: number; gain: number }
  | {
      kind: "swoosh"
      at: number
      dur: number
      from: number
      to: number
      gain: number
    }
  | { kind: "meow"; at: number; gain: number }
  | {
      kind: "tone"
      at: number
      f: number
      to?: number
      dur: number
      gain: number
      wave: "sine" | "triangle"
    }
  | { kind: "clicks"; at: number; count: number; spacing: number; gain: number }

export type SfxPlan = {
  /** Reverb send (0 dry … ~0.55 lush). */
  wet: number
  /** Use the darker, shorter room (negatives). */
  dark?: boolean
  events: readonly SfxEvent[]
}

export type SfxOptions = {
  /** Pitch step: workspace number for ws-switch, boop count for boop. */
  step?: number
}

const note = (
  kind: "celesta" | "crystal" | "pluck" | "bloop" | "plink",
  at: number,
  i: number,
  dur: number,
  gain: number
): SfxEvent => ({ at, dur, f: lydian(i), gain, kind })
const run = (
  kind: "celesta" | "crystal" | "pluck",
  start: number,
  degrees: readonly number[],
  step: number,
  dur: number,
  gain: number
): SfxEvent[] =>
  degrees.map((i, k) => note(kind, start + k * step, i, dur, gain))
const range = (from: number, count: number): number[] =>
  Array.from({ length: count }, (_, k) => from + k)

export const SFX_RECIPES: Record<SfxName, (options: SfxOptions) => SfxPlan> = {
  alarm: () => ({
    events: [0, 1].flatMap((r) =>
      run("celesta", r * 1.0, [11, 13, 15, 13], 0.18, 0.5, 0.1)
    ),
    wet: 0.35,
  }),
  "alarm-dismiss": () => ({
    events: [
      {
        at: 0,
        attack: 0.05,
        dur: 0.25,
        freqs: [lydian(4), lydian(0)],
        gain: 0.01,
        kind: "choir",
      },
      note("celesta", 0.12, 7, 0.6, 0.08),
    ],
    wet: 0.35,
  }),
  boop: ({ step = 0 }) => {
    const k = Math.min(Math.max(step - 1, 0), 10)
    return {
      events: [
        note("bloop", 0, 4 + k, 0.09, 0.09),
        { at: 0.06, count: 1, gain: 0.02, kind: "sparkle", spread: 0.02 },
      ],
      wet: 0.25,
    }
  },
  "bubble-cover": () => ({
    events: range(0, 9).map((i) => ({
      at: i * 0.045,
      dur: 0.09,
      f: lydian(i) * 0.55,
      gain: 0.06,
      kind: "bloop" as const,
    })),
    wet: 0.3,
  }),
  "bubble-pop": () => ({
    events: range(0, 11).map((i) =>
      note("plink", (i * 0.041) % 0.45, 10 + ((i * 3) % 7), 0.07, 0.045)
    ),
    wet: 0.25,
  }),
  // Card turning over: an airy flick and one bright pluck.
  "card-flip": () => ({
    events: [
      { at: 0, dur: 0.1, from: 1800, gain: 0.022, kind: "swoosh", to: 4200 },
      note("pluck", 0.03, 11, 0.25, 0.04),
    ],
    wet: 0.2,
  }),
  // A card landing face up in the reveal sequence: celesta pair + sparkle.
  "card-reveal": () => ({
    events: [
      ...run("celesta", 0, [9, 13], 0.06, 0.45, 0.05),
      { at: 0.05, count: 4, gain: 0.025, kind: "sparkle", spread: 0.2 },
    ],
    wet: 0.35,
  }),
  copy: () => ({
    events: [
      note("crystal", 0, 14, 0.7, 0.05),
      { at: 0.02, count: 5, gain: 0.03, kind: "sparkle", spread: 0.25 },
    ],
    wet: 0.35,
  }),
  denied: () => ({
    dark: true,
    events: [
      { at: 0, f: 110, gain: 0.14, kind: "thud" },
      ...[1, 1.06, 1.12].map((r) => ({
        at: 0.03,
        dur: 0.35,
        f: 196 * r,
        gain: 0.025,
        kind: "tone" as const,
        wave: "triangle" as const,
      })),
    ],
    wet: 0.15,
  }),
  "error-soft": () => ({
    dark: true,
    events: [
      { at: 0, f: 130, gain: 0.12, kind: "thud" },
      {
        at: 0.02,
        dur: 0.25,
        f: lydian(-1),
        gain: 0.03,
        kind: "tone",
        wave: "triangle",
      },
      {
        at: 0.02,
        dur: 0.25,
        f: lydian(0),
        gain: 0.03,
        kind: "tone",
        wave: "triangle",
      },
    ],
    wet: 0.1,
  }),
  "lock-wake": () => ({
    events: [
      {
        at: 0,
        attack: 0.35,
        dur: 0.5,
        freqs: [lydian(0) / 2, lydian(4) / 2, lydian(9) / 2],
        gain: 0.012,
        kind: "choir",
      },
    ],
    wet: 0.5,
  }),
  // Resume: the same run falling, with a soft landing thud.
  "menu-close": () => ({
    events: [
      { at: 0, dur: 0.14, from: 3000, gain: 0.025, kind: "swoosh", to: 600 },
      ...run("crystal", 0, [18, 14, 11], 0.035, 0.3, 0.03),
      { at: 0.1, f: 200, gain: 0.05, kind: "thud" },
    ],
    wet: 0.3,
  }),
  // A dry plink per cursor step: short and quiet, so holding j stays pleasant.
  "menu-move": () => ({
    events: [note("plink", 0, 9, 0.05, 0.035)],
    wet: 0.08,
  }),
  // Pause in: a rising sweep and a four-note crystal run.
  "menu-open": () => ({
    events: [
      { at: 0, dur: 0.2, from: 400, gain: 0.03, kind: "swoosh", to: 3200 },
      ...run("crystal", 0.04, [7, 11, 14, 18], 0.04, 0.4, 0.035),
    ],
    wet: 0.35,
  }),
  // Tab page: a quick upward swish plus one bright note.
  "menu-tab": () => ({
    events: [
      { at: 0, dur: 0.08, from: 1200, gain: 0.02, kind: "swoosh", to: 2800 },
      note("celesta", 0.02, 11, 0.25, 0.06),
    ],
    wet: 0.2,
  }),
  notify: () => ({
    events: [
      note("crystal", 0, 9, 0.8, 0.06),
      note("crystal", 0.13, 13, 0.9, 0.055),
    ],
    wet: 0.4,
  }),
  "oneko-dismiss": () => ({
    dark: true,
    events: [
      {
        at: 0,
        attack: 0.05,
        dur: 0.35,
        freqs: [lydian(4), lydian(2) * 0.944],
        gain: 0.013,
        kind: "choir",
      },
      { at: 0.35, f: 100, gain: 0.12, kind: "thud" },
    ],
    wet: 0.3,
  }),
  "oneko-summon": () => ({
    events: [
      { at: 0, gain: 0.12, kind: "meow" },
      { at: 0.32, count: 3, gain: 0.02, kind: "sparkle", spread: 0.15 },
    ],
    wet: 0.25,
  }),
  "overview-in": () => ({
    events: [
      {
        at: 0,
        attack: 0.3,
        dur: 0.25,
        freqs: [lydian(0) / 2, lydian(4) / 2, lydian(6) / 2],
        gain: 0.012,
        kind: "choir",
      },
      { at: 0, dur: 0.35, from: 500, gain: 0.03, kind: "swoosh", to: 3200 },
      { at: 0.32, count: 4, gain: 0.025, kind: "sparkle", spread: 0.2 },
    ],
    wet: 0.45,
  }),
  "overview-out": () => ({
    events: [
      { at: 0, dur: 0.3, from: 3200, gain: 0.035, kind: "swoosh", to: 500 },
      note("celesta", 0.25, 0, 0.8, 0.08),
    ],
    wet: 0.4,
  }),
  // Booster pack ripping open: paper clicks, a falling swoosh, a soft thud.
  "pack-tear": () => ({
    dark: true,
    events: [
      { at: 0, count: 7, gain: 0.03, kind: "clicks", spacing: 0.022 },
      { at: 0.02, dur: 0.3, from: 3800, gain: 0.05, kind: "swoosh", to: 900 },
      { at: 0.24, f: 160, gain: 0.06, kind: "thud" },
    ],
    wet: 0.15,
  }),
  "term-boot": () => ({
    events: [
      ...run("crystal", 0, [7, 9, 11, 14], 0.09, 0.6, 0.04),
      {
        at: 0.1,
        attack: 0.25,
        dur: 0.5,
        freqs: [lydian(0) / 2, lydian(4) / 2],
        gain: 0.012,
        kind: "choir",
      },
    ],
    wet: 0.4,
  }),
  "term-error": () => ({
    dark: true,
    events: [
      { at: 0, f: 120, gain: 0.12, kind: "thud" },
      {
        at: 0.05,
        dur: 0.2,
        f: lydian(-3),
        gain: 0.04,
        kind: "tone",
        wave: "triangle",
      },
    ],
    wet: 0.08,
  }),
  "theme-switch": () => ({
    events: [
      ...run("pluck", 0, range(0, 9), 0.035, 0.9, 0.06),
      { at: 0.32, count: 5, gain: 0.025, kind: "sparkle", spread: 0.3 },
    ],
    wet: 0.45,
  }),
  "toast-in": () => ({
    events: [
      note("celesta", 0, 4, 0.5, 0.09),
      note("celesta", 0.09, 8, 0.6, 0.09),
    ],
    wet: 0.3,
  }),
  "toggle-off": () => ({
    events: [
      { at: 0, f: 260, gain: 0.06, kind: "thud" },
      note("pluck", 0, 2, 0.18, 0.05),
    ],
    wet: 0.08,
  }),
  "toggle-on": () => ({
    events: [
      note("celesta", 0, 9, 0.25, 0.08),
      note("celesta", 0.06, 12, 0.3, 0.08),
    ],
    wet: 0.12,
  }),
  "unlock-burn": () => ({
    events: [
      { at: 0, count: 8, gain: 0.03, kind: "clicks", spacing: 0.045 },
      {
        at: 0.1,
        attack: 0.35,
        dur: 0.7,
        freqs: [lydian(0) / 2, lydian(4) / 2, lydian(7) / 2],
        gain: 0.012,
        kind: "choir",
      },
      ...run("pluck", 0.45, [7, 9, 11, 13, 14], 0.05, 0.9, 0.05),
      { at: 0.6, count: 8, gain: 0.025, kind: "sparkle", spread: 0.6 },
    ],
    wet: 0.5,
  }),
  "unlock-common": () => ({
    events: [
      ...run("celesta", 0, [7, 9, 11], 0.08, 0.6, 0.09),
      { at: 0.2, count: 3, gain: 0.025, kind: "sparkle", spread: 0.2 },
    ],
    wet: 0.35,
  }),
  "unlock-legendary": () => ({
    events: [
      ...run("pluck", 0, range(2, 11), 0.038, 0.9, 0.065),
      {
        at: 0.25,
        attack: 0.35,
        dur: 0.8,
        freqs: [lydian(0), lydian(2), lydian(4)],
        gain: 0.012,
        kind: "choir",
      },
      { at: 0.42, dur: 1.2, f: lydian(0) / 2, gain: 0.08, kind: "celesta" },
      { at: 0.4, count: 9, gain: 0.03, kind: "sparkle", spread: 0.6 },
    ],
    wet: 0.5,
  }),
  "unlock-mythic": () => ({
    events: [
      ...run("pluck", 0, range(0, 15), 0.034, 0.9, 0.06),
      {
        at: 0.3,
        attack: 0.45,
        dur: 1.4,
        freqs: [lydian(0) / 2, lydian(0), lydian(4), lydian(6)],
        gain: 0.011,
        kind: "choir",
      },
      {
        at: 0.5,
        dur: 1.2,
        f: 65.4,
        gain: 0.12,
        kind: "tone",
        to: 49,
        wave: "sine",
      },
      { at: 0.52, dur: 1.5, f: lydian(0) / 2, gain: 0.08, kind: "celesta" },
      { at: 0.5, count: 14, gain: 0.03, kind: "sparkle", spread: 1.0 },
    ],
    wet: 0.55,
  }),
  "unlock-rare": () => ({
    events: [
      ...run("pluck", 0, range(4, 8), 0.04, 0.9, 0.07),
      { at: 0.3, dur: 1.0, f: lydian(0) / 2, gain: 0.08, kind: "celesta" },
      { at: 0.3, count: 6, gain: 0.03, kind: "sparkle", spread: 0.4 },
    ],
    wet: 0.45,
  }),
  "unlock-uncommon": () => ({
    events: [
      ...run("celesta", 0, [7, 9, 11, 14], 0.075, 0.6, 0.085),
      note("crystal", 0.32, 16, 0.8, 0.04),
      { at: 0.25, count: 4, gain: 0.025, kind: "sparkle", spread: 0.3 },
    ],
    wet: 0.4,
  }),
  "viewer-open": () => ({
    events: [
      { at: 0, dur: 0.25, from: 400, gain: 0.05, kind: "swoosh", to: 4000 },
      note("crystal", 0.18, 11, 0.7, 0.05),
    ],
    wet: 0.4,
  }),
  "win-close": () => ({
    events: [
      { at: 0, dur: 0.13, from: 3000, gain: 0.025, kind: "swoosh", to: 700 },
      ...run("crystal", 0, [16, 14, 11], 0.035, 0.3, 0.03),
    ],
    wet: 0.3,
  }),
  "win-open": () => ({
    events: [
      { at: 0, dur: 0.15, from: 800, gain: 0.03, kind: "swoosh", to: 3000 },
      ...run("crystal", 0, [11, 14, 16], 0.04, 0.4, 0.035),
    ],
    wet: 0.35,
  }),
  "ws-switch": ({ step = 1 }) => ({
    events: [
      note("celesta", 0, 2 + Math.min(Math.max(step, 1), 9) * 2, 0.6, 0.09),
    ],
    wet: 0.35,
  }),
}

/** Loudest single event gain in a plan (tests keep every plan gentle). */
export function peakEventGain(plan: SfxPlan): number {
  return Math.max(...plan.events.map((event) => event.gain))
}
