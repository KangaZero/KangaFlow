"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The full-screen 88-key piano behind the Education card's "Play all 88
// keys" chip. Cult UI's ExpandableScreen technique (a Motion layoutId
// shared between the trigger's background and the full-screen panel, so
// one morphs into the other), built on Radix Dialog instead of copying
// that component: Radix brings the focus trap, Escape, focus return to the
// trigger and a scroll lock that restores what was there before.
//
// Inside: pause-menu settings rows (sound, labels, key, mode, octave,
// sustain, volume), a readout naming the note / interval / chord in the
// chosen key (lib/piano), the 88 keys, and computer-keyboard play. On
// narrow screens the rows slide in from the side behind a Settings toggle.

import { Maximize2, SlidersHorizontal } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import { Dialog } from "radix-ui"
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import {
  PIANO_SOUNDS,
  PIANO_VOLUMES,
  type PianoSound,
  type PianoVolume,
  usePianoVoices,
} from "@/hooks/use-piano-voices"
import { interpolate } from "@/lib/i18n"
import {
  BINDING_LABELS,
  BOUND_SPAN,
  clampOctave,
  detectChord,
  frequency,
  intervalName,
  isBoundCode,
  KEY_BINDINGS,
  MODE_IDS,
  type ModeId,
  musicalKey,
  noteName,
  OCTAVES,
  type Octave,
  octaveBase,
  PIANO_KEYS,
  PITCH_CLASSES,
  type PitchClass,
  pitchClass,
  pitchName,
} from "@/lib/piano"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

const LAYOUT_ID = "piano-screen"
const LABEL_MODES = ["off", "notes", "keys"] as const
type LabelMode = (typeof LABEL_MODES)[number]
const ROW_IDS = [
  "sound",
  "labels",
  "tonic",
  "mode",
  "octave",
  "sustain",
  "volume",
] as const
type RowId = (typeof ROW_IDS)[number]

type Settings = {
  sound: PianoSound
  labels: LabelMode
  tonic: PitchClass
  mode: ModeId
  octave: Octave
  sustain: boolean
  volume: PianoVolume
}
const DEFAULTS: Settings = {
  labels: "notes",
  mode: "major",
  octave: 4,
  sound: "grand",
  sustain: false,
  tonic: 0,
  volume: 2,
}

/** Step `value` by `delta` through `list` (wrapping or clamped). */
function stepIn<T>(
  list: readonly T[],
  value: T,
  delta: number,
  wrap: boolean
): T {
  const index = list.indexOf(value)
  const next = wrap
    ? (((index + delta) % list.length) + list.length) % list.length
    : Math.max(0, Math.min(list.length - 1, index + delta))
  return list[next] ?? value
}

type Reading = { big: string; notes: string; fn: string; diatonic: boolean }

