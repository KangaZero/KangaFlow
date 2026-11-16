// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// playSfx: the one entry point for app sound effects. Gated by the
// `soundEffects` setting (synced in by components/sfx-sync), silent until the
// first user gesture, rate-limited per sound/group, capped in concurrent
// voices, and motion-accompanying sounds are dropped under reduced motion.

import {
  SFX_META,
  SFX_RECIPES,
  type SfxName,
  type SfxOptions,
} from "@/lib/sfx/catalog"
import { getSharedAudio, SFX_MASTER_GAIN } from "@/lib/sfx/context"
import { planDuration, renderPlan } from "@/lib/sfx/synth"

const MAX_VOICES = 12

export type SfxGate = {
  enabled: boolean
  reducedMotion: boolean
  gestured: boolean
}
const gate: SfxGate = { enabled: false, gestured: false, reducedMotion: false }

export function setSfxGate(next: Partial<SfxGate>): void {
  Object.assign(gate, next)
}

/**
 * The shared context, but only once sound is on AND the user has interacted.
 * For callers that schedule their own audio (achievement unlock) so they obey
 * the same gate as playSfx instead of creating a suspended context early.
 */
export function gatedSharedAudio(): AudioContext | null {
  return gate.enabled && gate.gestured ? getSharedAudio() : null
}

/** Pure: should `name` play right now? (Exported for tests.) */
export function sfxAllowed(name: SfxName, state: SfxGate): boolean {
  if (!(state.enabled && state.gestured)) return false
  return !(state.reducedMotion && SFX_META[name].motion)
}

/** Pure rate limiter keyed by sound name or its group. */
export function createRateLimiter(
  now: () => number = () => performance.now()
): (name: SfxName) => boolean {
  const last = new Map<string, number>()
  return (name: SfxName): boolean => {
    const meta = SFX_META[name]
    const key = "group" in meta ? meta.group : name
    const t = now()
    const previous = last.get(key)
    if (previous !== undefined && t - previous < meta.minIntervalMs)
      return false
    last.set(key, t)
    return true
  }
}

const allowRate = createRateLimiter()
let activeVoices = 0
let master: GainNode | null = null

/** Master gain on the shared context, created once (shared with ambience). */
export function sfxMaster(ctx: AudioContext): GainNode {
  if (!master || master.context !== ctx) {
    master = ctx.createGain()
    master.gain.value = SFX_MASTER_GAIN
    master.connect(ctx.destination)
  }
  return master
}

/**
 * Play a sound effect. Returns whether it was scheduled. `getAudio` is only
 * called when the sound is allowed, so nothing is created while sound is off.
 */
export function playSfx(
  name: SfxName,
  options: SfxOptions & { delay?: number } = {},
  getAudio: () => AudioContext | null = getSharedAudio
): boolean {
  if (!sfxAllowed(name, gate)) return false
  if (activeVoices >= MAX_VOICES) return false
  if (!allowRate(name)) return false
  const ctx = getAudio()
  if (!ctx) return false
  const plan = SFX_RECIPES[name](options)
  renderPlan(
    ctx,
    sfxMaster(ctx),
    plan,
    ctx.currentTime + 0.02 + (options.delay ?? 0)
  )
  activeVoices++
  window.setTimeout(
    () => {
      activeVoices = Math.max(0, activeVoices - 1)
    },
    (planDuration(plan) + (options.delay ?? 0)) * 1000
  )
  return true
}
