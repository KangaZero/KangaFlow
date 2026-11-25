// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// A fanned hand of cards you can rearrange: drag a card past a small slop to
// pick it up (it follows the pointer while the others spring into their new
// seats), ←/→ (h/l) to move focus, Shift+←/→ to move the focused card. The
// order persists in localStorage. Shared by the About projects hand and the
// achievement table hands; generic over the id union so each stays typed.
//
// Cards are found by `data-card-id` on their host element. Fan geometry comes
// from the card's computed `--spread` (slot width, px); position offsets are
// written as `--dx` / `--dy` on the dragged element (see card-hand.css).

import {
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { moveInOrder, parseOrder } from "@/lib/card-order"
import { safeLocalStorage } from "@/lib/safe-storage"

/** Pointer travel before a press becomes a drag (so a click still clicks). */
export const DRAG_SLOP = 6
/** How long a dropped card keeps `settling` (its spring-home transition). */
const SETTLE_MS = 500
/** Slot width when a card's `--spread` cannot be read. */
const FALLBACK_SPREAD = 190

type Drag<Id extends string> = {
  id: Id
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

export type CardHandOptions<Id extends string> = {
  /** Default order; also the set of valid ids for the persisted order. */
  ids: readonly Id[]
  /** localStorage key for the order. */
  storageKey: string
  /** Interaction gate (e.g. only once a pack is open). */
  enabled: boolean
  /** CSS selector (inside the card host) of the element that takes focus. */
  focusSelector: (id: Id) => string
  /** Which presses may start a drag. Defaults to any primary-button press. */
  isHandle?: (event: ReactPointerEvent<HTMLElement>) => boolean
  /**
   * Cancel the press's default action. Needed when the handle sits over text
   * or images, whose native drag would fire pointercancel a few px in. Off for
   * plain buttons, where it would also stop click-to-focus.
   */
  preventNativeDrag?: boolean
  /** Side effect after every reorder (sound, analytics…). */
  onReorder?: () => void
}

export type CardHand<Id extends string> = {
  order: readonly Id[]
  dragging: Id | null
  settling: Id | null
  handRef: RefObject<HTMLDivElement | null>
  onCardPointerDown: (id: Id) => (event: ReactPointerEvent<HTMLElement>) => void
  /** Handles ←/→/h/l and Shift-reorder; returns true when it consumed the key. */
  onHandKeyDown: (event: ReactKeyboardEvent<HTMLElement>) => boolean
  focusCard: (id: Id) => void
  reorder: (id: Id, to: number) => void
}

const STEP_KEYS: Readonly<Record<string, -1 | 1>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  h: -1,
  l: 1,
}

export function useCardHand<Id extends string>({
  ids,
  storageKey,
  enabled,
  focusSelector,
  isHandle,
  preventNativeDrag = false,
  onReorder,
}: CardHandOptions<Id>): CardHand<Id> {
  const [order, setOrder] = useState<readonly Id[]>(ids)
  const [dragging, setDragging] = useState<Id | null>(null)
  const [settling, setSettling] = useState<Id | null>(null)
  const handRef = useRef<HTMLDivElement>(null)
  // Pointer handlers outlive renders, so they read the order from a ref. It
  // is written where the order changes (never during render).
  const orderRef = useRef<readonly Id[]>(ids)
  const drag = useRef<Drag<Id> | null>(null)
  const settleTimer = useRef(0)

  // Restore after hydration: storage is client-only, so the prerendered HTML
  // always shows the default order.
  useEffect(() => {
    const stored = safeLocalStorage.getJson(storageKey, [...ids], (raw) =>
      parseOrder(raw, ids)
    )
    orderRef.current = stored
    setOrder(stored)
  }, [storageKey, ids])

  useEffect(() => () => window.clearTimeout(settleTimer.current), [])

  const reorder = useCallback(
    (id: Id, to: number) => {
      const next = moveInOrder(orderRef.current, id, to)
      orderRef.current = next
      setOrder(next)
      safeLocalStorage.setJson(storageKey, next)
      onReorder?.()
    },
    [storageKey, onReorder]
  )

  const focusCard = useCallback(
    (id: Id) => {
      handRef.current
        ?.querySelector<HTMLElement>(
          `[data-card-id="${id}"] ${focusSelector(id)}`
        )
        ?.focus()
    },
    [focusSelector]
  )

  const onCardPointerDown =
    (id: Id) => (event: ReactPointerEvent<HTMLElement>) => {
      if (!enabled || event.button !== 0) return
      if (isHandle && !isHandle(event)) return
      if (preventNativeDrag) event.preventDefault()
      const hand = handRef.current
      if (!hand) return
      const rect = hand.getBoundingClientRect()
      const spread = Number.parseFloat(
        getComputedStyle(event.currentTarget).getPropertyValue("--spread")
      )
      const state: Drag<Id> = {
        centre: rect.left + rect.width / 2,
        element: event.currentTarget,
        id,
        moved: false,
        pointerId: event.pointerId,
        shift: 0,
        spread:
          Number.isFinite(spread) && spread > 0 ? spread : FALLBACK_SPREAD,
        startX: event.clientX,
        startY: event.clientY,
      }
      drag.current = state

      // The dragged card follows the pointer via --dx/--dy; its slot is the
      // nearest fan position. When the slot changes the order (and so the
      // card's home) moves, and `shift` compensates so it stays under the
      // pointer while the others spring into their new seats.
      const onMove = (move: PointerEvent) => {
        if (move.pointerId !== state.pointerId) return
        const dx = move.clientX - state.startX
        const dy = move.clientY - state.startY
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
              (move.clientX - state.centre) / state.spread + (slots - 1) / 2
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

      const onUp = (up: PointerEvent) => {
        if (up.pointerId !== state.pointerId) return
        window.removeEventListener("pointermove", onMove)
        window.removeEventListener("pointerup", onUp)
        window.removeEventListener("pointercancel", onUp)
        drag.current = null
        if (!state.moved) return
        // A drag ends on the card it started on, so the browser still fires a
        // click there; swallow that one click so dropping never activates it.
        window.addEventListener(
          "click",
          (click) => {
            click.preventDefault()
            click.stopPropagation()
          },
          { capture: true, once: true }
        )
        state.element.style.setProperty("--dx", "0px")
        state.element.style.setProperty("--dy", "0px")
        setDragging(null)
        setSettling(state.id)
        window.clearTimeout(settleTimer.current)
        settleTimer.current = window.setTimeout(
          () => setSettling(null),
          SETTLE_MS
        )
      }

      window.addEventListener("pointermove", onMove)
      window.addEventListener("pointerup", onUp)
      window.addEventListener("pointercancel", onUp)
    }

  const onHandKeyDown = (event: ReactKeyboardEvent<HTMLElement>): boolean => {
    const hand = handRef.current
    const target = event.target
    if (!enabled || !hand || !(target instanceof Element)) return false
    if (
      !hand.contains(target) ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
      return false
    const step = STEP_KEYS[event.key]
    const host = target.closest<HTMLElement>("[data-card-id]")
    const id = orderRef.current.find((card) => card === host?.dataset.cardId)
    if (step === undefined || id === undefined) return false
    event.preventDefault()
    const from = orderRef.current.indexOf(id)
    if (event.shiftKey) {
      reorder(id, from + step)
      // The card moved under focus; keep focus on it after React re-renders.
      requestAnimationFrame(() => focusCard(id))
      return true
    }
    const next = orderRef.current[from + step]
    if (next !== undefined) focusCard(next)
    return true
  }

  return {
    dragging,
    focusCard,
    handRef,
    onCardPointerDown,
    onHandKeyDown,
    order,
    reorder,
    settling,
  }
}
