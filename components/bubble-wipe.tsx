"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/bubble-wipe.css"

import { animate } from "motion/react"
import { useEffect } from "react"

import {
  makeSwarm,
  SWARM_TIMING,
  type SwarmBubble,
  transitionTarget,
} from "@/lib/page-transition"
import { playSfx } from "@/lib/sfx/play"
import { Z_LAYERS } from "@/lib/z-order"

// Cartoon "bubble swarm" route transition: cover → navigate → reveal.
//
// Why imperative + module state: `app/[lang]/template.tsx` re-mounts on every
// navigation, so anything React-owned inside it would be torn down mid-cover.
// The overlay therefore lives directly under <body> and is driven by Motion's
// imperative `animate()`; the template only (1) tells us whether motion is
// allowed and (2) signals "new route mounted" so we can reveal.
//
// Interception: one capture-phase click listener on `window` runs before Next's
// <Link> handler. For an internal navigation it cancels the click (Link skips
// navigation when `defaultPrevented`), plays the cover, then re-dispatches
// `anchor.click()` with a bypass flag so <Link> navigates normally (basePath,
// prefetch and scroll handling stay Next's job).

const OVERSHOOT = [0.34, 1.56, 0.64, 1] as const

type Phase = "idle" | "covering" | "navigating" | "revealing"

type MountedBubble = { el: HTMLDivElement; spec: SwarmBubble }

const state: {
  enabled: boolean
  phase: Phase
  bypass: boolean
  overlay: HTMLDivElement | null
  sheet: HTMLDivElement | null
  bubbles: MountedBubble[]
  safety: number
  installed: boolean
} = {
  bubbles: [],
  bypass: false,
  enabled: false,
  installed: false,
  overlay: null,
  phase: "idle",
  safety: 0,
  sheet: null,
}

const ms = (value: number) => value / 1000

function buildOverlay(): HTMLDivElement {
  const overlay = document.createElement("div")
  overlay.className = "bubble-swarm"
  overlay.setAttribute("aria-hidden", "true")
  overlay.style.zIndex = String(Z_LAYERS.transition)

  const sheet = document.createElement("div")
  sheet.className = "bubble-swarm__sheet"
  overlay.append(sheet)

  const specs = makeSwarm(Math.random, window.innerWidth, window.innerHeight)
  state.bubbles = specs.map((spec) => {
    const el = document.createElement("div")
    el.className = "bubble-swarm__bubble"
    const border = Math.max(2.5, Math.min(7, spec.d * 0.045))
    el.style.cssText = `left:${spec.x - spec.d / 2}px;top:${spec.y - spec.d / 2}px;width:${spec.d}px;height:${spec.d}px;--d:${spec.d}px;--bw:${border}px;transform:translateY(${spec.rise}px)`
    overlay.append(el)
    return { el, spec }
  })

  document.body.append(overlay)
  state.overlay = overlay
  state.sheet = sheet
  return overlay
}

function removeOverlay() {
  state.overlay?.remove()
  state.overlay = null
  state.sheet = null
  state.bubbles = []
}

// Never hang on an animation promise: resolve after `budget` ms regardless.
function settle(promises: Promise<unknown>[], budget: number): Promise<void> {
  return Promise.race([
    Promise.allSettled(promises).then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, budget)),
  ])
}

async function cover() {
  playSfx("bubble-cover")
  const { riseMs, riseStaggerMs } = SWARM_TIMING
  const rises = state.bubbles.map(
    ({ el, spec }) =>
      animate(
        el,
        {
          transform: [
            `translateY(${spec.rise}px) scale(0.55, 0.8)`,
            "translateY(-14px) scale(1.04, 0.96)",
            "translateY(0px) scale(1)",
          ],
        },
        {
          delay: ms(spec.riseDelay),
          duration: ms(riseMs),
          ease: OVERSHOOT,
          times: [0, 0.75, 1],
        }
      ).finished
  )
  // Flat sheet fades in under the bubbles as they arrive: belt-and-braces so
  // no sliver of the old page can show through at peak cover.
  if (state.sheet) {
    rises.push(
      animate(
        state.sheet,
        { opacity: [0, 1] },
        { delay: ms(riseStaggerMs), duration: ms(riseMs * 0.6) }
      ).finished
    )
  }
  await settle(rises, riseMs + riseStaggerMs + 400)
}

