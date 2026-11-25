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
// visitor lands on their hand. Drag + keyboard reordering live in
// hooks/use-card-hand (shared with the achievement table).

import { useReducedMotion } from "motion/react"
import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"
import "@/components/card-hand.css"
import { BoosterPack } from "@/components/projects/booster-pack"
import {
  type DrawerState,
  type DrawerView,
  MoveDrawer,
} from "@/components/projects/move-drawer"
import { TradingCard } from "@/components/projects/trading-card"
import { Kbd } from "@/components/ui/kbd"
import { useCardHand } from "@/hooks/use-card-hand"
import { useElementSize } from "@/hooks/use-element-size"
import { isReducedMotion } from "@/lib/isReducedMotion"
import {
  DEFAULT_CARD_ORDER,
  PROJECT_CARD_IDS,
  PROJECT_CARDS,
  type ProjectCardId,
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

/** Reorder sound, shared by drag and Shift+←/→. */
function playMoveSound(): void {
  playSfx("menu-move")
}

/**
 * The frame is the drag handle: a press counts only when it lands on the face
 * itself (its padding), never on anything inside it, so flips, moves and links
 * keep plain clicks on either side of the card. The article itself counts
 * too: the hover tilt turns the faces a little, uncovering a sliver of it
 * right at the edge.
 */
function isFrameHandle(event: ReactPointerEvent<HTMLElement>): boolean {
  return (
    event.target === event.currentTarget ||
    (event.target instanceof Element &&
      event.target.classList.contains("tc-face"))
  )
}

export function ProjectCards() {
  const { translate } = useLocale()
  const { animationPref } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())

  const [phase, setPhase] = useState<Phase>("sealed")
  const [revealed, setRevealed] =
    useState<ReadonlySet<ProjectCardId>>(NONE_REVEALED)
  const [flipped, setFlipped] = useState<ProjectCardId | null>(null)
  const [ssrOut, setSsrOut] = useState(false)
  const [drawer, setDrawer] = useState<DrawerState | null>(null)

  const zoneRef = useRef<HTMLDivElement>(null)
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

  const focusSelector = useCallback(
    (id: ProjectCardId) => (id === flipped ? ".tc-unflip" : ".tc-hit"),
    [flipped]
  )
  const {
    dragging,
    focusCard,
    handRef,
    onCardPointerDown,
    onHandKeyDown: onHandArrows,
    order,
    settling,
  } = useCardHand({
    enabled: phase === "done",
    focusSelector,
    ids: DEFAULT_CARD_ORDER,
    isHandle: isFrameHandle,
    onReorder: playMoveSound,
    preventNativeDrag: true,
    storageKey: ORDER_KEY,
  })
  const orderRef = useRef(order)
  useEffect(() => {
    orderRef.current = order
  }, [order])

  // Restore a returning visitor's opened pack (after hydration: storage is
  // client-only, so the prerendered HTML is always the sealed pack). The hand
  // order is restored by useCardHand.
  useEffect(() => {
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

  // ── Keyboard ─────────────────────────────────────────────────────────
  // ←/→ (h/l) and Shift+←/→ come from useCardHand; Escape turns a flipped
  // card back. Keys bubbling up from the portalled drawer are ignored (React
  // events cross portals): the hook only acts on targets inside the hand.
  const onHandKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const hand = handRef.current
    if (phase !== "done" || !hand || !(event.target instanceof Element)) return
    if (!hand.contains(event.target)) return
    if (event.key === "Escape" && flipped !== null) {
      event.preventDefault()
      const id = flipped
      flip(null)
      requestAnimationFrame(() => focusCard(id))
      return
    }
    onHandArrows(event)
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
        <div
          className="card-hand tc-hand"
          onKeyDown={onHandKeyDown}
          ref={handRef}
        >
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
              {translate("cardHand.legend.choose")}
            </span>
            <span>
              <Kbd>Enter</Kbd>
              {translate("about.projects.legend.flip")}
            </span>
            <span>
              <Kbd>⇧←→</Kbd>
              {translate("cardHand.legend.move")}
            </span>
            <span>
              <Kbd>⠿</Kbd>
              {translate("cardHand.legend.drag")}
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
