"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/hero-avatar.css"

import { animate, useReducedMotion } from "motion/react"
import { useRef, useState } from "react"

import avatarSrc from "@/assets/avatar.webp"
import { ProgressiveImage } from "@/components/ui/progressive-image"
import { RansomWord } from "@/components/ui/ransom-word"
import {
  boopLabel,
  clearAvatarEntered,
  markAvatarEntered,
} from "@/lib/hero-interaction"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { person } from "@/lib/person"
import { playSfx } from "@/lib/sfx/play"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

const BURST_LINES = 8
const BURST_LIFETIME_MS = 450
const COUNTER_LIFETIME_MS = 1400

type Burst = { id: number; x: number; y: number }

/**
 * Start-page avatar, "ink & shard": today's polygon frame plus pointer
 * parallax (shard / frame / silhouette move at different depths), an accent
 * shard slam, a colour-split snap, a halftone ink fill wiping up and a peeling
 * sticker on hover/focus. Click / Enter / Space = boop (squash-and-stretch,
 * burst lines, a "BOOP ×n" counter). A real <button>, so it is keyboard
 * reachable; the silhouette copies are CSS masks of the same static image.
 */
export function HeroAvatar() {
  const { translate } = useLocale()
  const { animationPref } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const [on, setOn] = useState(false)
  const [failed, setFailed] = useState(false)
  const [boops, setBoops] = useState(0)
  const [bursts, setBursts] = useState<Burst[]>([])
  const [showCounter, setShowCounter] = useState(false)
  const rootRef = useRef<HTMLButtonElement>(null)
  const layerRef = useRef<HTMLSpanElement>(null)
  const counterTimer = useRef<number>(0)

  function enter() {
    if (!on) markAvatarEntered(performance.now())
    setOn(true)
  }
  function leave() {
    setOn(false)
    clearAvatarEntered()
    rootRef.current?.style.setProperty("--px", "0")
    rootRef.current?.style.setProperty("--py", "0")
  }

  function parallax(event: React.PointerEvent<HTMLButtonElement>) {
    if (reduced || event.pointerType === "touch") return
    const rect = event.currentTarget.getBoundingClientRect()
    const px = ((event.clientX - rect.left) / rect.width) * 2 - 1
    const py = ((event.clientY - rect.top) / rect.height) * 2 - 1
    event.currentTarget.style.setProperty("--px", px.toFixed(3))
    event.currentTarget.style.setProperty("--py", py.toFixed(3))
  }

  function boop(event: React.MouseEvent<HTMLButtonElement>) {
    setBoops((count) => count + 1)
    playSfx("boop", { step: boops + 1 })
    setShowCounter(true)
    window.clearTimeout(counterTimer.current)
    counterTimer.current = window.setTimeout(
      () => setShowCounter(false),
      COUNTER_LIFETIME_MS
    )
    if (reduced) return
    if (layerRef.current) {
      void animate(
        layerRef.current,
        { scaleX: [1, 1.08, 0.95, 1], scaleY: [1, 0.9, 1.06, 1] },
        { duration: 0.5, ease: [0.3, 1.6, 0.5, 1] }
      )
    }
    // Keyboard activation has no pointer position: burst from the centre.
    const rect = event.currentTarget.getBoundingClientRect()
    const fromPointer = event.detail > 0
    const burst: Burst = {
      id: performance.now(),
      x: fromPointer ? event.clientX - rect.left : rect.width / 2,
      y: fromPointer ? event.clientY - rect.top : rect.height / 2,
    }
    setBursts((list) => [...list, burst])
    window.setTimeout(
      () => setBursts((list) => list.filter((b) => b.id !== burst.id)),
      BURST_LIFETIME_MS
    )
  }

  return (
    <button
      aria-label={translate("about.avatar.boopLabel")}
      className="hero-avatar ransom-on-page"
      data-on={on}
      data-reduced={reduced}
      onBlur={leave}
      onClick={boop}
      onFocus={enter}
      onPointerEnter={enter}
      onPointerLeave={leave}
      onPointerMove={parallax}
      ref={rootRef}
      style={{ "--avatar-mask": `url(${avatarSrc.src})` }}
      type="button"
    >
      <span aria-hidden className="hero-avatar__shard" />
      <span aria-hidden className="hero-avatar__frame" />
      <span className="hero-avatar__layer" ref={layerRef}>
        {failed ? (
          <span className="font-heading text-muted-foreground absolute inset-0 flex items-center justify-center text-xl font-medium">
            {`${person.firstName.at(0) ?? ""}${person.lastName.at(0) ?? ""}`}
          </span>
        ) : (
          <>
            {/* The wrapper takes the old img box (hero-avatar__img); the
                masked silhouettes below position themselves, untouched. */}
            <ProgressiveImage
              alt={person.firstName}
              height={300}
              onError={() => setFailed(true)}
              placeholder="avatar"
              preload
              src={avatarSrc}
              width={150}
              wrapperClassName="hero-avatar__img"
            />
            <span aria-hidden className="hero-avatar__sil hero-avatar__ink" />
            <span
              aria-hidden
              className="hero-avatar__sil hero-avatar__split"
              data-tone="accent"
            />
            <span
              aria-hidden
              className="hero-avatar__sil hero-avatar__split"
              data-tone="light"
            />
          </>
        )}
      </span>
      <span aria-hidden className="hero-avatar__sticker">
        {translate("about.avatar.hello")}
      </span>
      {bursts.map((burst) => (
        <span
          aria-hidden
          className="hero-avatar__burst"
          key={burst.id}
          style={{ left: burst.x, top: burst.y }}
        >
          {Array.from({ length: BURST_LINES }, (_, k) => (
            <i
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed set of positional lines.
              key={k}
              style={{ "--a": `${(k * 360) / BURST_LINES}deg` }}
            />
          ))}
        </span>
      ))}
      {showCounter && boops > 0 ? (
        <RansomWord
          className="hero-avatar__counter"
          delay={0}
          key={boops}
          text={boopLabel(translate("about.avatar.boop"), boops)}
        />
      ) : null}
    </button>
  )
}
