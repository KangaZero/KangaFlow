"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The About page's projects section: a sealed chrome booster pack that tears
// open into a fanned hand of trading cards. Phases:
//
//   sealed → (tear) → rising → spread → revealing → done
//
// Cards burst out face down, turn face up one by one with the SSR held for
// last (gold flash, bloom, rays), and only then become interactive. In the
// done phase a card is dragged by its frame (the coloured border) or moved
// with Shift+←/→ to rearrange the hand; the inside of either face keeps
// plain clicks (flip, moves, links), so a drag never swallows them. The
// order and "already opened" are kept in localStorage so a returning
// visitor lands on their hand.

import { useReducedMotion } from "motion/react"
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import { BoosterPack } from "@/components/projects/booster-pack"
import {
  type DrawerState,
  type DrawerView,
  MoveDrawer,
} from "@/components/projects/move-drawer"
import { TradingCard } from "@/components/projects/trading-card"
import { Kbd } from "@/components/ui/kbd"
import { useElementSize } from "@/hooks/use-element-size"
import { isReducedMotion } from "@/lib/isReducedMotion"
import {
  DEFAULT_CARD_ORDER,
  moveInOrder,
  PROJECT_CARD_IDS,
  PROJECT_CARDS,
  type ProjectCardId,
  parseCardOrder,
  revealOrder,
} from "@/lib/projects"
import { safeLocalStorage } from "@/lib/safe-storage"
import { playSfx } from "@/lib/sfx/play"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"
import "@/components/projects/projects.css"

type Phase = "sealed" | "rising" | "spread" | "revealing" | "done"

const ORDER_KEY = "kangaflow:project-card-order"
const OPENED_KEY = "kangaflow:projects-pack-opened"
const ALL_REVEALED: ReadonlySet<ProjectCardId> = new Set(PROJECT_CARD_IDS)
const NONE_REVEALED: ReadonlySet<ProjectCardId> = new Set()

// Burst choreography (ms after the tear).
const RISE_AT = 380
const SPREAD_AT = 700
const REVEAL_AT = 1350
const REVEAL_STEP = 380
const SSR_PAUSE = 300
/** Pointer travel before a press becomes a drag (so a click still flips). */
const DRAG_SLOP = 6

type Drag = {
  id: ProjectCardId
  element: HTMLElement
  pointerId: number
  startX: number
  startY: number
  /** Hand centre (px, viewport) and slot width, measured at press. */
  centre: number
  spread: number
  /** Distance the card's home slot has moved since the press. */
  shift: number
  moved: boolean
}