export function PianoScreen({ reduced }: { reduced: boolean }) {
  const { translate } = useLocale()
  const { soundEffects, setSoundEffects } = useGlobalStates()
  const [open, setOpen] = useState(false)

  return (
    <Dialog.Root onOpenChange={setOpen} open={open}>
      <Dialog.Trigger asChild>
        <button className="pz-open" type="button">
          {open ? null : (
            <motion.span
              className="pz-open-bg"
              layoutId={LAYOUT_ID}
              transition={reduced ? { duration: 0 } : { duration: 0.4 }}
            />
          )}
          <span className="pz-open-label">
            {translate("about.piano.playAll")}
            <Maximize2 aria-hidden className="size-3" />
          </span>
        </button>
      </Dialog.Trigger>
      <AnimatePresence>
        {open ? (
          <PianoPanel
            key="panel"
            onEnableSound={() => setSoundEffects(true)}
            reduced={reduced}
            soundOn={soundEffects}
          />
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}

function PianoPanel({
  reduced,
  soundOn,
  onEnableSound,
}: {
  reduced: boolean
  soundOn: boolean
  onEnableSound: () => void
}) {
  const { translate } = useLocale()
  const [settings, setSettings] = useState<Settings>(DEFAULTS)
  const [row, setRow] = useState<RowId>("sound")
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [down, setDown] = useState<ReadonlySet<number>>(new Set())
  // Mirror of `down` for event handlers, so updates stay pure (no setState
  // inside another setState's updater).
  const downRef = useRef<ReadonlySet<number>>(down)
  const [reading, setReading] = useState<Reading | null>(null)
  const [hits, setHits] = useState(0)
  const voices = usePianoVoices(settings.sound, settings.volume)
  const panelRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const keyHeld = useRef(new Set<number>())
  const pointerHeld = useRef(new Set<number>())
  const pointerDown = useRef(false)
  const spaceSustain = useRef(false)
  const sustainRef = useRef(settings.sustain)
  sustainRef.current = settings.sustain

  const key = musicalKey(settings.tonic, settings.mode)
  const base = octaveBase(settings.octave)
  const keyLabel = `${pitchName(settings.tonic, key)} ${translate(`about.piano.modes.${settings.mode}`)}`

  // The readout follows the keys being pressed (not notes ringing on under
  // sustain), and only a new press changes it: letting go one key at a time
  // would otherwise walk the reading down to a single note.
  const describe = (pressed: readonly number[]): Reading => {
    const sorted = pressed.toSorted((a, b) => a - b)
    const notes = sorted.map((midi) => noteName(midi, key)).join(" · ")
    const [low] = sorted
    const high = sorted.at(-1)
    if (sorted.length === 1 && low !== undefined)
      return {
        big: noteName(low, key),
        diatonic: true,
        fn: "",
        notes: `${frequency(low).toFixed(2)} Hz · MIDI ${low}`,
      }
    const chord = detectChord(sorted, key)
    if (chord)
      return {
        big: chord.name,
        diatonic: chord.diatonic,
        fn: chord.roman
          ? interpolate(translate("about.piano.inKey"), {
              key: keyLabel,
              rn: chord.roman,
            })
          : translate("about.piano.outside"),
        notes,
      }
    return {
      big:
        sorted.length === 2 && low !== undefined && high !== undefined
          ? intervalName(low, high)
          : "?",
      diatonic: true,
      fn: "",
      notes,
    }
  }

  const press = (midi: number) => {
    voices.start(midi)
    const next = new Set(downRef.current).add(midi)
    downRef.current = next
    setDown(next)
    setReading(describe([...next]))
    setHits((n) => n + 1)
  }
  const release = useCallback(
    (midi: number) => {
      const next = new Set(downRef.current)
      next.delete(midi)
      downRef.current = next
      setDown(next)
      if (!sustainRef.current) voices.stop(midi)
    },
    [voices]
  )

  const update = <K extends keyof Settings>(id: K, value: Settings[K]) => {
    setSettings((previous) => ({ ...previous, [id]: value }))
    // Turning sustain off lets go of every note no longer held down.
    if (id === "sustain" && value === false)
      for (const midi of voices.sounding())
        if (!keyHeld.current.has(midi) && !pointerHeld.current.has(midi))
          voices.stop(midi)
  }

  // One description per settings row: its options and how to step them.
  const rows: Record<RowId, { label: string; step: (delta: number) => void }> =
    {
      labels: {
        label: translate("about.piano.labels"),
        step: (d) =>
          update("labels", stepIn(LABEL_MODES, settings.labels, d, false)),
      },
      mode: {
        label: translate("about.piano.mode"),
        step: (d) => update("mode", stepIn(MODE_IDS, settings.mode, d, true)),
      },
      octave: {
        label: translate("about.piano.octave"),
        step: (d) => update("octave", clampOctave(settings.octave + d)),
      },
      sound: {
        label: translate("about.piano.sound"),
        step: (d) =>
          update("sound", stepIn(PIANO_SOUNDS, settings.sound, d, false)),
      },
      sustain: {
        label: translate("about.piano.sustain"),
        step: (d) => update("sustain", d > 0),
      },
      tonic: {
        label: translate("about.piano.tonic"),
        step: (d) =>
          update("tonic", stepIn(PITCH_CLASSES, settings.tonic, d, true)),
      },
      volume: {
        label: translate("about.piano.volume"),
        step: (d) =>
          update("volume", stepIn(PIANO_VOLUMES, settings.volume, d, false)),
      },
    }

  // Keep the bound octave in view: when it moves, and once the open morph
  // has finished (mid-morph the panel is still chip-sized, so a scroll
  // computed then lands near A0).
  const centreBoard = useCallback(() => {
    const scroller = scrollRef.current
    const c = scroller?.querySelector<HTMLElement>(`[data-midi="${base}"]`)
    if (!scroller || !c) return
    scroller.scrollTo({
      behavior: reduced ? "auto" : "smooth",
      left: c.offsetLeft - scroller.clientWidth / 2 + c.offsetWidth * 5,
    })
  }, [base, reduced])
  useEffect(centreBoard, [centreBoard])

  // Pointer notes end wherever the pointer is released.
  useEffect(() => {
    const end = () => {
      pointerDown.current = false
      for (const midi of pointerHeld.current) release(midi)
      pointerHeld.current.clear()
    }
    window.addEventListener("pointerup", end)
    window.addEventListener("pointercancel", end)
    return () => {
      window.removeEventListener("pointerup", end)
      window.removeEventListener("pointercancel", end)
    }
  }, [release])

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return
    const onControl = event.target instanceof HTMLButtonElement
    if (isBoundCode(event.code)) {
      event.preventDefault()
      const midi = base + KEY_BINDINGS[event.code]
      if (event.repeat || keyHeld.current.has(midi)) return
      keyHeld.current.add(midi)
      press(midi)
      return
    }
    if (event.repeat) return
    if (event.code === "KeyZ" || event.code === "KeyX") {
      update(
        "octave",
        clampOctave(settings.octave + (event.code === "KeyX" ? 1 : -1))
      )
      return
    }
    // Space holds sustain, except on a focused control, where it presses it.
    if (event.code === "Space" && !onControl) {
      event.preventDefault()
      spaceSustain.current = true
      update("sustain", true)
      return
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault()
      setRow((current) =>
        stepIn(ROW_IDS, current, event.key === "ArrowDown" ? 1 : -1, true)
      )
      return
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      rows[row].step(event.key === "ArrowRight" ? 1 : -1)
    }
  }
  const onKeyUp = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (isBoundCode(event.code)) {
      const midi = base + KEY_BINDINGS[event.code]
      keyHeld.current.delete(midi)
      release(midi)
    }
    if (event.code === "Space" && spaceSustain.current) {
      spaceSustain.current = false
      update("sustain", false)
    }
  }

  const onBoardPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    const midi = midiOf(event.target)
    if (midi === undefined) return
    pointerDown.current = true
    pointerHeld.current.add(midi)
    press(midi)
  }
  // Mouse glissando: sliding across keys while the button is held.
  const onBoardPointerOver = (event: ReactPointerEvent<HTMLDivElement>) => {
    const midi = midiOf(event.target)
    if (
      !pointerDown.current ||
      event.pointerType !== "mouse" ||
      midi === undefined
    )
      return
    pointerHeld.current.add(midi)
    press(midi)
  }
  const onBoardPointerOut = (event: ReactPointerEvent<HTMLDivElement>) => {
    const midi = midiOf(event.target)
    if (midi === undefined || !pointerHeld.current.has(midi)) return
    pointerHeld.current.delete(midi)
    release(midi)
  }

  const fade = reduced ? { duration: 0 } : { duration: 0.25 }
  const label = (midi: number) => {
    const offset = midi - base
    if (settings.labels === "keys") return BINDING_LABELS.get(offset) ?? ""
    if (settings.labels === "notes" && pitchClass(midi) === 0)
      return noteName(midi, key)
    return ""
  }

  return (
    <Dialog.Portal forceMount>
      {/* Radix applies its scroll lock in the Overlay; the panel covers the
          screen, so the overlay itself stays transparent. */}
      <Dialog.Overlay className="pz-overlay" forceMount />
      <Dialog.Content
        aria-describedby={undefined}
        className="pz"
        data-reduced={reduced}
        data-settings={settingsOpen ? "open" : "closed"}
        forceMount
        onEscapeKeyDown={(event) => {
          // Escape closes the side panel first on narrow screens.
          if (!settingsOpen) return
          event.preventDefault()
          setSettingsOpen(false)
        }}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onOpenAutoFocus={(event) => {
          // Focus the panel itself, so the bound keys play right away
          // instead of activating the first button.
          event.preventDefault()
          panelRef.current?.focus({ preventScroll: true })
        }}
      >
        <motion.div
          className="pz-panel"
          layoutId={LAYOUT_ID}
          onLayoutAnimationComplete={centreBoard}
          ref={panelRef}
          tabIndex={-1}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.42, ease: [0.25, 1, 0.5, 1] }
          }
        >
          <motion.div
            animate={{ opacity: 1 }}
            className="pz-layout"
            exit={{ opacity: 0, transition: { duration: reduced ? 0 : 0.12 } }}
            initial={{ opacity: 0 }}
            transition={{ ...fade, delay: reduced ? 0 : 0.18 }}
          >
            <div className="pz-head">
              <Dialog.Title className="pz-title">
                {translate("about.piano.title")}
              </Dialog.Title>
              <span aria-hidden className="pz-title-ja">
                ピアノ
              </span>
              <div className="pz-head-actions">
                <button
                  aria-expanded={settingsOpen}
                  aria-label={translate(
                    settingsOpen
                      ? "about.piano.hideSettings"
                      : "about.piano.showSettings"
                  )}
                  className="pz-settings-toggle"
                  onClick={() => setSettingsOpen((value) => !value)}
                  type="button"
                >
                  <SlidersHorizontal
                    aria-hidden
                    className="inline size-4 align-[-3px]"
                  />{" "}
                  {translate("about.piano.settings")}
                </button>
                <Dialog.Close
                  aria-label={translate("about.piano.closeLabel")}
                  className="pz-close"
                >
                  {translate("about.piano.close")}
                </Dialog.Close>
              </div>
            </div>

            <div className="pz-body">
              <ul
                aria-label={translate("about.piano.settings")}
                className="pz-rows"
              >
                <SettingRow
                  current={row === "sound"}
                  label={rows.sound.label}
                  onFocus={() => setRow("sound")}
                >
                  <Options
                    label={rows.sound.label}
                    onChange={(value) => update("sound", value)}
                    options={PIANO_SOUNDS.map((id) => ({
                      id,
                      label: translate(`about.piano.sounds.${id}`),
                    }))}
                    value={settings.sound}
                  />
                </SettingRow>
                <SettingRow
                  current={row === "labels"}
                  label={rows.labels.label}
                  onFocus={() => setRow("labels")}
                >
                  <Options
                    label={rows.labels.label}
                    onChange={(value) => update("labels", value)}
                    options={LABEL_MODES.map((id) => ({
                      id,
                      label: translate(`about.piano.labelOptions.${id}`),
                    }))}
                    value={settings.labels}
                  />
                </SettingRow>
                <SettingRow
                  current={row === "tonic"}
                  label={rows.tonic.label}
                  onFocus={() => setRow("tonic")}
                >
                  <Stepper
                    label={rows.tonic.label}
                    onStep={rows.tonic.step}
                    value={pitchName(settings.tonic, key)}
                  />
                </SettingRow>
                <SettingRow
                  current={row === "mode"}
                  label={rows.mode.label}
                  onFocus={() => setRow("mode")}
                >
                  <Stepper
                    label={rows.mode.label}
                    onStep={rows.mode.step}
                    value={translate(`about.piano.modes.${settings.mode}`)}
                  />
                </SettingRow>
                <SettingRow
                  current={row === "octave"}
                  label={rows.octave.label}
                  onFocus={() => setRow("octave")}
                >
                  <Options
                    label={rows.octave.label}
                    onChange={(value) => update("octave", value)}
                    options={OCTAVES.map((id) => ({ id, label: String(id) }))}
                    value={settings.octave}
                  />
                </SettingRow>
                <SettingRow
                  current={row === "sustain"}
                  label={rows.sustain.label}
                  onFocus={() => setRow("sustain")}
                >
                  <Options
                    label={rows.sustain.label}
                    onChange={(value) => update("sustain", value)}
                    options={[
                      { id: false, label: translate("about.piano.off") },
                      { id: true, label: translate("about.piano.on") },
                    ]}
                    value={settings.sustain}
                  />
                </SettingRow>
                <SettingRow
                  current={row === "volume"}
                  label={rows.volume.label}
                  onFocus={() => setRow("volume")}
                >
                  <Options
                    label={rows.volume.label}
                    onChange={(value) => update("volume", value)}
                    options={PIANO_VOLUMES.map((id) => ({
                      id,
                      label: String(id),
                    }))}
                    value={settings.volume}
                  />
                </SettingRow>
              </ul>

              <div
                aria-live="polite"
                className="pz-readout"
                data-idle={down.size === 0}
              >
                <span className="pz-keyname">{keyLabel}</span>
                <span
                  className="pz-big"
                  data-hit={hits > 0 && down.size > 0}
                  key={hits}
                >
                  {reading?.big ?? "♪"}
                </span>
                <span
                  className="pz-function"
                  data-diatonic={reading?.diatonic ?? true}
                >
                  {reading?.fn ?? ""}
                </span>
                <span className="pz-notes">
                  {reading?.notes ?? translate("about.piano.keys")}
                </span>
                {soundOn ? null : (
                  <p className="pz-sound-off">
                    {translate("about.piano.soundOff")}
                    <button onClick={onEnableSound} type="button">
                      {translate("about.piano.turnOn")}
                    </button>
                  </p>
                )}
              </div>
            </div>

            <div className="pz-board-scroll" ref={scrollRef}>
              {/* biome-ignore lint/a11y/useSemanticElements: a keyboard of buttons, not a form; <fieldset> adds form semantics and UA border/min-width quirks. */}
              <div
                aria-label={translate("about.piano.keys")}
                className="pz-board"
                onPointerDown={onBoardPointerDown}
                onPointerOut={onBoardPointerOut}
                onPointerOver={onBoardPointerOver}
                role="group"
              >
                {PIANO_KEYS.map((pianoKey) => {
                  const offset = pianoKey.midi - base
                  return (
                    <button
                      aria-label={noteName(pianoKey.midi, key)}
                      data-black={pianoKey.black}
                      data-bound={offset >= 0 && offset <= BOUND_SPAN}
                      data-down={down.has(pianoKey.midi)}
                      data-in-scale={key.scale.includes(
                        pitchClass(pianoKey.midi)
                      )}
                      data-midi={pianoKey.midi}
                      key={pianoKey.midi}
                      style={
                        pianoKey.black
                          ? { "--at": pianoKey.whiteIndex }
                          : undefined
                      }
                      tabIndex={-1}
                      type="button"
                    >
                      {label(pianoKey.midi)}
                    </button>
                  )
                })}
              </div>
            </div>

            <p aria-hidden className="pz-foot">
              <span>
                <kbd>A</kbd>–<kbd>;</kbd> {translate("about.piano.footer.play")}
              </span>
              <span>
                <kbd>Z</kbd>
                <kbd>X</kbd> {translate("about.piano.footer.octave")}
              </span>
              <span>
                <kbd>Space</kbd> {translate("about.piano.footer.sustain")}
              </span>
              <span>
                <kbd>↑↓</kbd>
                <kbd>←→</kbd> {translate("about.piano.footer.settings")}
              </span>
              <span>
                <kbd>Esc</kbd> {translate("about.piano.footer.close")}
              </span>
            </p>
          </motion.div>
        </motion.div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}

