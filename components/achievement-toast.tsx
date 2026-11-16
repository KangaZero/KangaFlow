"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/achievement-toast.css"

import { X } from "lucide-react"
import {
  AnimatePresence,
  type AnimationPlaybackControls,
  animate,
  motion,
  type Transition,
  useMotionValue,
  useReducedMotion,
} from "motion/react"
import { useEffect, useMemo, useRef } from "react"

import { AchievementSlab } from "@/components/achievement-slab"
import { type UnlockFx, useUnlockFx } from "@/components/achievement-unlock-fx"
import { RansomWord } from "@/components/ui/ransom-word"
import { getAchievementLabels } from "@/lib/achievement-labels"
import {
  rattleKeyframes,
  starburstPolygon,
  UNLOCK_INTENSITY,
  type UnlockTimeline,
  unlockTimeline,
} from "@/lib/achievement-unlock"
import {
  type Achievement,
  RARITY_GRADE,
  type Rarity,
  rarityColorVar,
  rarityStars,
} from "@/lib/achievements"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { getSharedAudio, playUnlockSound } from "@/lib/unlock-sound"
import { Z_LAYERS } from "@/lib/z-order"
import { useAchievements } from "@/providers/achievements-provider"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

const s = (ms: number) => ms / 1000
const STAR = starburstPolygon()
// Halves twist, then fly apart fast and decelerate.
const OPEN_EASE = [0.2, 0.7, 0.3, 1] as const

// Shards behind the plate, back to front; how many show scales with rarity.
const SHARDS = [
  { rotate: -3, x: 8, y: 6 },
  { rotate: 2.5, x: -9, y: 9 },
  { rotate: -5, x: 14, y: 12 },
  { rotate: 4, x: -14, y: -6 },
] as const

// Mythic confetti is a rainbow derived from the mythic token (no literals).
const MYTHIC_HUES = [0, 60, 120, 200, 280] as const

function confettiColors(fx: UnlockFx, rarity: Rarity): string[] {
  if (rarity === "mythic") {
    return MYTHIC_HUES.map((shift) =>
      fx.resolveColor(
        `oklch(from var(--rarity-mythic) 0.75 c calc(h + ${shift}))`
      )
    )
  }
  return [
    fx.resolveColor(rarityColorVar(rarity)),
    fx.resolveColor("var(--tooltip-foreground)"),
    fx.resolveColor("var(--tooltip-shadow)"),
  ]
}

const centerOf = (el: Element | null) => {
  const r = el?.getBoundingClientRect()
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null
}

