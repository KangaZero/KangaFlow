// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Singleton store for the "f" link-hint mode. The shortcut dispatcher drives it
// (enterHints on the remappable trigger); the HintOverlay subscribes via
// useSyncExternalStore. Kept out of the global-state provider so the feature
// stays self-contained (it's transient UI, not persisted app state).

import { activateHintEl, collectHints, type Hint } from "@/lib/hints"

type HintState = {
  readonly active: boolean
  readonly hints: readonly Hint[]
  readonly typed: string
}

const IDLE: HintState = { active: false, hints: [], typed: "" }

let state: HintState = IDLE
const listeners = new Set<() => void>()

function set(next: HintState): void {
  state = next
  for (const listener of listeners) listener()
}

export function subscribeHints(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

// Stable reference between changes → safe for useSyncExternalStore. The server
// snapshot is the idle constant (no hints during SSR).
export function getHintSnapshot(): HintState {
  return state
}
export function getServerHintSnapshot(): HintState {
  return IDLE
}

export function isHintActive(): boolean {
  return state.active
}

// Enter hint mode by snapshotting the viewport. No-op when nothing is clickable.
export function enterHints(): void {
  const hints = collectHints()
  if (hints.length === 0) return
  set({ active: true, hints, typed: "" })
}

export function exitHints(): void {
  if (state.active) set(IDLE)
}

export function hintBackspace(): void {
  if (state.active) set({ ...state, typed: state.typed.slice(0, -1) })
}

/**
 * Feed one typed character. A keystroke that matches no remaining label is
 * ignored (dead-end); once the typed string exactly matches a label, that
 * element is activated and hint mode exits.
 */
export function typeHintChar(ch: string): void {
  if (!state.active) return
  const candidate = state.typed + ch.toLowerCase()
  const matches = state.hints.filter((h) => h.label.startsWith(candidate))
  if (matches.length === 0) return

  const exact = matches.find((h) => h.label === candidate)
  if (exact) {
    exitHints()
    activateHintEl(exact.el)
    return
  }
  set({ ...state, typed: candidate })
}
