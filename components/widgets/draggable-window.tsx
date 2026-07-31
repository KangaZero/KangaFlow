"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { GripHorizontal, X } from "lucide-react"
import {
  AnimatePresence,
  motion,
  useDragControls,
  useMotionValue,
} from "motion/react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { GLASS_SURFACE } from "@/components/niri/glass"
import {
  WIDGET_STATE_STORAGE_PREFIX as STORAGE_PREFIX,
  WIDGET_ANCHOR_CLASS,
  type WidgetAnchor,
} from "@/components/niri/settings"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Z_LAYERS } from "@/lib/z-order"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useBringToFront } from "@/providers/z-order-provider"

type StoredState = {
  position?: { x: number; y: number }
  size?: { width: number; height: number }
}

function loadState(key: string): StoredState {
  if (typeof window === "undefined") return {}
  try {
    return JSON.parse(
      window.localStorage.getItem(STORAGE_PREFIX + key) ?? "{}"
    ) as StoredState
  } catch {
    return {}
  }
}

function saveState(key: string, patch: Partial<StoredState>): void {
  const current = loadState(key)
  window.localStorage.setItem(
    STORAGE_PREFIX + key,
    JSON.stringify({ ...current, ...patch })
  )
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
  children: React.ReactNode
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
  children,
}: DraggableWindowProps): React.JSX.Element | null {
  const { envSettings } = useGlobalStates()
  const bringToFront = useBringToFront()
  const [mounted, setMounted] = useState(false)
  // Per-window stacking value from the shared click-to-front counter; bumped
  // when the window opens and on every pointer-down so the active widget rises
  // above its peers.
  const [z, setZ] = useState<number>(Z_LAYERS.window)
  const constraintsRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => setMounted(true), [])
  // Opening (or re-opening) a widget brings it to the front of the stack.
  useEffect(() => {
    if (isOpen) setZ(bringToFront())
  }, [isOpen, bringToFront])
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
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "pointer-events-auto fixed flex flex-col overflow-hidden text-card-foreground",
              GLASS_SURFACE[envSettings.glass],
              anchorClass
            )}
            drag
            dragConstraints={constraintsRef}
            dragControls={dragControls}
            dragElastic={0.06}
            dragListener={false}
            dragMomentum={false}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            onDragEnd={() =>
              saveState(storageKey, { position: { x: x.get(), y: y.get() } })
            }
            // Capture phase so any interaction anywhere in the window (title-bar
            // drag, content click, resize) raises it before those handlers run.
            onPointerDownCapture={() => setZ(bringToFront())}
            style={{
              borderRadius: envSettings.windowRadius,
              height: size.height,
              width: size.width,
              x,
              y,
            }}
            transition={{ damping: 26, stiffness: 320, type: "spring" }}
          >
            {/* Title bar — drag handle */}
            <div
              className="flex cursor-grab items-center gap-2 border-border border-b bg-muted/40 px-3 py-2 active:cursor-grabbing"
              onPointerDown={(e) => dragControls.start(e)}
            >
              <GripHorizontal
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground"
              />
              {icon != null ? (
                <span className="shrink-0 text-muted-foreground">{icon}</span>
              ) : null}
              <span className="flex-1 truncate font-medium text-muted-foreground text-xs">
                {title}
              </span>
              <Button
                aria-label={`Close ${title}`}
                className="size-6 shrink-0"
                onClick={onClose}
                size="icon"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </div>

            {/* Content — scrollable, fills remaining height */}
            <div className="min-h-0 flex-1 overflow-auto">{children}</div>

            {/* Resize handle — bottom-right corner, uses pointer capture */}
            <div
              aria-hidden
              className="absolute right-0 bottom-0 size-5 cursor-se-resize touch-none"
              onPointerDown={(e) => {
                e.stopPropagation()
                e.currentTarget.setPointerCapture(e.pointerId)
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
                className="absolute right-1 bottom-1 text-muted-foreground/40"
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
