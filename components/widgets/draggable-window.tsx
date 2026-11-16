"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/widgets/widgets.css"

import { X } from "lucide-react"
import {
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
  useReducedMotion,
} from "motion/react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { GLASS_SURFACE, WINDOW_ELEVATION } from "@/components/niri/glass"
import {
  WIDGET_STATE_STORAGE_PREFIX as STORAGE_PREFIX,
  WIDGET_ANCHOR_CLASS,
  type WidgetAnchor,
} from "@/components/niri/settings"
import { Button } from "@/components/ui/button"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { SPRING_ACCORDION, SPRING_CONTENT } from "@/lib/motion"
import { safeLocalStorage } from "@/lib/safe-storage"
import { cn } from "@/lib/utils"
import { RESIZE_STEP, snapDelta, vimWindowAction } from "@/lib/vim-window"
import { Z_LAYERS } from "@/lib/z-order"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useZOrder } from "@/providers/z-order-provider"

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

type StoredState = {
  position?: { x: number; y: number }
  size?: { width: number; height: number }
}

function loadState(key: string): StoredState {
  return safeLocalStorage.getJson<StoredState>(
    STORAGE_PREFIX + key,
    {},
    (raw) => (raw && typeof raw === "object" ? (raw as StoredState) : null)
  )
}

function saveState(key: string, patch: Partial<StoredState>): void {
  const current = loadState(key)
  safeLocalStorage.setJson(STORAGE_PREFIX + key, { ...current, ...patch })
}

export type DraggableWindowProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  icon?: React.ReactNode
  storageKey: string
  defaultWidth?: number
  defaultHeight?: number
  minWidth?: number
  minHeight?: number
  maxWidth?: number
  maxHeight?: number
  // Tailwind fixed-position classes for the initial anchor. Drag offset is
  // applied on top via motion values, so the CSS position is only the home base.
  positionClassName?: string
  // Configured anchor (from settings) — overrides positionClassName when set.
  anchor?: WidgetAnchor
  // Configured default drag offset ("apply current"); used only when the window
  // has no remembered position yet.
  defaultOffset?: { x: number; y: number } | null
  // Fired when the window gains focus (open / pointer-down). Lets a caller sync
  // external focus state — e.g. a floated niri column marking itself focused.
  onFocus?: () => void
  // Draws attention to the window (e.g. a ringing alarm): a soft breathing
  // accent glow around the frame. Purely visual.
  attention?: boolean
  // Extra px added below the user's (persisted, resizable) height — e.g. an
  // inline accordion growing out of the bottom edge. Animated with
  // SPRING_ACCORDION; never persisted, so collapsing restores the user's size.
  heightOffset?: number
  children: React.ReactNode
}

// Where a closing window "minimises" to: bottom-centre of the viewport (the
// dock area). Expressed as a transform-origin relative to the window, so a
// scale-down visibly flies toward that point without touching the drag x/y
// motion values (those persist across open/close and must keep the position).
function minimiseOrigin(el: HTMLElement | null): {
  originX: number
  originY: number
} {
  if (el == null) return { originX: 0.5, originY: 1 }
  const rect = el.getBoundingClientRect()
  const dockX = window.innerWidth / 2
  const dockY = window.innerHeight - 24
  return {
    originX: rect.width > 0 ? (dockX - rect.left) / rect.width : 0.5,
    originY: rect.height > 0 ? (dockY - rect.top) / rect.height : 1,
  }
}