export function ProjectCards() {
  const { translate } = useLocale()
  const { animationPref } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())

  const [phase, setPhase] = useState<Phase>("sealed")
  const [revealed, setRevealed] =
    useState<ReadonlySet<ProjectCardId>>(NONE_REVEALED)
  const [order, setOrder] =
    useState<readonly ProjectCardId[]>(DEFAULT_CARD_ORDER)
  const [flipped, setFlipped] = useState<ProjectCardId | null>(null)
  const [ssrOut, setSsrOut] = useState(false)
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const [dragging, setDragging] = useState<ProjectCardId | null>(null)
  const [settling, setSettling] = useState<ProjectCardId | null>(null)

  const zoneRef = useRef<HTMLDivElement>(null)
  const handRef = useRef<HTMLDivElement>(null)
  const orderRef = useRef(order)
  orderRef.current = order
  const timers = useRef<number[]>([])
  const torn = useRef(false)
  const { width: zoneWidth } = useElementSize(zoneRef)
  const packWidth = zoneWidth < 500 ? 220 : 270

  const later = useCallback((ms: number, run: () => void) => {
    timers.current.push(window.setTimeout(run, ms))
  }, [])
  const clearTimers = useCallback(() => {
    for (const id of timers.current) window.clearTimeout(id)
    timers.current = []
  }, [])
  useEffect(() => clearTimers, [clearTimers])

  // Restore a returning visitor's hand (after hydration: storage is
  // client-only, so the prerendered HTML is always the sealed pack).
  useEffect(() => {
    setOrder(
      safeLocalStorage.getJson(ORDER_KEY, DEFAULT_CARD_ORDER, parseCardOrder)
    )
    if (safeLocalStorage.getItem(OPENED_KEY) === "1") {
      torn.current = true
      setRevealed(ALL_REVEALED)
      setPhase("done")
    }
  }, [])

  const reveal = (id: ProjectCardId) => {
    setRevealed((previous) => new Set(previous).add(id))
    if (PROJECT_CARDS[id].rarity === "ssr") {
      setSsrOut(true)
      playSfx("unlock-mythic")
    } else playSfx("card-reveal")
  }

  const tear = () => {
    if (torn.current) return
    torn.current = true
    safeLocalStorage.setItem(OPENED_KEY, "1")
    playSfx("pack-tear")
    if (reduced) {
      setRevealed(ALL_REVEALED)
      setPhase("done")
      return
    }
    later(RISE_AT, () => setPhase("rising"))
    later(SPREAD_AT, () => {
      setPhase("spread")
      playSfx("card-flip")
    })
    later(REVEAL_AT, () => {
      setPhase("revealing")
      revealOrder(orderRef.current).forEach((id, k) => {
        const pause = PROJECT_CARDS[id].rarity === "ssr" ? SSR_PAUSE : 0
        later(k * REVEAL_STEP + pause, () => reveal(id))
      })
    })
  }

  // Every card face up → interactive. The pack's stub (which had focus for a
  // keyboard tear) is gone by now, so give focus to the SSR.
  useEffect(() => {
    if (phase !== "revealing" || revealed.size < PROJECT_CARD_IDS.length) return
    setPhase("done")
    const zone = zoneRef.current
    const active = document.activeElement
    if (zone && (active === document.body || zone.contains(active)))
      zone
        .querySelector<HTMLElement>('[data-ssr="true"] .tc-hit')
        ?.focus({ preventScroll: true })
  }, [phase, revealed])

  const reseal = () => {
    playSfx("menu-close")
    clearTimers()
    torn.current = false
    safeLocalStorage.removeItem(OPENED_KEY)
    setFlipped(null)
    setDrawer(null)
    setSsrOut(false)
    setRevealed(NONE_REVEALED)
    setPhase("sealed")
  }

  const flip = (id: ProjectCardId | null) => {
    if (phase !== "done") return
    setFlipped(id)
    playSfx("card-flip")
  }

  const reorder = (id: ProjectCardId, to: number) => {
    const next = moveInOrder(orderRef.current, id, to)
    orderRef.current = next
    setOrder(next)
    safeLocalStorage.setJson(ORDER_KEY, next)
    playSfx("menu-move")
  }

  // ── Drag to rearrange ────────────────────────────────────────────────
  // The dragged card follows the pointer via --dx/--dy; its slot is the
  // nearest fan position. When the slot changes the order (and so the
  // card's home) moves, and `shift` compensates so it stays under the
  // pointer while the others spring into their new seats.
  const drag = useRef<Drag | null>(null)

  const onPointerMove = (event: PointerEvent) => {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.moved) {
      if (Math.hypot(dx, dy) < DRAG_SLOP) return
      state.moved = true
      state.element.setPointerCapture(state.pointerId)
      setDragging(state.id)
    }
    const slots = orderRef.current.length
    const slot = Math.max(
      0,
      Math.min(
        slots - 1,
        Math.round(
          (event.clientX - state.centre) / state.spread + (slots - 1) / 2
        )
      )
    )
    const from = orderRef.current.indexOf(state.id)
    if (slot !== from) {
      state.shift += (slot - from) * state.spread
      reorder(state.id, slot)
    }
    state.element.style.setProperty("--dx", `${dx - state.shift}px`)
    state.element.style.setProperty("--dy", `${dy}px`)
  }

  const onPointerUp = (event: PointerEvent) => {
    const state = drag.current
    if (!state || event.pointerId !== state.pointerId) return
    window.removeEventListener("pointermove", onPointerMove)
    window.removeEventListener("pointerup", onPointerUp)
    window.removeEventListener("pointercancel", onPointerUp)
    drag.current = null
    if (!state.moved) return
    state.element.style.setProperty("--dx", "0px")
    state.element.style.setProperty("--dy", "0px")
    setDragging(null)
    setSettling(state.id)
    later(500, () => setSettling(null))
  }

  const onCardPointerDown =
    (id: ProjectCardId) => (event: ReactPointerEvent<HTMLElement>) => {
      // The frame is the handle: a press counts only when it lands on the
      // face itself (its padding), never on anything inside it, so flips,
      // moves and links keep plain clicks on either side of the card.
      // The article itself counts too: the hover tilt turns the faces a
      // little, uncovering a sliver of it right at the edge.
      const onFrame =
        event.target === event.currentTarget ||
        (event.target instanceof Element &&
          event.target.classList.contains("tc-face"))
      if (phase !== "done" || !onFrame || event.button !== 0) return
      // Stop the browser's own text/element drag, which would otherwise
      // fire pointercancel a few pixels in and end ours.
      event.preventDefault()
      const hand = handRef.current
      if (!hand) return
      const rect = hand.getBoundingClientRect()
      const spread = Number.parseFloat(
        getComputedStyle(event.currentTarget).getPropertyValue("--spread")
      )
      drag.current = {
        centre: rect.left + rect.width / 2,
        element: event.currentTarget,
        id,
        moved: false,
        pointerId: event.pointerId,
        shift: 0,
        spread: Number.isFinite(spread) && spread > 0 ? spread : 190,
        startX: event.clientX,
        startY: event.clientY,
      }
      window.addEventListener("pointermove", onPointerMove)
      window.addEventListener("pointerup", onPointerUp)
      window.addEventListener("pointercancel", onPointerUp)
    }

  // ── Keyboard ─────────────────────────────────────────────────────────
  // ←/→ (h/l) move between cards, Shift+←/→ moves the focused card,
  // Escape turns a flipped card back. Keys bubbling up from the portalled
  // drawer are ignored (React events cross portals).
  const focusCard = (id: ProjectCardId) => {
    handRef.current
      ?.querySelector<HTMLElement>(
        `[data-card-id="${id}"] ${id === flipped ? ".tc-unflip" : ".tc-hit"}`
      )
      ?.focus()
  }

  const onHandKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const hand = handRef.current
    const target = event.target
    if (phase !== "done" || !hand || !(target instanceof Element)) return
    if (
      !hand.contains(target) ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return
    if (event.key === "Escape" && flipped !== null) {
      event.preventDefault()
      const id = flipped
      flip(null)
      requestAnimationFrame(() => focusCard(id))
      return
    }
    const step =
      event.key === "ArrowLeft" || event.key === "h"
        ? -1
        : event.key === "ArrowRight" || event.key === "l"
          ? 1
          : 0
    const host = target.closest<HTMLElement>("[data-card-id]")
    const id = PROJECT_CARD_IDS.find((card) => card === host?.dataset.cardId)
    if (step === 0 || !id) return
    event.preventDefault()
    const from = order.indexOf(id)
    if (event.shiftKey) {
      reorder(id, from + step)
      return
    }
    const next = order[from + step]
    if (next) focusCard(next)
  }

  // ── Drawer ───────────────────────────────────────────────────────────
  const openMove = (cardId: ProjectCardId, moveIndex: number) => {
    setDrawer({ cardId, view: moveIndex })
    playSfx("menu-open")
  }
  const changeView = (view: DrawerView) => {
    setDrawer((previous) => (previous ? { ...previous, view } : previous))
    playSfx("menu-move")
  }
  const closeDrawer = () => {
    setDrawer(null)
    playSfx("menu-close")
  }

  const middle = (order.length - 1) / 2
  const packMounted =
    zoneWidth > 0 &&
    (phase === "sealed" || phase === "rising" || phase === "spread")

  return (
    <div className="tc-section" data-reduced={reduced}>
      <div
        className="tc-zone"
        data-phase={phase}
        data-ssr-out={ssrOut}
        ref={zoneRef}
      >
        <span aria-hidden className="tc-rays-clip">
          <span className="tc-rays" />
        </span>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard delegation for the cards' own buttons (roving arrows, Shift-reorder, Escape), not a control itself. */}
        <div className="tc-hand" onKeyDown={onHandKeyDown} ref={handRef}>
          {order.map((id, index) => (
            <TradingCard
              card={PROJECT_CARDS[id]}
              dragging={dragging === id}
              flipped={flipped === id}
              index={index}
              key={id}
              offset={index - middle}
              onFlip={() => flip(id)}
              onOpenMove={(moveIndex) => openMove(id, moveIndex)}
              onPointerDown={onCardPointerDown(id)}
              onUnflip={() => flip(null)}
              revealed={revealed.has(id)}
              settling={settling === id}
              tilt={!reduced && dragging !== id}
            />
          ))}
        </div>
        {packMounted ? (
          <BoosterPack key={packWidth} onTear={tear} width={packWidth} />
        ) : null}
        <span aria-hidden className="tc-flash" />
        <p className="tc-pack-hint">{translate("about.projects.pack.hint")}</p>
      </div>
      {phase === "done" ? (
        <>
          <p className="tc-legend">
            <span>
              <Kbd>←→</Kbd>
              {translate("about.projects.legend.choose")}
            </span>
            <span>
              <Kbd>Enter</Kbd>
              {translate("about.projects.legend.flip")}
            </span>
            <span>
              <Kbd>⇧←→</Kbd>
              {translate("about.projects.legend.move")}
            </span>
            <span>
              <Kbd>⠿</Kbd>
              {translate("about.projects.legend.drag")}
            </span>
          </p>
          <button className="tc-reseal" onClick={reseal} type="button">
            <span aria-hidden className="tc-reseal-chip">
              ↺
            </span>
            <span className="tc-reseal-label">
              {translate("about.projects.reseal")}
            </span>
          </button>
        </>
      ) : null}
      <MoveDrawer
        onClose={closeDrawer}
        onView={changeView}
        reduced={reduced}
        state={drawer}
      />
    </div>
  )
}
