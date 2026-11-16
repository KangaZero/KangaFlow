// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Background ambience (opt-in `ambience` setting, off by default). Only the
// dark theme has one: a deep-sea bed. Seamless looping: a looping WHITE noise
// buffer is shaped by filters downstream, so filter state is continuous across
// the buffer seam (no click). Kept quiet on purpose (peak ≈ 0.04).
// Policy: allowed under reduced motion when opted in (it is sound, not
// motion); paused while the tab is hidden; crossfades on theme change.

import { getSharedAudio, SFX_MASTER_GAIN } from "@/lib/sfx/context"
import { makeImpulse, noiseBuffer } from "@/lib/sfx/synth"

export const AMBIENCE_KINDS = ["deepSea"] as const
export type AmbienceKind = (typeof AMBIENCE_KINDS)[number]

/** Which ambience a site theme gets (null = silence). */
export function ambienceForTheme(
  theme: string | undefined
): AmbienceKind | null {
  return theme === "dark" ? "deepSea" : null
}

export type AmbienceInput = {
  enabled: boolean
  theme: string | undefined
  hidden: boolean
}
export type AmbienceTransition = { stop: boolean; start: AmbienceKind | null }

/** Pure: what to do given what's playing and the current inputs. */
export function planAmbience(
  current: AmbienceKind | null,
  input: AmbienceInput
): AmbienceTransition {
  const wanted =
    input.enabled && !input.hidden ? ambienceForTheme(input.theme) : null
  if (wanted === current) return { start: null, stop: false }
  return { start: wanted, stop: current !== null }
}

/** Default (and only) level: low on purpose — background, not a feature. */
export const AMBIENCE_INTENSITY = 0.35
const LEVEL = 0.42 // per-unit-intensity output level before the master
export const AMBIENCE_LOOP_SECONDS = 5.37
const FADE_IN = 2.5
const FADE_OUT = 1.2

type Rng = () => number

function loopingNoise(ctx: BaseAudioContext): AudioBufferSourceNode {
  const buffer = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * AMBIENCE_LOOP_SECONDS),
    ctx.sampleRate
  )
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const source = ctx.createBufferSource()
  source.buffer = buffer
  source.loop = true
  return source
}

function lfo(
  ctx: BaseAudioContext,
  rate: number,
  depth: number,
  target: AudioParam,
  t: number
): OscillatorNode {
  const osc = ctx.createOscillator()
  osc.frequency.value = rate
  const gain = ctx.createGain()
  gain.gain.value = depth
  osc.connect(gain).connect(target)
  osc.start(t)
  return osc
}

