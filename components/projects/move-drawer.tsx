"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The move drawer: Cult UI Family Drawer behaviour (bottom sheet, drag to
// dismiss, height morphing between an overview and a move detail) built from
// what the app already ships — Radix Dialog for semantics, focus trap,
// Escape and focus return; Motion for the slide and the drag; a
// ResizeObserver (useElementSize) for the height morph. No vaul.

import { AnimatePresence, motion, useDragControls } from "motion/react"
import { Dialog } from "radix-ui"
import { useEffect, useLayoutEffect, useRef } from "react"
import { MoveDemo } from "@/components/projects/move-demos"
import { Pips } from "@/components/projects/trading-card"
import { useElementSize } from "@/hooks/use-element-size"
import { interpolate } from "@/lib/i18n"
import { moveVars, PROJECT_CARDS, type ProjectCardId } from "@/lib/projects"
import { useLocale } from "@/providers/locale-provider"

export type DrawerView = "overview" | number
export type DrawerState = { cardId: ProjectCardId; view: DrawerView }

// Family Drawer's morph timing: duration scales with the distance, floored.
const MORPH_EASE = [0.25, 1, 0.5, 1] as const
const DISMISS_DISTANCE = 120
const DISMISS_VELOCITY = 600

export function MoveDrawer({
  state,
  reduced,
  onView,
  onClose,
}: {
  state: DrawerState | null
  reduced: boolean
  onView: (view: DrawerView) => void
  onClose: () => void
}) {
  return (
    <Dialog.Root
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      open={state !== null}
    >
      <AnimatePresence>
        {state ? (
          <DrawerSheet
            key="sheet"
            onClose={onClose}
            onView={onView}
            reduced={reduced}
            state={state}
          />
        ) : null}
      </AnimatePresence>
    </Dialog.Root>
  )
}

function DrawerSheet({
  state,
  reduced,
  onView,
  onClose,
}: {
  state: DrawerState
  reduced: boolean
  onView: (view: DrawerView) => void
  onClose: () => void
}) {
  const { translate } = useLocale()
  const card = PROJECT_CARDS[state.cardId]
  const controls = useDragControls()
  const contentRef = useRef<HTMLDivElement>(null)
  const innerRef = useRef<HTMLDivElement>(null)
  const { height } = useElementSize(innerRef)

  // Height morph: animate from the last measured height to the new one.
  const lastHeight = useRef(0)
  const morph =
    reduced || lastHeight.current === 0
      ? 0
      : Math.max(Math.abs(height - lastHeight.current) / 500, 0.27)
  useEffect(() => {
    lastHeight.current = height
  }, [height])

  // Each view remounts its buttons, so put focus on the view's primary
  // control (Radix's own open-focus is skipped for the same reason).
  const viewKey = `${state.cardId}:${state.view}`
  // Radix returns focus only to a Dialog.Trigger; the opener here is a move
  // button on the card's back, so remember it and hand focus back on close.
  const opener = useRef<HTMLElement | null>(null)
  useLayoutEffect(() => {
    const active = document.activeElement
    if (active instanceof HTMLElement) opener.current = active
  }, [])

  const focusPrimary = () =>
    contentRef.current
      ?.querySelector<HTMLElement>("[data-autofocus]")
      ?.focus({ preventScroll: true })
  // biome-ignore lint/correctness/useExhaustiveDependencies: viewKey is the trigger (a new view mounted); focusPrimary only reads a ref.
  useEffect(focusPrimary, [viewKey])

  const slide = reduced ? { duration: 0 } : { duration: 0.45, ease: MORPH_EASE }

  return (
    <Dialog.Portal forceMount>
      <Dialog.Overlay asChild forceMount>
        <motion.div
          animate={{ opacity: 1 }}
          className="md-overlay"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          transition={reduced ? { duration: 0 } : { duration: 0.3 }}
        />
      </Dialog.Overlay>
      <Dialog.Content
        asChild
        forceMount
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          opener.current?.focus({ preventScroll: true })
        }}
        onOpenAutoFocus={(event) => {
          // The portal mounts a frame after this component's effects ran,
          // so the open focus is placed here rather than by the view effect.
          event.preventDefault()
          focusPrimary()
        }}
      >
        <motion.div
          animate={{ y: 0 }}
          className={`md-sheet tc-type-${card.type}`}
          data-reduced={reduced}
          drag="y"
          dragConstraints={{ bottom: 0, top: 0 }}
          dragControls={controls}
          dragElastic={{ bottom: 0.8, top: 0 }}
          dragListener={false}
          exit={{ y: "110%" }}
          initial={{ y: "110%" }}
          onDragEnd={(_, info) => {
            if (
              info.offset.y > DISMISS_DISTANCE ||
              info.velocity.y > DISMISS_VELOCITY
            )
              onClose()
          }}
          ref={contentRef}
          transition={slide}
        >
          <div className="md-card">
            <span
              aria-hidden
              className="md-handle"
              onPointerDown={(event) => controls.start(event)}
            />
            <Dialog.Close
              aria-label={translate("about.projects.drawer.close")}
              className="md-close"
            >
              ESC ✕
            </Dialog.Close>
            <motion.div
              animate={{ height: height || "auto" }}
              className="md-body"
              initial={false}
              transition={{ duration: morph, ease: MORPH_EASE }}
            >
              <div ref={innerRef}>
                <motion.div
                  animate={{ filter: "blur(0px)", opacity: 1, scale: 1 }}
                  className="md-view"
                  initial={
                    reduced
                      ? false
                      : { filter: "blur(4px)", opacity: 0, scale: 0.97 }
                  }
                  key={viewKey}
                  onPointerDown={(event) => {
                    // The heading area doubles as a drag handle.
                    if (
                      event.target instanceof Element &&
                      event.target.closest(".md-grab")
                    )
                      controls.start(event)
                  }}
                  transition={{ duration: 0.28, ease: MORPH_EASE }}
                >
                  {state.view === "overview" ? (
                    <Overview cardId={state.cardId} onView={onView} />
                  ) : (
                    <MoveDetail
                      animate={!reduced}
                      cardId={state.cardId}
                      moveIndex={state.view}
                      onView={onView}
                    />
                  )}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </Dialog.Content>
    </Dialog.Portal>
  )
}