function burstLines(spec: SwarmBubble, delay: number, overlay: HTMLDivElement) {
  const burst = document.createElement("div")
  burst.className = "bubble-swarm__burst"
  burst.style.left = `${spec.x}px`
  burst.style.top = `${spec.y}px`
  overlay.append(burst)
  const length = Math.min(40, spec.d * 0.22)
  const r0 = Math.min(spec.d * 0.5, 220)
  const lines = 7
  return Array.from({ length: lines }, (_, k) => {
    const line = document.createElement("i")
    line.className = "bubble-swarm__line"
    line.style.height = `${length}px`
    burst.append(line)
    const angle = (k * 360) / lines + (Math.random() - 0.5) * 16
    return animate(
      line,
      {
        opacity: [1, 0],
        transform: [
          `rotate(${angle}deg) translateY(${r0 * 0.7}px) scaleY(1)`,
          `rotate(${angle}deg) translateY(${r0 + length * 1.4}px) scaleY(0.15)`,
        ],
      },
      {
        delay: ms(delay + SWARM_TIMING.popMs * 0.45),
        duration: ms(SWARM_TIMING.burstMs),
        ease: [0.2, 0.8, 0.3, 1],
      }
    ).finished
  })
}

async function reveal() {
  if (state.phase !== "navigating") return
  window.clearTimeout(state.safety)
  state.phase = "revealing"
  const overlay = state.overlay
  if (!overlay) {
    state.phase = "idle"
    return
  }
  playSfx("bubble-pop")
  const { popMs, popStaggerMs, burstMs } = SWARM_TIMING
  const pops: Promise<unknown>[] = []
  if (state.sheet) {
    pops.push(
      animate(state.sheet, { opacity: [1, 0] }, { duration: ms(60) }).finished
    )
  }
  overlay.style.pointerEvents = "none"
  for (const { el, spec } of state.bubbles) {
    pops.push(
      animate(
        el,
        {
          opacity: [1, 1, 0],
          transform: ["scale(1)", "scale(1.18, 1.1)", "scale(0.15)"],
        },
        {
          delay: ms(spec.popDelay),
          duration: ms(popMs),
          ease: "easeOut",
          times: [0, 0.5, 1],
        }
      ).finished
    )
    if (spec.burst) pops.push(...burstLines(spec, spec.popDelay, overlay))
  }
  await settle(pops, popStaggerMs + popMs + burstMs + 400)
  removeOverlay()
  state.phase = "idle"
}

async function run(anchor: HTMLAnchorElement, href: string) {
  state.phase = "covering"
  buildOverlay()
  await cover()
  state.phase = "navigating"
  // If the route never re-mounts (failed navigation, same-template edge case),
  // reveal anyway so the cover can never get stuck.
  state.safety = window.setTimeout(() => void reveal(), SWARM_TIMING.safetyMs)
  if (anchor.isConnected) {
    state.bypass = true
    try {
      anchor.click() // <Link> (or the browser) performs the real navigation
    } finally {
      state.bypass = false
    }
  } else {
    // The link unmounted during the cover (e.g. a closing menu): hard navigate.
    window.location.assign(href)
  }
}

function onClick(event: MouseEvent) {
  if (state.bypass) return
  const anchor =
    event.target instanceof Element ? event.target.closest("a[href]") : null
  if (!(anchor instanceof HTMLAnchorElement)) return
  if (state.phase !== "idle") {
    // Mid-transition: swallow further link clicks instead of queueing them.
    event.preventDefault()
    event.stopPropagation()
    return
  }
  if (!state.enabled) return
  const target = transitionTarget(
    {
      altKey: event.altKey,
      button: event.button,
      ctrlKey: event.ctrlKey,
      defaultPrevented: event.defaultPrevented,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    },
    {
      hasDownload: anchor.hasAttribute("download"),
      href: anchor.href,
      optOut: anchor.hasAttribute("data-no-transition"),
      target: anchor.target,
    },
    new URL(window.location.href)
  )
  if (target == null) return
  // Cancel now; the same click is replayed after the cover. Stopping
  // propagation keeps the link's own onClick side effects from firing twice.
  event.preventDefault()
  event.stopPropagation()
  void run(anchor, target.href)
}

/**
 * Mounted by the route template. `enabled` = motion allowed (app animation
 * preference + OS reduced-motion). Every mount means a new route is on screen,
 * which is the cue to pop the bubbles away. Renders nothing.
 */
export function BubbleSwarmTransition({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    state.enabled = enabled
  }, [enabled])

  useEffect(() => {
    if (state.installed) return
    state.installed = true
    window.addEventListener("click", onClick, { capture: true })
  }, [])

  // Template re-mount ⇒ the new route has rendered: reveal on the next frame so
  // its first paint is already underneath the bubbles.
  useEffect(() => {
    if (state.phase !== "navigating") return
    const frame = window.requestAnimationFrame(() => void reveal())
    return () => window.cancelAnimationFrame(frame)
  }, [])

  return null
}