/** Capsule that drops into the slab slot, rattles, and cracks open. */
function Capsule({ rarity, t }: { rarity: Rarity; t: UnlockTimeline }) {
  const intensity = UNLOCK_INTENSITY[rarity]
  const rattle = useMemo(() => rattleKeyframes(rarity), [rarity])
  const flyTop = { rotate: -200, x: -70, y: -70 }
  const flyBottom = { rotate: 160, x: 60, y: 80 }
  const opening: Transition = {
    delay: s(t.openAt),
    duration: s(t.open),
    ease: OPEN_EASE,
    times: [0, 0.15, 1],
  }

  return (
    <motion.div
      animate={{ opacity: 1 }}
      aria-hidden
      className="unlock-capsule"
      data-rarity={rarity}
      initial={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
    >
      <motion.div
        animate={{ opacity: [0, 1, 0.8, 1, 0], scale: [0.3, 1, 0.8, 1, 0] }}
        className="unlock-capsule__shadow"
        transition={{
          duration: s(t.drop + t.rattle + 200),
          times: [0, 0.18, 0.25, 0.3, 1],
        }}
      />
      {intensity.glow ? (
        <motion.div
          animate={{ opacity: [0, 0.75, 0], scale: [0.7, 1.15, 1.3] }}
          className="unlock-capsule__glow"
          initial={{ opacity: 0 }}
          transition={{
            delay: s(t.rattleStart),
            duration: s(t.rattle + 500),
            times: [0, t.rattle / (t.rattle + 500), 1],
          }}
        />
      ) : null}
      {/* Drop with a squash on landing… */}
      <motion.div
        animate={{
          rotate: [-25, 4, -3, 1, 0],
          scaleX: [1, 1.12, 0.96, 1.04, 1],
          scaleY: [1, 0.86, 1.05, 0.96, 1],
          y: [-180, 0, -14, 0, 0],
        }}
        className="unlock-capsule__body"
        transition={{
          duration: s(t.drop),
          ease: [0.35, 0, 0.6, 1],
          times: [0, 0.55, 0.75, 0.9, 1],
        }}
      >
        {/* …then a rattle that grows through the charge. */}
        <motion.div
          animate={{ rotate: rattle.rotate, x: rattle.x }}
          className="absolute inset-0"
          style={{ transformOrigin: "50% 100%" }}
          transition={{
            delay: s(t.rattleStart),
            duration: s(t.rattle),
            ease: "linear",
          }}
        >
          <motion.div
            animate={{
              opacity: [1, 1, 0],
              rotate: [0, -12, flyTop.rotate],
              x: ["0%", "-6%", `${flyTop.x}px`],
              y: ["0%", "-6%", `${flyTop.y}px`],
            }}
            className="unlock-capsule__half unlock-capsule__top"
            transition={opening}
          />
          <motion.div
            animate={{
              opacity: [1, 1, 0],
              rotate: [0, 10, flyBottom.rotate],
              x: ["0%", "6%", `${flyBottom.x}px`],
              y: ["0%", "6%", `${flyBottom.y}px`],
            }}
            className="unlock-capsule__half unlock-capsule__bottom"
            transition={opening}
          >
            <span className="unlock-capsule__band" />
          </motion.div>
          <motion.div
            animate={
              intensity.leak
                ? {
                    opacity: [0, 0.4, 1, 1, 0],
                    scaleX: [0.2, 0.6, 1, 1.6, 2],
                    scaleY: [1, 1, 1, 6, 12],
                  }
                : {
                    opacity: [0, 0, 0, 1, 0],
                    scaleX: [1, 1, 1, 1.6, 2],
                    scaleY: [1, 1, 1, 6, 12],
                  }
            }
            className="unlock-capsule__leak"
            initial={{ opacity: 0 }}
            transition={{
              delay: s(t.rattleStart + t.rattle * 0.35),
              duration: s(t.rattle * 0.65 + 320),
              times: [0, 0.4, 0.62, 0.75, 1],
            }}
          />
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

type UnlockToastProps = {
  achievement: Achievement
  /** Sound effects setting (off by default). */
  sound: boolean
  unlocked: number
  total: number
  reduced: boolean
  fx: UnlockFx
  onDismiss: () => void
}

function UnlockToast({
  achievement,
  sound,
  unlocked,
  total,
  reduced,
  fx,
  onDismiss,
}: UnlockToastProps) {
  const { translate } = useLocale()
  const { def, title, description, rarityLabel } = getAchievementLabels(
    achievement,
    translate
  )
  const rarity = def.rarity
  const intensity = UNLOCK_INTENSITY[rarity]
  const t = useMemo(() => unlockTimeline(rarity), [rarity])
  const slotRef = useRef<HTMLDivElement>(null)
  const plateRef = useRef<HTMLDivElement>(null)
  const stickerRef = useRef<HTMLDivElement>(null)
  const timer = useMotionValue(1)
  const timerControls = useRef<AnimationPlaybackControls | null>(null)
  const before = Math.max(0, unlocked - 1)

  // Sound (opt-in setting). Played once per toast; under reduced motion the
  // plan keeps only the reward chime, since there is no capsule to score.
  useEffect(() => {
    playUnlockSound({
      enabled: sound,
      getAudio: getSharedAudio,
      rarity,
      reduced,
    })
  }, [rarity, reduced, sound])

  // Particles, rays, dim, flash and jolt are fired at their beats (refs measured then).
  useEffect(() => {
    if (reduced) return
    const color = fx.resolveColor(rarityColorVar(rarity))
    const ink = fx.resolveColor("var(--tooltip-foreground)")
    const timers: number[] = []
    const at = (ms: number, fn: () => void) =>
      timers.push(window.setTimeout(fn, ms))
    if (intensity.dim)
      at(t.rattleStart, () => fx.dim(s(t.rattle + t.open + 400)))
    if (intensity.rays) {
      at(t.rattleStart, () => {
        const c = centerOf(slotRef.current)
        if (c) fx.rays(c.x, c.y, color, s(t.rattle))
      })
    }
    at(t.impactAt, () => {
      const c = centerOf(slotRef.current)
      if (c)
        fx.impact({
          ...c,
          color,
          confettiColors: confettiColors(fx, rarity),
          intensity,
        })
    })
    at(t.slamAt + 200, () => {
      const c = centerOf(plateRef.current)
      if (c) fx.sparks(c.x, c.y, ink, 12 + intensity.rings * 5, 480)
    })
    at(t.slamAt + 760, () => {
      const c = centerOf(stickerRef.current)
      if (c) fx.sparks(c.x, c.y, color, 12)
    })
    return () => {
      for (const id of timers) window.clearTimeout(id)
    }
  }, [fx, intensity, rarity, reduced, t])

  // Auto-dismiss timer: starts once the readout settles; pauses on hover/focus.
  useEffect(() => {
    const controls = animate(timer, 0, {
      delay: reduced ? 0.3 : s(t.settleAt),
      duration: s(t.hold),
      ease: "linear",
      onComplete: onDismiss,
    })
    timerControls.current = controls
    return () => controls.stop()
  }, [onDismiss, reduced, t, timer])
  const pause = () => timerControls.current?.pause()
  const resume = () => timerControls.current?.play()

  // Reduced motion: everything starts at its final state; only a fade + scale.
  const at = (ms: number) => (reduced ? 0 : s(ms))
  const from = <T,>(value: T, settled: T): T => (reduced ? settled : value)

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="unlock-toast"
      exit={{ opacity: 0, scale: 0.97, x: 30 }}
      initial={reduced ? { opacity: 0, scale: 0.96 } : { opacity: 1, scale: 1 }}
      onBlur={(event) => {
        const next = event.relatedTarget
        if (!(next instanceof Node && event.currentTarget.contains(next)))
          resume()
      }}
      onFocus={pause}
      onPointerEnter={pause}
      onPointerLeave={resume}
      style={{ "--rc": rarityColorVar(rarity) }}
      transition={{ duration: 0.2 }}
    >
      <div className="unlock-toast__slot" ref={slotRef}>
        {reduced ? null : <Capsule rarity={rarity} t={t} />}
        <motion.div
          animate={{
            opacity: [from(0, 1), 1, 1],
            rotate: [from(-14, -6), from(4, -6), -6],
            scale: [from(0.2, 1), from(1.3, 1), 1],
            y: [from(18, 0), from(-12, 0), 0],
          }}
          className="unlock-toast__slab"
          initial={{ opacity: from(0, 1) }}
          transition={{
            delay: at(t.popAt),
            duration: 0.46,
            ease: [0.3, 1.4, 0.5, 1],
            times: [0, 0.6, 1],
          }}
        >
          <div className="unlock-toast__slab-zoom">
            <AchievementSlab achievement={achievement} />
          </div>
        </motion.div>
      </div>

      <div className="unlock-toast__plate-wrap">
        {SHARDS.slice(0, Math.min(SHARDS.length, intensity.rings + 1)).map(
          (shard, index) => (
            <motion.div
              animate={{
                opacity: 1,
                rotate: shard.rotate,
                scale: 1,
                x: shard.x,
                y: shard.y,
              }}
              aria-hidden
              className="unlock-shard"
              data-index={index}
              initial={from(
                {
                  opacity: 0,
                  rotate: index % 2 ? 14 : -14,
                  scale: 0.5,
                  x: shard.x,
                  y: shard.y,
                },
                {
                  opacity: 1,
                  rotate: shard.rotate,
                  scale: 1,
                  x: shard.x,
                  y: shard.y,
                }
              )}
              key={`${shard.x}-${shard.y}`}
              transition={{
                damping: 14,
                delay: at(t.slamAt + 50 + index * 50),
                stiffness: 380,
                type: "spring",
              }}
            />
          )
        )}
        <motion.div
          animate={{
            opacity: [from(0, 1), 1, 1],
            rotate: [from(-10, 0), from(2, 0), 0],
            scale: [from(1.7, 1), from(0.95, 1), 1],
            skewX: -8,
          }}
          className="unlock-plate"
          initial={{ opacity: from(0, 1), skewX: -8 }}
          ref={plateRef}
          transition={{
            delay: at(t.slamAt),
            duration: 0.36,
            ease: [0.2, 0.9, 0.3, 1],
            times: [0, 0.65, 1],
          }}
        >
          <div className="unlock-plate__in">
            <span className="sr-only">{`${translate("achievements.toast.unlocked")} ${title}`}</span>
            <RansomWord
              delay={reduced ? 0 : s(t.slamAt + 140)}
              text={translate("achievements.toast.stamp")}
            />
            <Readout at={at} from={from} t={t}>
              <div className="unlock-plate__title">{title}</div>
              <div className="unlock-plate__desc">{description}</div>
            </Readout>
            <Readout at={at} from={from} offset={180} t={t}>
              <div className="unlock-plate__meta">
                <span className="unlock-chip">{rarityLabel}</span>
                <span className="unlock-stars">{rarityStars(rarity)}</span>
                <span className="unlock-new">
                  {translate("achievements.slab.new")}
                </span>
              </div>
            </Readout>
            <div className="unlock-progress">
              <span>{translate("achievements.unlocked")}</span>
              <span>
                <span className="unlock-roll">
                  <motion.span
                    animate={{ y: "-1.2em" }}
                    initial={{ y: from("0em", "-1.2em") }}
                    transition={{
                      damping: 12,
                      delay: at(t.readoutAt + 420),
                      stiffness: 300,
                      type: "spring",
                    }}
                  >
                    <span>{before}</span>
                    <b>{unlocked}</b>
                  </motion.span>
                </span>
                {` / ${total}`}
              </span>
            </div>
            <div className="unlock-bar">
              <motion.span
                animate={{ scaleX: total ? unlocked / total : 0 }}
                className="unlock-bar__fill"
                initial={{
                  scaleX: from(
                    total ? before / total : 0,
                    total ? unlocked / total : 0
                  ),
                }}
                transition={{
                  damping: 14,
                  delay: at(t.readoutAt + 460),
                  stiffness: 220,
                  type: "spring",
                }}
              />
              {reduced ? null : (
                <motion.span
                  animate={{ x: ["-120%", "320%"] }}
                  className="unlock-bar__glow"
                  initial={{ x: "-120%" }}
                  transition={{
                    delay: s(t.readoutAt + 700),
                    duration: 0.7,
                    ease: "easeInOut",
                  }}
                />
              )}
            </div>
          </div>
          <div className="unlock-timer">
            <motion.span style={{ scaleX: timer }} />
          </div>
        </motion.div>
        <motion.div
          animate={{
            opacity: [from(0, 1), 1, 1],
            rotate: [from(-40, 0), from(8, 0), 0],
            scale: [from(2.6, 1), from(0.9, 1), 1],
          }}
          aria-hidden
          className="unlock-sticker"
          initial={{ opacity: from(0, 1) }}
          ref={stickerRef}
          style={{ "--star": STAR }}
          transition={{
            delay: at(t.slamAt + 520),
            duration: 0.34,
            ease: [0.5, 0, 0.6, 1],
            times: [0, 0.7, 1],
          }}
        >
          <span>
            {RARITY_GRADE[rarity]}
            <small>{translate(`achievements.grades.${rarity}`)}</small>
          </span>
        </motion.div>
        <motion.button
          animate={{ opacity: 1 }}
          aria-label={translate("achievements.toast.dismiss")}
          className="unlock-dismiss"
          initial={{ opacity: from(0, 1) }}
          onClick={onDismiss}
          transition={{ delay: at(t.slamAt + 200), duration: 0.2 }}
          type="button"
        >
          <X className="size-4" />
        </motion.button>
      </div>
    </motion.div>
  )
}

/** Fade-up for a readout block, timed off the plate slam. */
function Readout({
  children,
  t,
  at,
  from,
  offset = 0,
}: {
  children: React.ReactNode
  t: UnlockTimeline
  at: (ms: number) => number
  from: <T>(value: T, settled: T) => T
  offset?: number
}) {
  return (
    <motion.div
      animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
      initial={{
        filter: from("blur(4px)", "blur(0px)"),
        opacity: from(0, 1),
        y: from(8, 0),
      }}
      transition={{ delay: at(t.readoutAt + offset), duration: 0.32 }}
    >
      {children}
    </motion.div>
  )
}

export function AchievementToast() {
  const { achievements, currentUnlocked, dismissCurrent } = useAchievements()
  const { animationPref, soundEffects } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const { api: fx, layer } = useUnlockFx()
  const unlocked = achievements.filter((a) => a.isUnlocked).length

  return (
    <>
      {layer}
      {/* Always mounted so screen readers keep the live region registered. */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 top-4 grid justify-items-center px-4"
        role="status"
        style={{ zIndex: Z_LAYERS.toast }}
      >
        <AnimatePresence>
          {currentUnlocked != null && (
            <UnlockToast
              achievement={currentUnlocked}
              fx={fx}
              key={currentUnlocked.id}
              onDismiss={dismissCurrent}
              reduced={reduced}
              sound={soundEffects}
              total={achievements.length}
              unlocked={unlocked}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  )
}
