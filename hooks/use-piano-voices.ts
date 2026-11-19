// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { useCallback, useEffect, useRef } from "react"

import { frequency } from "@/lib/piano"
import { gatedSharedAudio, sfxMaster } from "@/lib/sfx/play"

export const PIANO_SOUNDS = ["grand", "celesta", "chip"] as const
export type PianoSound = (typeof PIANO_SOUNDS)[number]
export const PIANO_VOLUMES = [0, 1, 2, 3] as const
export type PianoVolume = (typeof PIANO_VOLUMES)[number]

// Each voice: additive partials (wave, frequency multiple, level) and how
// long the note takes to fall to a quarter of its attack.
const VOICES: Record<
  PianoSound,
  {
    partials: readonly (readonly [OscillatorType, number, number])[]
    decay: number
  }
> = {
  celesta: {
    decay: 1.2,
    partials: [
      ["sine", 1, 0.6],
      ["sine", 4, 0.2],
    ],
  },
  chip: { decay: 0.6, partials: [["square", 1, 0.25]] },
  grand: {
    decay: 2.4,
    partials: [
      ["triangle", 1, 0.7],
      ["sine", 2, 0.25],
      ["sine", 3, 0.08],
    ],
  },
}
const VOLUME_GAIN: Record<PianoVolume, number> = { 0: 0, 1: 0.35, 2: 0.7, 3: 1 }
const RELEASE_S = 0.35

type Voice = { release: () => void }

/**
 * Polyphonic synth voices for the piano, routed through the site's sound
 * gate (the Sound effects setting + first gesture) and its master gain, so
 * the piano obeys the same switch as every other sound. start/stop are
 * stable; the current sound and volume are read when a note starts.
 */
export function usePianoVoices(sound: PianoSound, volume: PianoVolume) {
  const voices = useRef(new Map<number, Voice>())
  const settings = useRef({ sound, volume })
  settings.current = { sound, volume }

  const stop = useCallback((midi: number) => {
    voices.current.get(midi)?.release()
    voices.current.delete(midi)
  }, [])

  const start = useCallback((midi: number) => {
    if (voices.current.has(midi)) return
    // Volume 0 is a real mute: schedule nothing (rather than a note at a
    // near-zero gain, which exponential ramps can't reach 0 from anyway).
    const level = VOLUME_GAIN[settings.current.volume]
    if (level === 0) return
    const ctx = gatedSharedAudio()
    if (!ctx) return
    const { decay, partials } = VOICES[settings.current.sound]
    const now = ctx.currentTime
    const envelope = ctx.createGain()
    envelope.gain.setValueAtTime(0.0001, now)
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(level, 0.0001),
      now + 0.008
    )
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(level * 0.25, 0.0001),
      now + decay * 0.3
    )
    envelope.connect(sfxMaster(ctx))
    const oscillators = partials.map(([type, multiple, amount]) => {
      const oscillator = ctx.createOscillator()
      const partial = ctx.createGain()
      oscillator.type = type
      oscillator.frequency.value = frequency(midi) * multiple
      partial.gain.value = amount
      oscillator.connect(partial).connect(envelope)
      oscillator.start(now)
      return oscillator
    })
    voices.current.set(midi, {
      release: () => {
        const t = ctx.currentTime
        envelope.gain.cancelScheduledValues(t)
        envelope.gain.setValueAtTime(Math.max(envelope.gain.value, 0.0001), t)
        envelope.gain.exponentialRampToValueAtTime(0.0001, t + RELEASE_S)
        for (const oscillator of oscillators)
          oscillator.stop(t + RELEASE_S + 0.05)
      },
    })
  }, [])

  const stopAll = useCallback(() => {
    for (const midi of [...voices.current.keys()]) stop(midi)
  }, [stop])

  // Never leave notes ringing after the piano unmounts.
  useEffect(() => stopAll, [stopAll])

  /** MIDI notes currently sounding (held or sustained). */
  const sounding = useCallback(() => [...voices.current.keys()], [])

  return { sounding, start, stop, stopAll }
}
