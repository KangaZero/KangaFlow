// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Renders an SfxPlan into Web Audio nodes: the role timbres plus a shared
// convolution-reverb bus (synthetic impulse responses, a bright hall and a
// darker short room for negatives). Browser-only; plans are tested instead.

import { lydian, type SfxEvent, type SfxPlan } from "@/lib/sfx/catalog"

type Bus = { dry: GainNode; wet: ConvolverNode; dark: ConvolverNode }
const buses = new WeakMap<AudioNode, Bus>()
const noiseBuffers = new WeakMap<BaseAudioContext, AudioBuffer>()

export function noiseBuffer(ctx: BaseAudioContext): AudioBuffer {
  const cached = noiseBuffers.get(ctx)
  if (cached) return cached
  const buffer = ctx.createBuffer(
    1,
    Math.floor(ctx.sampleRate * 2),
    ctx.sampleRate
  )
  const data = buffer.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  noiseBuffers.set(ctx, buffer)
  return buffer
}

/** Exponentially decaying stereo noise; `dark` smooths it (duller tail). */
export function makeImpulse(
  ctx: BaseAudioContext,
  seconds: number,
  dark: boolean
): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * seconds)
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate)
  for (let channel = 0; channel < 2; channel++) {
    const data = buffer.getChannelData(channel)
    let previous = 0
    for (let i = 0; i < length; i++) {
      let x = Math.random() * 2 - 1
      if (dark) {
        previous = previous * 0.88 + x * 0.12
        x = previous * 2.6
      }
      data[i] = x * (1 - i / length) ** (dark ? 3.4 : 2.6)
    }
  }
  return buffer
}

function bus(ctx: BaseAudioContext, master: AudioNode): Bus {
  const cached = buses.get(master)
  if (cached) return cached
  const dry = ctx.createGain()
  dry.connect(master)
  const wet = ctx.createConvolver()
  wet.buffer = makeImpulse(ctx, 2.2, false)
  const wetGain = ctx.createGain()
  wetGain.gain.value = 0.55
  wet.connect(wetGain).connect(master)
  const dark = ctx.createConvolver()
  dark.buffer = makeImpulse(ctx, 1.4, true)
  const darkGain = ctx.createGain()
  darkGain.gain.value = 0.45
  dark.connect(darkGain).connect(master)
  const created = { dark, dry, wet }
  buses.set(master, created)
  return created
}

function envelope(
  ctx: BaseAudioContext,
  t: number,
  attack: number,
  peak: number,
  decay: number,
  hold = 0
): GainNode {
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.linearRampToValueAtTime(peak, t + attack)
  if (hold > 0) gain.gain.setValueAtTime(peak, t + attack + hold)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + hold + decay)
  return gain
}

function tone(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  f: number,
  dur: number,
  gain: number,
  wave: OscillatorType = "sine",
  attack = 0.003,
  to?: number
): void {
  const osc = ctx.createOscillator()
  osc.type = wave
  osc.frequency.setValueAtTime(f, t)
  if (to !== undefined)
    osc.frequency.exponentialRampToValueAtTime(to, t + attack + dur)
  osc.connect(envelope(ctx, t, attack, gain, dur)).connect(out)
  osc.start(t)
  osc.stop(t + attack + dur + 0.05)
}

function noise(
  ctx: BaseAudioContext,
  out: AudioNode,
  t: number,
  dur: number,
  gain: number,
  filter: BiquadFilterType,
  from: number,
  to?: number,
  q = 1,
  attack = 0.003
): void {
  const source = ctx.createBufferSource()
  source.buffer = noiseBuffer(ctx)
  const band = ctx.createBiquadFilter()
  band.type = filter
  band.Q.value = q
  band.frequency.setValueAtTime(from, t)
  if (to !== undefined)
    band.frequency.exponentialRampToValueAtTime(to, t + attack + dur)
  source
    .connect(band)
    .connect(envelope(ctx, t, attack, gain, dur))
    .connect(out)
  source.start(t, Math.random())
  source.stop(t + attack + dur + 0.05)
}