function envelope(
  ctx: BaseAudioContext,
  t: number,
  attack: number,
  peak: number,
  decay: number
): GainNode {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.linearRampToValueAtTime(peak, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  return gain
}

/** Continuous layers: rumble + sub drone. Returns nodes to stop later. */
function buildDeepSea(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number
): AudioScheduledSourceNode[] {
  const nodes: AudioScheduledSourceNode[] = []
  const source = loopingNoise(ctx)
  const lowpass = ctx.createBiquadFilter()
  lowpass.type = "lowpass"
  lowpass.frequency.value = 150
  lowpass.Q.value = 0.5
  const lowpass2 = ctx.createBiquadFilter()
  lowpass2.type = "lowpass"
  lowpass2.frequency.value = 200
  const rumble = ctx.createGain()
  rumble.gain.value = 0.9
  nodes.push(lfo(ctx, 0.05, 0.35, rumble.gain, t))
  source.connect(lowpass).connect(lowpass2).connect(rumble).connect(out)
  source.start(t)
  nodes.push(source)
  for (const [f, amp] of [
    [41.2, 0.32],
    [61.74, 0.14],
    [41.45, 0.22],
  ] as const) {
    const osc = ctx.createOscillator()
    osc.frequency.value = f
    nodes.push(lfo(ctx, 0.017 + Math.random() * 0.01, 0.5, osc.frequency, t))
    const gain = ctx.createGain()
    gain.gain.value = amp
    osc.connect(gain).connect(out)
    osc.start(t)
    nodes.push(osc)
  }
  return nodes
}

/** Sparse random events in [t0, t1): bubbles, rare soft whales + sonar, creaks. */
function deepSeaEvents(
  ctx: BaseAudioContext,
  out: AudioNode,
  reverb: AudioNode,
  t0: number,
  t1: number,
  rng: Rng
): void {
  const send = (amount: number): GainNode => {
    const gain = ctx.createGain()
    gain.gain.value = amount
    gain.connect(reverb)
    return gain
  }
  for (let t = t0; t < t1; t += 0.25) {
    if (rng() < 0.25 / 9) {
      // bubble trickle (sparse)
      const count = 2 + Math.floor(rng() * 4)
      for (let i = 0; i < count; i++) {
        const tt = t + i * (0.06 + rng() * 0.08)
        const source = ctx.createBufferSource()
        source.buffer = noiseBuffer(ctx)
        const band = ctx.createBiquadFilter()
        band.type = "bandpass"
        band.Q.value = 18
        const f = 280 + rng() * 300
        band.frequency.setValueAtTime(f, tt)
        band.frequency.exponentialRampToValueAtTime(f * 3, tt + 0.12)
        const gain = envelope(ctx, tt, 0.005, 0.7, 0.12)
        source.connect(band).connect(gain)
        gain.connect(out)
        gain.connect(send(0.3))
        source.start(tt, rng())
        source.stop(tt + 0.2)
      }
    }
    if (rng() < 0.25 / 40) {
      // distant whale call (rare, soft)
      const osc = ctx.createOscillator()
      osc.frequency.setValueAtTime(150 + rng() * 40, t)
      osc.frequency.linearRampToValueAtTime(260 + rng() * 60, t + 1.4)
      osc.frequency.linearRampToValueAtTime(130 + rng() * 30, t + 3.4)
      const vibrato = lfo(ctx, 4.5, 3, osc.frequency, t)
      const lowpass = ctx.createBiquadFilter()
      lowpass.type = "lowpass"
      lowpass.frequency.value = 900
      const gain = envelope(ctx, t, 0.9, 0.05, 2.8)
      osc.connect(lowpass).connect(gain)
      gain.connect(out)
      gain.connect(send(1.2))
      osc.start(t)
      osc.stop(t + 4.2)
      vibrato.stop(t + 4.2)
    }
    if (rng() < 0.25 / 30) {
      // sonar ping (rare, soft)
      const osc = ctx.createOscillator()
      osc.frequency.value = 1150
      const gain = envelope(ctx, t, 0.01, 0.04, 0.9)
      osc.connect(gain)
      gain.connect(out)
      gain.connect(send(1))
      osc.start(t)
      osc.stop(t + 1)
    }
    if (rng() < 0.25 / 14) {
      // pressure creak
      const source = ctx.createBufferSource()
      source.buffer = noiseBuffer(ctx)
      const band = ctx.createBiquadFilter()
      band.type = "bandpass"
      band.frequency.value = 180 + rng() * 120
      band.Q.value = 9
      const gain = envelope(ctx, t, 0.08, 0.4, 0.45)
      const tremolo = lfo(ctx, 18, 0.2, gain.gain, t)
      source.connect(band).connect(gain).connect(out)
      source.start(t, rng())
      source.stop(t + 0.6)
      tremolo.stop(t + 0.6)
    }
  }
}

export type AmbienceHandle = { stop: (fade?: number) => void }

/**
 * Start an ambience on `ctx` into `destination`. `live` keeps scheduling events
 * with a lookahead pump; offline renders pass `duration` + a seeded rng.
 */
export function createAmbience(
  ctx: BaseAudioContext,
  destination: AudioNode,
  kind: AmbienceKind,
  {
    intensity = AMBIENCE_INTENSITY,
    live = true,
    duration = 0,
    rng = Math.random,
  }: { intensity?: number; live?: boolean; duration?: number; rng?: Rng } = {}
): AmbienceHandle {
  const out = ctx.createGain()
  out.connect(destination)
  const t = ctx.currentTime + 0.02
  out.gain.setValueAtTime(0, t)
  out.gain.linearRampToValueAtTime(LEVEL * intensity, t + FADE_IN)
  const reverb = ctx.createConvolver()
  reverb.buffer = makeImpulse(ctx, 3.2, true)
  const reverbGain = ctx.createGain()
  reverbGain.gain.value = 0.6
  reverb.connect(reverbGain).connect(out)
  const nodes = kind === "deepSea" ? buildDeepSea(ctx, out, t) : []
  let scheduledTo = t
  let timer = 0
  const pump = (): void => {
    const until = ctx.currentTime + 3
    if (until > scheduledTo) {
      deepSeaEvents(ctx, out, reverb, scheduledTo, until, rng)
      scheduledTo = until
    }
  }
  if (live) {
    pump()
    timer = window.setInterval(pump, 1000)
  } else deepSeaEvents(ctx, out, reverb, t, t + duration, rng)
  return {
    stop(fade = FADE_OUT) {
      window.clearInterval(timer)
      const now = ctx.currentTime
      out.gain.cancelScheduledValues(now)
      out.gain.setValueAtTime(out.gain.value, now)
      out.gain.linearRampToValueAtTime(0, now + fade)
      window.setTimeout(
        () => {
          for (const node of nodes) {
            try {
              node.stop()
            } catch {
              // already stopped
            }
          }
          out.disconnect()
        },
        (fade + 0.2) * 1000
      )
    },
  }
}

// ---- app-level singleton (driven by components/sfx-sync)
let current: { kind: AmbienceKind; handle: AmbienceHandle } | null = null
let ambienceMaster: GainNode | null = null

/** Apply the inputs: crossfade old → new, or stop. Never creates audio when off. */
export function syncAmbience(
  input: AmbienceInput,
  getAudio: () => AudioContext | null = getSharedAudio
): void {
  const transition = planAmbience(current?.kind ?? null, input)
  if (transition.stop && current) {
    current.handle.stop()
    current = null
  }
  if (transition.start) {
    const ctx = getAudio()
    if (!ctx) return
    if (!ambienceMaster || ambienceMaster.context !== ctx) {
      ambienceMaster = ctx.createGain()
      ambienceMaster.gain.value = SFX_MASTER_GAIN
      ambienceMaster.connect(ctx.destination)
    }
    current = {
      handle: createAmbience(ctx, ambienceMaster, transition.start),
      kind: transition.start,
    }
  }
}

export function stopAmbience(): void {
  current?.handle.stop()
  current = null
}
