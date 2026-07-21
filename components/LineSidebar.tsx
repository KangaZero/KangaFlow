"use client"

import {
  type CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react"

import { cn } from "@/lib/utils"
import "./LineSidebar.css"

type Falloff = "linear" | "smooth" | "sharp"

export interface LineSidebarProps {
  items?: string[]
  accentColor?: string
  textColor?: string
  markerColor?: string
  showIndex?: boolean
  showMarker?: boolean
  proximityRadius?: number
  maxShift?: number
  falloff?: Falloff
  markerLength?: number
  markerGap?: number
  tickScale?: number
  scaleTick?: boolean
  itemGap?: number
  fontSize?: number
  smoothing?: number
  defaultActive?: number | null
  /** Controlled active index. When provided, overrides the internal click
   * state — lets a parent drive the highlight (e.g. a scroll-spy). */
  activeIndex?: number | null
  onItemClick?: (index: number, label: string) => void
  className?: string
}

const FALLOFF_CURVES: Record<Falloff, (p: number) => number> = {
  linear: (p) => p,
  sharp: (p) => p * p * p,
  smooth: (p) => p * p * (3 - 2 * p),
}

const DEFAULT_ITEMS = [
  "Overview",
  "Components",
  "Animations",
  "Backgrounds",
  "Showcase",
  "Playground",
  "Templates",
  "Changelog",
  "Community",
  "Resources",
  "Documentation",
  "Support",
]

const LineSidebar = ({
  items = DEFAULT_ITEMS,
  accentColor = "var(--primary)",
  textColor = "var(--muted-foreground)",
  markerColor = "var(--border)",
  showIndex = true,
  showMarker = true,
  proximityRadius = 100,
  maxShift = 30,
  falloff = "smooth",
  markerLength = 60,
  markerGap = 0,
  tickScale = 0.5,
  scaleTick = true,
  itemGap = 20,
  fontSize = 1.1,
  smoothing = 100,
  defaultActive = null,
  activeIndex: controlledActive,
  onItemClick,
  className = "",
}: LineSidebarProps) => {
  const listRef = useRef<HTMLUListElement>(null)
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])
  const targetsRef = useRef<number[]>([])
  const currentRef = useRef<number[]>([])
  const rafRef = useRef<number | null>(null)
  const lastRef = useRef(0)
  const activeRef = useRef<number | null>(defaultActive)
  const smoothingRef = useRef(smoothing)
  const [internalActive, setInternalActive] = useState<number | null>(
    defaultActive
  )

  // Controlled when a parent passes `activeIndex`; otherwise self-managed.
  const activeIndex =
    controlledActive === undefined ? internalActive : controlledActive
  activeRef.current = activeIndex
  smoothingRef.current = smoothing

  // Single rAF loop that eases every item's --effect toward its target using
  // frame-rate independent exponential smoothing, so color, shift and scale
  // all move together without staggering CSS transitions.
  const runFrame = useCallback((now: number) => {
    const dt = Math.min((now - lastRef.current) / 1000, 0.05)
    lastRef.current = now
    const tau = Math.max(smoothingRef.current, 1) / 1000
    const k = 1 - Math.exp(-dt / tau)

    let moving = false
    const items = itemRefs.current
    for (let i = 0; i < items.length; i++) {
      const el = items[i]
      if (!el) {
        continue
      }
      const target = Math.max(
        targetsRef.current[i] || 0,
        activeRef.current === i ? 1 : 0
      )
      const cur = currentRef.current[i] || 0
      const next = cur + (target - cur) * k
      const settled = Math.abs(target - next) < 0.0015
      const value = settled ? target : next
      currentRef.current[i] = value
      el.style.setProperty("--effect", value.toFixed(4))
      if (!settled) {
        moving = true
      }
    }

    rafRef.current = moving ? requestAnimationFrame(runFrame) : null
  }, [])

  const startLoop = useCallback(() => {
    if (rafRef.current != null) {
      return
    }
    lastRef.current = performance.now()
    rafRef.current = requestAnimationFrame(runFrame)
  }, [runFrame])

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLUListElement>) => {
      const list = listRef.current
      if (!list) {
        return
      }
      const rect = list.getBoundingClientRect()
      const pointerY = e.clientY - rect.top
      const ease = FALLOFF_CURVES[falloff] ?? FALLOFF_CURVES.linear
      const items = itemRefs.current
      for (let i = 0; i < items.length; i++) {
        const el = items[i]
        if (!el) {
          continue
        }
        const center = el.offsetTop + el.offsetHeight / 2
        const distance = Math.abs(pointerY - center)
        targetsRef.current[i] = ease(
          Math.max(0, 1 - distance / proximityRadius)
        )
      }
      startLoop()
    },
    [falloff, proximityRadius, startLoop]
  )

  const handlePointerLeave = useCallback(() => {
    targetsRef.current = targetsRef.current.map(() => 0)
    startLoop()
  }, [startLoop])

  const handleClick = useCallback(
    (index: number, label: string) => {
      if (controlledActive === undefined) {
        setInternalActive(index)
      }
      onItemClick?.(index, label)
    },
    [controlledActive, onItemClick]
  )

  // biome-ignore lint/correctness/useExhaustiveDependencies: mirrors upstream — re-run the loop whenever the active item changes.
  useEffect(() => {
    startLoop()
  }, [activeIndex, startLoop])

  useEffect(
    () => () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
      }
    },
    []
  )

  return (
    <nav
      className={cn(
        "line-sidebar",
        showMarker && "line-sidebar--markers",
        scaleTick && "line-sidebar--scale-tick",
        className
      )}
      style={
        {
          "--accent-color": accentColor,
          "--font-size": `${fontSize}rem`,
          "--item-gap": `${itemGap}px`,
          "--marker-color": markerColor,
          "--marker-gap": `${markerGap}px`,
          "--marker-length": `${markerLength}px`,
          "--max-shift": `${maxShift}px`,
          "--smoothing": `${smoothing}ms`,
          "--text-color": textColor,
          "--tick-scale": tickScale,
        } as CSSProperties
      }
    >
      <ul
        className="line-sidebar__list"
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
        ref={listRef}
      >
        {items.map((label, index) => (
          <li
            aria-current={activeIndex === index ? "true" : undefined}
            className="line-sidebar__item"
            key={label}
            onClick={() => handleClick(index, label)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                handleClick(index, label)
              }
            }}
            ref={(el) => {
              itemRefs.current[index] = el
            }}
          >
            {showMarker && (
              <span aria-hidden="true" className="line-sidebar__marker" />
            )}
            <span className="line-sidebar__label">
              {showIndex && (
                <span className="line-sidebar__index">
                  {String(index + 1).padStart(2, "0")}
                </span>
              )}
              <span className="line-sidebar__text">{label}</span>
            </span>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export default LineSidebar