function renderEvent(
  ctx: BaseAudioContext,
  out: AudioNode,
  t0: number,
  event: SfxEvent
): void {
  const t = t0 + event.at
  switch (event.kind) {
    case "celesta": // music box: inharmonic bell partials, fast decay
      for (const [ratio, amp] of [
        [1, 1],
        [2.76, 0.42],
        [5.4, 0.18],
        [8.93, 0.07],
      ] as const)
        tone(
          ctx,
          out,
          t,
          event.f * ratio,
          event.dur / Math.sqrt(ratio),
          event.gain * amp,
          "sine",
          0.0015
        )
      return
    case "crystal": // glass chime: high partials + a detuned shimmer pair
      for (const [ratio, amp, cents] of [
        [1, 1, 0],
        [1, 0.55, 8],
        [2, 0.32, -6],
        [3, 0.16, 5],
        [4.2, 0.07, 0],
      ] as const)
        tone(
          ctx,
          out,
          t,
          event.f * ratio * 2 ** (cents / 1200),
          event.dur,
          event.gain * amp,
          "sine",
          0.004
        )
      return
    case "pluck": {
      // harp-ish: triangle through a closing lowpass
      const osc = ctx.createOscillator()
      osc.type = "triangle"
      osc.frequency.value = event.f
      const lowpass = ctx.createBiquadFilter()
      lowpass.type = "lowpass"
      lowpass.frequency.setValueAtTime(Math.min(event.f * 9, 14000), t)
      lowpass.frequency.exponentialRampToValueAtTime(
        event.f * 1.1,
        t + event.dur
      )
      osc
        .connect(lowpass)
        .connect(envelope(ctx, t, 0.0015, event.gain, event.dur))
        .connect(out)
      osc.start(t)
      osc.stop(t + event.dur + 0.05)
      return
    }
    case "bloop":
      tone(
        ctx,
        out,
        t,
        event.f,
        event.dur,
        event.gain,
        "sine",
        0.003,
        event.f * 2.1
      )
      return
    case "plink":
      tone(ctx, out, t, event.f, event.dur, event.gain, "sine", 0.001)
      tone(
        ctx,
        out,
        t,
        event.f * 3,
        event.dur * 0.5,
        event.gain * 0.3,
        "sine",
        0.001
      )
      return
    case "choir": {
      // detuned saws → lowpass, gentle vibrato
      const lowpass = ctx.createBiquadFilter()
      lowpass.type = "lowpass"
      lowpass.frequency.value = 1500
      lowpass.Q.value = 0.3
      lowpass
        .connect(envelope(ctx, t, event.attack, event.gain, event.dur))
        .connect(out)
      const end = t + event.attack + event.dur + 0.1
      for (const f of event.freqs) {
        for (const cents of [-9, 0, 8]) {
          const osc = ctx.createOscillator()
          osc.type = "sawtooth"
          osc.frequency.value = f * 2 ** (cents / 1200)
          const lfo = ctx.createOscillator()
          lfo.frequency.value = 4.2 + Math.random() * 1.2
          const depth = ctx.createGain()
          depth.gain.value = f * 0.004
          lfo.connect(depth).connect(osc.frequency)
          osc.connect(lowpass)
          osc.start(t)
          lfo.start(t)
          osc.stop(end)
          lfo.stop(end)
        }
      }
      return
    }
    case "sparkle": // ✨ high pings + bright noise ticks, randomised per play
      for (let i = 0; i < event.count; i++) {
        const tt = t + Math.random() * event.spread
        tone(
          ctx,
          out,
          tt,
          lydian(14 + Math.floor(Math.random() * 7)),
          0.16,
          event.gain * (0.5 + Math.random() * 0.5),
          "sine",
          0.001
        )
        if (i % 2 === 0)
          noise(
            ctx,
            out,
            tt,
            0.03,
            event.gain * 0.55,
            "bandpass",
            7600,
            undefined,
            4
          )
      }
      return
    case "thud": // hollow wooden knock
      tone(ctx, out, t, event.f, 0.18, event.gain, "sine", 0.002, event.f * 0.5)
      tone(
        ctx,
        out,
        t,
        event.f * 2.31,
        0.06,
        event.gain * 0.3,
        "triangle",
        0.001
      )
      noise(ctx, out, t, 0.05, event.gain * 0.45, "bandpass", 420, undefined, 3)
      return
    case "swoosh":
      noise(
        ctx,
        out,
        t,
        event.dur,
        event.gain,
        "bandpass",
        event.from,
        event.to,
        1.1,
        event.dur * 0.35
      )
      return
    case "meow": {
      // saw through a gliding bandpass formant
      const saw = ctx.createOscillator()
      saw.type = "sawtooth"
      saw.frequency.setValueAtTime(520, t)
      saw.frequency.linearRampToValueAtTime(780, t + 0.15)
      saw.frequency.linearRampToValueAtTime(590, t + 0.38)
      const formant = ctx.createBiquadFilter()
      formant.type = "bandpass"
      formant.Q.value = 6
      formant.frequency.setValueAtTime(700, t)
      formant.frequency.linearRampToValueAtTime(1150, t + 0.15)
      formant.frequency.linearRampToValueAtTime(780, t + 0.38)
      saw
        .connect(formant)
        .connect(envelope(ctx, t, 0.04, event.gain, 0.32))
        .connect(out)
      saw.start(t)
      saw.stop(t + 0.42)
      return
    }
    case "tone":
      tone(
        ctx,
        out,
        t,
        event.f,
        event.dur,
        event.gain,
        event.wave,
        0.01,
        event.to
      )
      return
    case "clicks":
      for (let i = 0; i < event.count; i++)
        noise(
          ctx,
          out,
          t + i * event.spacing,
          0.02,
          event.gain,
          "highpass",
          2600
        )
      return
  }
}

/** Duration (s) until the plan's last event has decayed (for voice tracking). */
export function planDuration(plan: SfxPlan): number {
  return (
    Math.max(
      ...plan.events.map(
        (event) =>
          event.at +
          ("dur" in event ? event.dur : 0.4) +
          ("attack" in event ? event.attack : 0)
      )
    ) + 0.3
  )
}

export function renderPlan(
  ctx: BaseAudioContext,
  master: AudioNode,
  plan: SfxPlan,
  startAt: number
): void {
  const b = bus(ctx, master)
  const out = ctx.createGain()
  out.connect(b.dry)
  if (plan.wet > 0) {
    const send = ctx.createGain()
    send.gain.value = plan.wet
    out.connect(send).connect(plan.dark ? b.dark : b.wet)
  }
  for (const event of plan.events) renderEvent(ctx, out, startAt, event)
}
