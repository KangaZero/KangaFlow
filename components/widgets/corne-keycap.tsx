"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// One Corne keycap: placed absolutely in its half from the layout geometry
// (CSS custom properties, so the key unit `--u` scales the whole board), with
// its legend sliding out/in when the layer or Shift changes. A real <button>
// with an aria-label; pointer and keyboard wiring come from the widget.

import { AnimatePresence, motion } from "motion/react"
import type { CSSProperties, KeyboardEvent, PointerEvent } from "react"
import { memo } from "react"

import type { CorneKey, KeyId, KeyStatus } from "@/lib/corne-layout"

// Inline custom properties (`--x`, …) alongside the regular style keys.
type KeyStyle = CSSProperties & Record<`--${string}`, number | string>

export type KeycapKind = "char" | "mod" | "noop" | "ghost"

export type CorneKeycapProps = {
  corneKey: CorneKey
  legend: string
  ariaLabel: string
  title?: string | undefined
  kind: KeycapKind
  status: KeyStatus
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
  ariaLabel,
  title,
  kind,
  status,
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
  const isGhost = kind === "ghost"
  const id = corneKey.id
  return (
    <button
      aria-disabled={isGhost || undefined}
      aria-label={ariaLabel}
      aria-pressed={pressed ?? undefined}
      className="osk-key"
      data-caps={caps || undefined}
      data-down={down || undefined}
      data-key={id}
      data-kind={kind}
      data-lit={lit || undefined}
      data-status={status}
      onClick={(event) => {
        // A virtual click from assistive tech (no pointer, no key events):
        // pointer and Enter/Space presses are handled on their own events.
        if (event.detail === 0 && !isGhost) onAssistiveClick(id)
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
      title={title}
      type="button"
    >
      {reduceMotion ? (
        <span className="osk-legend">{legend}</span>
      ) : (
        <AnimatePresence initial={false}>
          <motion.span
            animate={{ opacity: 1, scale: 1, y: "0%" }}
            className="osk-legend"
            exit={{ opacity: 0, scale: 0.85, y: "-45%" }}
            initial={{ opacity: 0, scale: 0.85, y: "45%" }}
            key={legend}
            transition={LEGEND_SPRING}
          >
            {legend}
          </motion.span>
        </AnimatePresence>
      )}
      {status === "placeholder" ? (
        <span aria-hidden className="osk-badge">
          ?
        </span>
      ) : status === "conventional" ? (
        <span aria-hidden className="osk-badge">
          ≈
        </span>
      ) : null}
    </button>
  )
}

export const CorneKeycap = memo(CorneKeycapImpl)
