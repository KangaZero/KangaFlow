"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// One Corne keycap: placed absolutely in its half from the layout geometry
// (CSS custom properties, so the key unit `--u` scales the whole board), with
// its legend sliding out/in when the layer or Shift changes. Hold-tap keys
// show the tap legend large and the hold legend small underneath. A real
// <button> with an aria-label; inert and unbound keys are aria-disabled.
// Pointer and keyboard wiring come from the widget.

import { AnimatePresence, motion } from "motion/react"
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react"
import { memo } from "react"

import type { CorneKey, KeyId } from "@/lib/corne-layout"

// Inline custom properties (`--x`, …) alongside the regular style keys.
type KeyStyle = CSSProperties & Record<`--${string}`, number | string>

// char = typed character, mod = function / modifier / layer key, inert =
// display-only (mouse, media, GUI, …), none = unbound (blank).
export type KeycapKind = "char" | "mod" | "inert" | "none"

export type CorneKeycapProps = {
  corneKey: CorneKey
  legend: string
  // Small secondary legend for a hold-tap's hold action.
  holdLegend: string | null
  ariaLabel: string
  kind: KeycapKind
  // Toggle-style keys (Shift/Ctrl/layer keys) report their engaged state.
  pressed: boolean | null
  caps: boolean
  down: boolean
  lit: boolean
  tabbable: boolean
  reduceMotion: boolean
  // Handlers take the key id so the parent can pass ONE stable callback to
  // every keycap (keeps `memo` effective across 46 keys).
  registerRef: (id: KeyId, el: HTMLButtonElement | null) => void
  onPointerDown: (id: KeyId, event: PointerEvent<HTMLButtonElement>) => void
  onPointerEnd: (event: PointerEvent<HTMLButtonElement>) => void
  onKeyDown: (id: KeyId, event: KeyboardEvent<HTMLButtonElement>) => void
  onKeyUp: (id: KeyId, event: KeyboardEvent<HTMLButtonElement>) => void
  onAssistiveClick: (id: KeyId) => void
  onFocus: (id: KeyId) => void
}

const LEGEND_SPRING = { damping: 26, stiffness: 520, type: "spring" } as const

function CorneKeycapImpl({
  corneKey,
  legend,
  holdLegend,
  ariaLabel,
  kind,
  pressed,
  caps,
  down,
  lit,
  tabbable,
  reduceMotion,
  registerRef,
  onPointerDown,
  onPointerEnd,
  onKeyDown,
  onKeyUp,
  onAssistiveClick,
  onFocus,
}: CorneKeycapProps): React.JSX.Element {
  const style: KeyStyle = {
    "--h": corneKey.h,
    "--r": `${corneKey.rotate}deg`,
    "--x": corneKey.x,
    "--y": corneKey.y,
  }
  const disabled = kind === "inert" || kind === "none"
  const id = corneKey.id
  const legends = (
    <>
      <span className="osk-tap">{legend}</span>
      {holdLegend === null ? null : (
        <span className="osk-hold">{holdLegend}</span>
      )}
    </>
  )
  return (
    <button
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      aria-pressed={pressed ?? undefined}
      className="osk-key"
      data-caps={caps || undefined}
      data-down={down || undefined}
      data-ext={corneKey.kind === "ext" || undefined}
      data-key={id}
      data-kind={kind}
      data-lit={lit || undefined}
      onClick={(event) => {
        // A virtual click from assistive tech (no pointer, no key events):
        // pointer and Enter/Space presses are handled on their own events.
        if (event.detail === 0 && !disabled) onAssistiveClick(id)
      }}
      onContextMenu={(event) => event.preventDefault()}
      onFocus={() => onFocus(id)}
      onKeyDown={(event) => onKeyDown(id, event)}
      onKeyUp={(event) => onKeyUp(id, event)}
      onLostPointerCapture={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onPointerDown={(event) => onPointerDown(id, event)}
      onPointerUp={onPointerEnd}
      ref={(el) => registerRef(id, el)}
      style={style}
      tabIndex={tabbable ? 0 : -1}
      type="button"
    >
      {reduceMotion ? (
        <span className="osk-legend">{legends}</span>
      ) : (
        <AnimatePresence initial={false}>
          <motion.span
            animate={{ opacity: 1, scale: 1, y: "0%" }}
            className="osk-legend"
            exit={{ opacity: 0, scale: 0.85, y: "-45%" }}
            initial={{ opacity: 0, scale: 0.85, y: "45%" }}
            key={JSON.stringify([legend, holdLegend])}
            transition={LEGEND_SPRING}
          >
            {legends}
          </motion.span>
        </AnimatePresence>
      )}
    </button>
  )
}

export const CorneKeycap = memo(CorneKeycapImpl)
