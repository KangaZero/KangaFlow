"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useReducedMotion } from "motion/react"
import { type PointerEvent, useEffect, useRef, useState } from "react"

import { decryptFrame } from "@/lib/decrypt-text"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { person } from "@/lib/person"
import { useGlobalStates } from "@/providers/global-state-provider"

const DECRYPT_MS = 650

const [ROLE_WORD = "", ...ROLE_REST] = person.role.split(" ")
const ROLE_TAIL = ROLE_REST.join(" ")

/**
 * The hero's job title with an easter egg: hover (mouse) or click/tap the
 * first word and it decrypts into `person.roleFlip`, then turns upside down
 * (rotated 180°, so it also reads backwards). Click pins it; click again or
 * leave without a pin to decrypt back.
 */
export function DecryptRole() {
  const { animationPref } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const flipped = hovered || pinned
  const target = flipped ? person.roleFlip : ROLE_WORD

  // `display` is the visible frame; the ref mirrors it so a reversal mid-way
  // starts from whatever is on screen instead of jumping.
  const [display, setDisplay] = useState(ROLE_WORD)
  const displayRef = useRef(ROLE_WORD)

  useEffect(() => {
    const from = displayRef.current
    const show = (text: string) => {
      displayRef.current = text
      setDisplay(text)
    }
    if (reduced || from === target) {
      show(target)
      return
    }
    const start = performance.now()
    let frame = requestAnimationFrame(function step(now) {
      const progress = (now - start) / DECRYPT_MS
      show(decryptFrame(from, target, progress, Math.random))
      if (progress < 1) frame = requestAnimationFrame(step)
    })
    return () => cancelAnimationFrame(frame)
  }, [target, reduced])

  const upsideDown = flipped && display === person.roleFlip

  function togglePinned() {
    setPinned((value) => !value)
  }
  // Mouse only: a touch "hover" never ends, so taps go through click instead.
  function handlePointerEnter(event: PointerEvent<HTMLButtonElement>) {
    if (event.pointerType === "mouse") setHovered(true)
  }
  function handlePointerLeave() {
    setHovered(false)
  }

  return (
    <>
      <button
        aria-pressed={pinned}
        className="focus-visible:ring-ring cursor-pointer rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        onClick={togglePinned}
        onPointerEnter={handlePointerEnter}
        onPointerLeave={handlePointerLeave}
        type="button"
      >
        <span className="sr-only">{target}</span>
        {/* Invisible copies of both words reserve the wider width, so the
            centred line does not jitter while glyphs scramble. */}
        <span aria-hidden="true" className="inline-grid">
          <span className="invisible col-start-1 row-start-1">{ROLE_WORD}</span>
          <span className="invisible col-start-1 row-start-1">
            {person.roleFlip}
          </span>
          <motion.span
            animate={{ rotate: upsideDown ? 180 : 0 }}
            className="col-start-1 row-start-1 inline-block justify-self-center whitespace-pre"
            transition={
              reduced
                ? { duration: 0 }
                : { damping: 14, stiffness: 180, type: "spring" }
            }
          >
            {display}
          </motion.span>
        </span>
      </button>{" "}
      {ROLE_TAIL}
    </>
  )
}