function midiOf(target: EventTarget): number | undefined {
  if (!(target instanceof Element)) return undefined
  const value = target.closest<HTMLElement>("[data-midi]")?.dataset.midi
  return value === undefined ? undefined : Number(value)
}

function SettingRow({
  label,
  current,
  onFocus,
  children,
}: {
  label: string
  current: boolean
  onFocus: () => void
  children: React.ReactNode
}) {
  return (
    <li className="pz-row" data-current={current} onFocusCapture={onFocus}>
      <span className="pz-row-label">{label}</span>
      {children}
    </li>
  )
}

function Options<T extends string | number | boolean>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly { id: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    // biome-ignore lint/a11y/useSemanticElements: a row of toggle buttons, not a form; <fieldset> adds form semantics and UA border/min-width quirks.
    <span aria-label={label} className="pz-options" role="group">
      {options.map((option) => (
        <button
          aria-pressed={option.id === value}
          key={String(option.id)}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </span>
  )
}

function Stepper({
  label,
  value,
  onStep,
}: {
  label: string
  value: string
  onStep: (delta: number) => void
}) {
  return (
    <span className="pz-stepper">
      <button
        aria-label={`${label} −`}
        onClick={() => onStep(-1)}
        type="button"
      >
        ‹
      </button>
      <output aria-live="polite">{value}</output>
      <button aria-label={`${label} +`} onClick={() => onStep(1)} type="button">
        ›
      </button>
    </span>
  )
}
