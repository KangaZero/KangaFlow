// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Synthesised achievement-unlock sound (no audio files): a plan of timed
// events per rarity (pure, tested) and a scheduler that turns the plan into
// Web Audio nodes. Gentle levels; layers grow with rarity:
//   riser during the capsule rattle → crack + pop at the open → chime
//   arpeggio at the impact, + low boom from rare, + high shimmer from legendary.

import { rarityLevel, unlockTimeline } from "@/lib/achievement-unlock"
import type { Rarity } from "@/lib/achievements"

export type SoundEvent =
  | {
      kind: "riser"
      at: number
      duration: number
      from: number
      to: number
      gain: number
    }
  | { kind: "crack"; at: number; gain: number }
  | { kind: "pop"; at: number; gain: number }
  | {
      kind: "tone"
      at: number
      duration: number
      frequency: number
      wave: "triangle" | "sine"
      gain: number
    }
  | { kind: "boom"; at: number; gain: number }

// C major arpeggio (C5 E5 G5 C6 E6 G6): more notes for rarer unlocks.
const ARPEGGIO = [523.25, 659.25, 783.99, 1046.5, 1318.51, 1567.98] as const
const SHIMMER = [2093, 2637, 3136] as const
const MASTER = 0.6 // overall gentleness

/**
 * Seconds-from-mount schedule for an unlock. `reduced` (no capsule animation)
 * keeps only the reward chime at the start, so sound never runs ahead of
 * visuals that are not there.
 */
export function unlockSoundPlan(
  rarity: Rarity,
  reduced: boolean
): SoundEvent[] {
  const level = rarityLevel(rarity)
  const t = unlockTimeline(rarity)
  const impact = reduced ? 0 : t.impactAt / 1000
  const events: SoundEvent[] = []
  if (!reduced) {
    events.push({
      at: t.rattleStart / 1000,
      duration: t.rattle / 1000,
      from: 110,
      gain: 0.03 * MASTER,
      kind: "riser",
      to: 440 + level * 120,
    })
    events.push({
      at: t.openAt / 1000,
      gain: (0.25 + level * 0.03) * MASTER,
      kind: "crack",
    })
    if (level >= 3)
      events.push({
        at: t.openAt / 1000 + 0.06,
        gain: 0.2 * MASTER,
        kind: "crack",
      })
    events.push({ at: t.openAt / 1000, gain: 0.18 * MASTER, kind: "pop" })
  }
  ARPEGGIO.slice(0, 2 + level).forEach((frequency, i) => {
    events.push({
      at: impact + i * 0.065,
      duration: 0.5 + level * 0.1,
      frequency,
      gain: (0.08 + level * 0.012) * MASTER,
      kind: "tone",
      wave: "triangle",
    })
  })
  if (level >= 2) events.push({ at: impact, gain: 0.22 * MASTER, kind: "boom" })
  if (level >= 3) {
    SHIMMER.forEach((frequency, i) => {
      events.push({
        at: impact + 0.25 + i * 0.05,
        duration: 0.9,
        frequency,
        gain: 0.025 * MASTER,
        kind: "tone",
        wave: "sine",
      })
    })
  }
  return events
}

/** The slice of the Web Audio API the scheduler uses (lets tests pass a fake). */
export type AudioLike = Pick<
  AudioContext,
  | "currentTime"
  | "destination"
  | "sampleRate"
  | "createOscillator"
  | "createGain"
  | "createBiquadFilter"
  | "createBuffer"
  | "createBufferSource"
>

function envelope(
  audio: AudioLike,
  start: number,
  peak: number,
  release: number
): GainNode {
  const gain = audio.createGain()
  gain.gain.setValueAtTime(0, start)
  gain.gain.linearRampToValueAtTime(peak, start + 0.012)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + release)
  gain.connect(audio.destination)
  return gain
}

function oscillator(
  audio: AudioLike,
  type: OscillatorType,
  frequency: number,
  start: number,
  stop: number
): OscillatorNode {
  const osc = audio.createOscillator()
  osc.type = type
  osc.frequency.setValueAtTime(frequency, start)
  osc.start(start)
  osc.stop(stop)
  return osc
}

/** Build every node for `plan`, offset from the context's current time. */
export function scheduleUnlockSound(
  audio: AudioLike,
  plan: readonly SoundEvent[]
): void {
  const t0 = audio.currentTime
  for (const event of plan) {
    const start = t0 + event.at
    switch (event.kind) {
      case "tone": {
        const out = envelope(audio, start, event.gain, event.duration)
        oscillator(
          audio,
          event.wave,
          event.frequency,
          start,
          start + event.duration + 0.05
        ).connect(out)
        break
      }
      case "riser": {
        const gain = audio.createGain()
        gain.gain.setValueAtTime(0, start)
        gain.gain.linearRampToValueAtTime(
          event.gain,
          start + event.duration * 0.9
        )
        gain.gain.linearRampToValueAtTime(0, start + event.duration)
        gain.connect(audio.destination)
        const osc = oscillator(
          audio,
          "sawtooth",
          event.from,
          start,
          start + event.duration + 0.05
        )
        osc.frequency.exponentialRampToValueAtTime(
          event.to,
          start + event.duration
        )
        osc.connect(gain)
        break
      }
      case "crack": {
        // Short decaying noise burst through a bandpass: the capsule splitting.
        const length = Math.floor(audio.sampleRate * 0.14)
        const buffer = audio.createBuffer(1, length, audio.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < length; i++)
          data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 2
        const source = audio.createBufferSource()
        source.buffer = buffer
        const band = audio.createBiquadFilter()
        band.type = "bandpass"
        band.frequency.value = 1900
        band.Q.value = 0.9
        source.connect(band).connect(envelope(audio, start, event.gain, 0.14))
        source.start(start)
        break
      }
      case "pop": {
        const out = envelope(audio, start, event.gain, 0.1)
        const osc = oscillator(audio, "sine", 950, start, start + 0.12)
        osc.frequency.exponentialRampToValueAtTime(180, start + 0.09)
        osc.connect(out)
        break
      }
      case "boom": {
        const out = envelope(audio, start, event.gain, 0.45)
        const osc = oscillator(audio, "sine", 140, start, start + 0.5)
        osc.frequency.exponentialRampToValueAtTime(45, start + 0.4)
        osc.connect(out)
        break
      }
    }
  }
}

/**
 * Play only when the user opted in. The context comes from `getAudio`, which is
 * NOT called at all when sound is off, so nothing is created in that case.
 * Returns whether anything was scheduled.
 */
export function playUnlockSound({
  enabled,
  rarity,
  reduced,
  getAudio,
}: {
  enabled: boolean
  rarity: Rarity
  reduced: boolean
  getAudio: () => AudioLike | null
}): boolean {
  if (!enabled) return false
  const audio = getAudio()
  if (!audio) return false
  scheduleUnlockSound(audio, unlockSoundPlan(rarity, reduced))
  return true
}

let shared: AudioContext | null = null

/**
 * One lazily-created AudioContext. Browsers start it suspended until a user
 * gesture (autoplay policy); `resume()` is attempted and a refusal is ignored,
 * so the worst case is silence. `null` where Web Audio is unavailable.
 */
export function getSharedAudio(): AudioContext | null {
  if (
    typeof window === "undefined" ||
    typeof window.AudioContext !== "function"
  )
    return null
  try {
    shared ??= new window.AudioContext()
  } catch {
    return null
  }
  if (shared.state === "suspended") shared.resume().catch(() => undefined)
  return shared
}