function Overview({
  cardId,
  onView,
}: {
  cardId: ProjectCardId
  onView: (view: DrawerView) => void
}) {
  const { translate } = useLocale()
  const card = PROJECT_CARDS[cardId]
  return (
    <>
      <div className="md-grab">
        <p className="md-kicker">{card.name}</p>
        <Dialog.Title className="md-title">
          {translate("about.projects.drawer.moves")}
        </Dialog.Title>
      </div>
      <Dialog.Description className="md-desc">
        {translate(`about.projects.cards.${cardId}.blurb`)}
      </Dialog.Description>
      <ol className="md-list">
        {card.moves.map((move, k) => (
          <li key={move.id}>
            <button
              className="md-row"
              data-autofocus={k === 0 ? true : undefined}
              onClick={() => onView(k)}
              type="button"
            >
              <span aria-hidden className="md-no">
                0{k + 1}
              </span>
              <b>{translate(`about.projects.moves.${move.id}.name`)}</b>
              <Pips count={move.cost} />
            </button>
          </li>
        ))}
      </ol>
    </>
  )
}

function MoveDetail({
  cardId,
  moveIndex,
  animate,
  onView,
}: {
  cardId: ProjectCardId
  moveIndex: number
  animate: boolean
  onView: (view: DrawerView) => void
}) {
  const { locale, translate } = useLocale()
  const card = PROJECT_CARDS[cardId]
  const move = card.moves[moveIndex]
  if (!move) return null
  const vars = moveVars(locale)
  const next = (moveIndex + 1) % card.moves.length
  return (
    <>
      <div className="md-grab">
        <p className="md-kicker">
          {card.name} · 0{moveIndex + 1}
        </p>
        <Dialog.Title className="md-title">
          {translate(`about.projects.moves.${move.id}.name`)}
        </Dialog.Title>
        <Pips count={move.cost} />
      </div>
      <div aria-hidden className="md-demo">
        <MoveDemo animate={animate} id={move.id} />
      </div>
      <Dialog.Description className="md-desc">
        {interpolate(translate(`about.projects.moves.${move.id}.desc`), vars)}
      </Dialog.Description>
      <ul className="md-chips">
        {translate(`about.projects.moves.${move.id}.chips`).map((chip) => (
          <li key={chip}>{interpolate(chip, vars)}</li>
        ))}
      </ul>
      <div className="md-nav">
        <button
          className="md-btn"
          data-autofocus
          onClick={() => onView("overview")}
          type="button"
        >
          <span>← {translate("about.projects.drawer.allMoves")}</span>
        </button>
        <button className="md-btn" onClick={() => onView(next)} type="button">
          <span>{translate("about.projects.drawer.nextMove")} →</span>
        </button>
      </div>
    </>
  )
}
