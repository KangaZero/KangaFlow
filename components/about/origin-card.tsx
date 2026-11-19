"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// About → Education as an "origin" card: the University of Sydney crest,
// the degree (a Classical Piano major), a playable two-octave strip, and
// the chip that opens the full-screen 88-key piano.
//
// The strip is one tab stop (roving tabindex): ←/→ move between keys,
// Enter/Space or a press plays, like the rest of the site's keyboard UI.

import Image from "next/image"
import { type KeyboardEvent as ReactKeyboardEvent, useState } from "react"
import usydCrest from "@/assets/usyd-crest.svg"
import { PianoScreen } from "@/components/about/piano-screen"
import { usePianoVoices } from "@/hooks/use-piano-voices"
import { person } from "@/lib/person"
import { musicalKey, noteName, PIANO_KEYS } from "@/lib/piano"
import { useLocale } from "@/providers/locale-provider"
import "@/components/about/about-sections.css"

// Two octaves from C4 (MIDI 60–83); black keys sit over the boundary to the
// left of the white key whose index they carry.
const STRIP_FIRST = 60
const STRIP_LAST = 83
const STRIP_KEYS = PIANO_KEYS.filter(
  (key) => key.midi >= STRIP_FIRST && key.midi <= STRIP_LAST
)
const WHITE_OFFSET = STRIP_KEYS[0]?.whiteIndex ?? 0
const C_MAJOR = musicalKey(0, "major")

export function OriginCard({ reduced }: { reduced: boolean }) {
  const { translate } = useLocale()
  const voices = usePianoVoices("grand", 2)
  const [focused, setFocused] = useState(STRIP_FIRST)
  const [down, setDown] = useState<ReadonlySet<number>>(new Set())

  const press = (midi: number) => {
    voices.start(midi)
    setDown((previous) => new Set(previous).add(midi))
  }
  const release = (midi: number) => {
    voices.stop(midi)
    setDown((previous) => {
      const next = new Set(previous)
      next.delete(midi)
      return next
    })
  }

  const onKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    midi: number
  ) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      const index = STRIP_KEYS.findIndex((key) => key.midi === midi)
      const next = STRIP_KEYS[index + (event.key === "ArrowRight" ? 1 : -1)]
      if (!next) return
      setFocused(next.midi)
      event.currentTarget.parentElement
        ?.querySelector<HTMLButtonElement>(`[data-midi="${next.midi}"]`)
        ?.focus()
      return
    }
    if ((event.key === "Enter" || event.key === " ") && !event.repeat) {
      event.preventDefault()
      press(midi)
    }
  }

  return (
    <>
      {person.studies.map((study) => (
        <div className="qa-origin" key={study.name}>
          <span className="qa-crest relative">
            <Image alt={study.name} fill sizes="56px" src={usydCrest} />
          </span>
          <span>
            <span className="qa-class">{translate("about.quest.origin")}</span>
            <span className="qa-company">{study.name}</span>
            <span className="qa-role">
              {study.title} · {study.description}
            </span>
          </span>
          <div className="qa-strip">
            <PianoScreen reduced={reduced} />
            {/* biome-ignore lint/a11y/useSemanticElements: a keyboard of buttons, not a form; <fieldset> adds form semantics and UA border/min-width quirks. */}
            <div
              aria-label={translate("about.piano.strip")}
              className="qa-keys"
              role="group"
            >
              {STRIP_KEYS.map((key) => (
                <button
                  aria-label={noteName(key.midi, C_MAJOR)}
                  data-black={key.black}
                  data-down={down.has(key.midi)}
                  data-midi={key.midi}
                  key={key.midi}
                  onBlur={() => release(key.midi)}
                  onKeyDown={(event) => onKeyDown(event, key.midi)}
                  onKeyUp={(event) => {
                    if (event.key === "Enter" || event.key === " ")
                      release(key.midi)
                  }}
                  onPointerDown={() => press(key.midi)}
                  onPointerLeave={() => release(key.midi)}
                  onPointerUp={() => release(key.midi)}
                  style={
                    key.black
                      ? { "--at": key.whiteIndex - WHITE_OFFSET }
                      : undefined
                  }
                  tabIndex={key.midi === focused ? 0 : -1}
                  type="button"
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