export function DraggableWindow({
  isOpen,
  onClose,
  title,
  icon,
  storageKey,
  defaultWidth = 320,
  defaultHeight = 400,
  minWidth = 240,
  minHeight = 180,
  maxWidth = 900,
  maxHeight = 800,
  positionClassName = "bottom-4 right-4",
  anchor,
  defaultOffset = null,
  onFocus,
  attention = false,
  heightOffset = 0,
  children,
}: DraggableWindowProps): React.JSX.Element | null {
  const { envSettings, animationPref } = useGlobalStates()
  const reduceMotion = isReducedMotion(animationPref, useReducedMotion())
  const { bringToFront, activeId } = useZOrder()
  // Latest handlers read through refs so the focus effect can stay off them
  // (their identity changes each render; depending on them would re-raise every
  // render).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose
  const onFocusRef = useRef(onFocus)
  onFocusRef.current = onFocus
  const focus = (): void => {
    onFocusRef.current?.()
    setZ(bringToFront(() => onCloseRef.current(), storageKey))
  }
  const isActive = activeId === storageKey
  const windowRef = useRef<HTMLDivElement>(null)
  const gPendingRef = useRef(false)
  const [mounted, setMounted] = useState(false)
  // Per-window stacking value from the shared click-to-front counter; bumped
  // when the window opens and on every pointer-down so the active widget rises
  // above its peers.
  const [z, setZ] = useState<number>(Z_LAYERS.window)
  const constraintsRef = useRef<HTMLDivElement>(null)
  // Drag bounds as a plain box in x/y-offset space, refreshed from the
  // viewport right before each drag starts. A ref-element constraint would
  // make Motion re-scale the position whenever the window's layout changes
  // (resize, the accordion's heightOffset), nudging the window on its own.
  const dragBounds = useRef({ bottom: 0, left: 0, right: 0, top: 0 })
  const dragControls = useDragControls()

  const anchorClass = anchor ? WIDGET_ANCHOR_CLASS[anchor] : positionClassName
  const saved = loadState(storageKey)
  const x = useMotionValue(saved.position?.x ?? defaultOffset?.x ?? 0)
  const y = useMotionValue(saved.position?.y ?? defaultOffset?.y ?? 0)

  const [size, setSize] = useState({
    height: saved.size?.height ?? defaultHeight,
    width: saved.size?.width ?? defaultWidth,
  })

  // Refs used by the resize pointer-capture handler (avoids stale closure issues).
  const startSizeRef = useRef({ height: 0, width: 0 })
  const startPosRef = useRef({ x: 0, y: 0 })
  // While the corner is being dragged, height follows the pointer instantly
  // (a spring there would lag behind the cursor).
  const [isResizing, setIsResizing] = useState(false)
  const totalHeight = size.height + heightOffset

  // Growth direction for heightOffset: content should extend DOWNWARD from the
  // current top edge. A bottom-anchored window would naturally grow upward, so
  // it slides down by as much free space as there is below it (negative
  // margin-bottom); a top-anchored one grows down and only slides up if it
  // would overflow the viewport (negative margin-top). Centred windows
  // (`m-auto`) grow evenly and are left alone.
  const anchorEdge: "top" | "bottom" | "center" = /\bbottom-/.test(anchorClass)
    ? "bottom"
    : /\btop-/.test(anchorClass)
      ? "top"
      : "center"
  const [growShift, setGrowShift] = useState(0)
  useLayoutEffect(() => {
    if (!isOpen || anchorEdge === "center" || heightOffset === 0) {
      setGrowShift(0)
      return
    }
    const el = windowRef.current
    if (el == null) return
    // Measured before the height animation starts: the collapsed frame.
    const rect = el.getBoundingClientRect()
    const spaceBelow = Math.max(0, window.innerHeight - rect.bottom - 12)
    setGrowShift(
      anchorEdge === "bottom"
        ? Math.min(heightOffset, spaceBelow) // slide down this much
        : Math.max(0, heightOffset - spaceBelow) // slide up only on overflow
    )
  }, [heightOffset, isOpen, anchorEdge])
  const growMargins =
    anchorEdge === "bottom"
      ? { marginBottom: -growShift }
      : anchorEdge === "top"
        ? { marginTop: -growShift }
        : {}

  useEffect(() => setMounted(true), [])
  // Opening (or re-opening) a widget brings it to the front and registers it as
  // the close target for the unified close shortcut.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `focus` closes over stable refs; depending on it (recreated each render) would re-raise every render.
  useEffect(() => {
    if (isOpen) focus()
  }, [isOpen])

  // Vim-style keyboard control while this window owns focus: Shift+H/J/K/L move,
  // gg/G/0/$ snap to viewport edges, Alt+-/= resize width, Alt+Shift+-/= resize
  // height. Guards against hijacking typing in inputs/editors.
  useEffect(() => {
    if (!(isActive && isOpen)) return
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target as HTMLElement | null
      const editable =
        target != null &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA")
      if (editable && !event.altKey) return
      const { action, pendingG } = vimWindowAction(
        event.key,
        event.code,
        { alt: event.altKey, shift: event.shiftKey },
        gPendingRef.current
      )
      gPendingRef.current = pendingG
      if (!action) return
      event.preventDefault()
      if (action.type === "move") {
        const el = windowRef.current
        if (!el) return
        const rect = el.getBoundingClientRect()
        // Clamp the real screen position, then convert back to an offset delta.
        const nextLeft = clamp(
          rect.left + action.dx,
          0,
          window.innerWidth - rect.width
        )
        const nextTop = clamp(
          rect.top + action.dy,
          0,
          window.innerHeight - rect.height
        )
        x.set(x.get() + (nextLeft - rect.left))
        y.set(y.get() + (nextTop - rect.top))
        saveState(storageKey, { position: { x: x.get(), y: y.get() } })
      } else if (action.type === "snap") {
        const el = windowRef.current
        if (!el) return
        const { dx, dy } = snapDelta(
          el.getBoundingClientRect(),
          { height: window.innerHeight, width: window.innerWidth },
          action.edge,
          8
        )
        x.set(x.get() + dx)
        y.set(y.get() + dy)
        saveState(storageKey, { position: { x: x.get(), y: y.get() } })
      } else {
        setSize((s) => {
          const next =
            action.axis === "width"
              ? {
                  height: s.height,
                  width: clamp(
                    s.width + action.dir * RESIZE_STEP,
                    minWidth,
                    maxWidth
                  ),
                }
              : {
                  height: clamp(
                    s.height + action.dir * RESIZE_STEP,
                    minHeight,
                    maxHeight
                  ),
                  width: s.width,
                }
          saveState(storageKey, { size: next })
          return next
        })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [
    isActive,
    isOpen,
    storageKey,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    x,
    y,
  ])
  if (!mounted) return null

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0"
      ref={constraintsRef}
      style={{ zIndex: z }}
    >
      <AnimatePresence>
        {isOpen ? (
          <motion.div
            animate={
              reduceMotion
                ? { ...growMargins, height: totalHeight, opacity: 1 }
                : {
                    ...growMargins,
                    filter: "blur(0px)",
                    height: totalHeight,
                    opacity: 1,
                    scale: 1,
                  }
            }
            className={cn(
              "text-card-foreground pointer-events-auto fixed flex scrollbar-none flex-col overflow-hidden transition-shadow duration-300",
              GLASS_SURFACE[envSettings.glass],
              isActive ? WINDOW_ELEVATION.focused : WINDOW_ELEVATION.rest,
              attention && !reduceMotion && "window-attention",
              anchorClass
            )}
            data-focused={isActive}
            drag
            dragConstraints={dragBounds.current}
            dragControls={dragControls}
            dragElastic={0.06}
            dragListener={false}
            dragMomentum={false}
            exit="minimise"
            initial={
              reduceMotion
                ? { height: totalHeight, opacity: 0 }
                : {
                    filter: "blur(8px)",
                    height: totalHeight,
                    opacity: 0,
                    scale: 0.94,
                  }
            }
            onDragEnd={() =>
              saveState(storageKey, { position: { x: x.get(), y: y.get() } })
            }
            // Capture phase so any interaction anywhere in the window (title-bar
            // drag, content click, resize) raises it before those handlers run.
            onPointerDownCapture={focus}
            ref={windowRef}
            style={{
              borderRadius: envSettings.windowRadius,
              width: size.width,
              x,
              y,
            }}
            transition={{
              ...SPRING_CONTENT,
              filter: { duration: 0.26, ease: "easeOut" },
              height:
                isResizing || reduceMotion ? { duration: 0 } : SPRING_ACCORDION,
              marginBottom: reduceMotion ? { duration: 0 } : SPRING_ACCORDION,
              marginTop: reduceMotion ? { duration: 0 } : SPRING_ACCORDION,
            }}
            // Exit: squeeze, then shrink toward the dock (bottom-centre).
            variants={{
              minimise: () =>
                reduceMotion
                  ? { opacity: 0, transition: { duration: 0.12 } }
                  : {
                      ...minimiseOrigin(windowRef.current),
                      opacity: [1, 0.9, 0],
                      scaleX: [1, 0.7, 0.06],
                      scaleY: [1, 0.55, 0.06],
                      transition: {
                        duration: 0.38,
                        ease: [0.5, 0, 0.75, 0],
                        times: [0, 0.45, 1],
                      },
                    },
            }}
          >
            {/* Title bar — drag handle. Native-style: icon, centred title,
                close; the title brightens when the window is active. */}
            <div
              className="grid cursor-grab grid-cols-[1.5rem_1fr_1.5rem] items-center gap-2 px-3 py-2 select-none active:cursor-grabbing"
              onPointerDown={(e) => {
                const el = windowRef.current
                if (el != null) {
                  const rect = el.getBoundingClientRect()
                  const bounds = dragBounds.current
                  bounds.left = x.get() - rect.left
                  bounds.right = x.get() + (window.innerWidth - rect.right)
                  bounds.top = y.get() - rect.top
                  bounds.bottom = y.get() + (window.innerHeight - rect.bottom)
                }
                dragControls.start(e)
              }}
            >
              <span aria-hidden className="text-muted-foreground flex">
                {icon}
              </span>
              <span
                className={cn(
                  "truncate text-center text-xs font-semibold tracking-tight transition-colors duration-300",
                  isActive ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {title}
              </span>
              <Button
                aria-label={`Close ${title}`}
                className="size-6 justify-self-end transition-transform active:scale-90"
                onClick={onClose}
                size="icon"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-auto">{children}</div>

            {/* Resize handle — bottom-right corner, uses pointer capture */}
            <div
              aria-hidden
              className="absolute right-0 bottom-0 size-5 cursor-se-resize touch-none"
              onPointerDown={(e) => {
                e.stopPropagation()
                e.currentTarget.setPointerCapture(e.pointerId)
                setIsResizing(true)
                startSizeRef.current = { ...size }
                startPosRef.current = { x: e.clientX, y: e.clientY }
              }}
              onPointerMove={(e) => {
                if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
                setSize({
                  height: Math.max(
                    minHeight,
                    Math.min(
                      maxHeight,
                      startSizeRef.current.height +
                        e.clientY -
                        startPosRef.current.y
                    )
                  ),
                  width: Math.max(
                    minWidth,
                    Math.min(
                      maxWidth,
                      startSizeRef.current.width +
                        e.clientX -
                        startPosRef.current.x
                    )
                  ),
                })
              }}
              onPointerUp={(e) => {
                e.currentTarget.releasePointerCapture(e.pointerId)
                setIsResizing(false)
                const finalSize = {
                  height: Math.max(
                    minHeight,
                    Math.min(
                      maxHeight,
                      startSizeRef.current.height +
                        e.clientY -
                        startPosRef.current.y
                    )
                  ),
                  width: Math.max(
                    minWidth,
                    Math.min(
                      maxWidth,
                      startSizeRef.current.width +
                        e.clientX -
                        startPosRef.current.x
                    )
                  ),
                }
                setSize(finalSize)
                saveState(storageKey, { size: finalSize })
              }}
            >
              {/* Corner indicator */}
              <svg
                aria-hidden={true}
                className="text-muted-foreground/40 absolute right-1 bottom-1"
                fill="none"
                height={8}
                viewBox="0 0 8 8"
                width={8}
              >
                <line
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth={1.5}
                  x1="1"
                  x2="7"
                  y1="7"
                  y2="1"
                />
                <line
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth={1.5}
                  x1="4"
                  x2="7"
                  y1="7"
                  y2="4"
                />
                <line
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeWidth={1.5}
                  x1="7"
                  x2="7"
                  y1="7"
                  y2="7"
                />
              </svg>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
  )
}
