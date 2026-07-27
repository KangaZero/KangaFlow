"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// Adapted from React Bits "Carousel" (ts-tailwind variant). Rewritten for this
// codebase: `any` props replaced with `MotionValue<number>` / `Transition`,
// inline hex swapped for semantic theme tokens (works in light/dark/terminal),
// the `round` variant dropped, and dot aria-labels sourced from item titles.
// https://reactbits.dev/components/carousel

import {
  type MotionValue,
  motion,
  type PanInfo,
  type Transition,
  useMotionValue,
  useTransform,
} from "motion/react"
import { useEffect, useMemo, useRef, useState } from "react"
import { cn } from "@/lib/utils"

export interface CarouselItem {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  // Optional slot rendered under the description (e.g. project links).
  footer?: React.ReactNode
}

export interface CarouselProps {
  items: CarouselItem[]
  baseWidth?: number
  autoplay?: boolean
  autoplayDelay?: number
  pauseOnHover?: boolean
  loop?: boolean
}

const GAP = 16
const DRAG_BUFFER = 0
const VELOCITY_THRESHOLD = 500
const CONTAINER_PADDING = 16
const SPRING: Transition = { damping: 30, stiffness: 300, type: "spring" }

// A single card. `x` is the shared track motion value; each card reads it to
// rotate itself in 3D as the track scrolls past (the React Bits "coverflow").
function CarouselCard({
  item,
  index,
  itemWidth,
  trackItemOffset,
  x,
  transition,
}: {
  item: CarouselItem
  index: number
  itemWidth: number
  trackItemOffset: number
  x: MotionValue<number>
  transition: Transition
}) {
  const range = [
    -(index + 1) * trackItemOffset,
    -index * trackItemOffset,
    -(index - 1) * trackItemOffset,
  ]
  const rotateY = useTransform(x, range, [90, 0, -90], { clamp: false })

  return (
    <motion.div
      className="relative flex shrink-0 cursor-grab flex-col items-start justify-between overflow-hidden rounded-xl border border-border bg-card text-card-foreground active:cursor-grabbing"
      style={{ rotateY, width: itemWidth }}
      transition={transition}
    >
      <div className="p-5 pb-0">
        <span className="flex size-9 items-center justify-center rounded-full bg-muted text-foreground">
          {item.icon}
        </span>
      </div>
      <div className="flex flex-col gap-3 p-5">
        <div>
          <div className="mb-1 font-heading font-semibold text-lg">
            {item.title}
          </div>
          <p className="text-muted-foreground text-sm">{item.description}</p>
        </div>
        {item.footer}
      </div>
    </motion.div>
  )
}

// A draggable, optionally-looping card carousel. Fixed pixel `baseWidth` (a
// React Bits constraint); center it in flow with a wrapper.
export function Carousel({
  items,
  baseWidth = 300,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
}: CarouselProps) {
  const itemWidth = baseWidth - CONTAINER_PADDING * 2
  const trackItemOffset = itemWidth + GAP

  // For looping, clone the last item to the front and the first to the back so
  // the track can wrap seamlessly (guarded for noUncheckedIndexedAccess). Each
  // entry carries a stable `key` since the clones repeat real item ids.
  const itemsForRender = useMemo<{ item: CarouselItem; key: string }[]>(() => {
    const base = items.map((item) => ({ item, key: `item-${item.id}` }))
    if (!loop || items.length === 0) return base
    const first = base[0]
    const last = base.at(-1)
    if (!(first && last)) return base
    return [
      { item: last.item, key: "clone-head" },
      ...base,
      { item: first.item, key: "clone-tail" },
    ]
  }, [items, loop])

  const [position, setPosition] = useState(loop ? 1 : 0)
  const [isHovered, setIsHovered] = useState(false)
  const [isJumping, setIsJumping] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const x = useMotionValue(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!(pauseOnHover && containerRef.current)) return
    const container = containerRef.current
    const onEnter = () => setIsHovered(true)
    const onLeave = () => setIsHovered(false)
    container.addEventListener("mouseenter", onEnter)
    container.addEventListener("mouseleave", onLeave)
    return () => {
      container.removeEventListener("mouseenter", onEnter)
      container.removeEventListener("mouseleave", onLeave)
    }
  }, [pauseOnHover])

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return
    if (pauseOnHover && isHovered) return
    const timer = setInterval(() => {
      setPosition((prev) => Math.min(prev + 1, itemsForRender.length - 1))
    }, autoplayDelay)
    return () => clearInterval(timer)
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length])

  // Re-seat the track whenever the item set changes.
  useEffect(() => {
    const start = loop ? 1 : 0
    setPosition(start)
    x.set(-start * trackItemOffset)
  }, [loop, trackItemOffset, x])

  const transition: Transition = isJumping ? { duration: 0 } : SPRING

  // On reaching a clone, snap instantly (duration 0) to the real item.
  const handleAnimationComplete = () => {
    if (!loop || itemsForRender.length <= 1) {
      setIsAnimating(false)
      return
    }
    const lastClone = itemsForRender.length - 1
    if (position === lastClone) {
      setIsJumping(true)
      setPosition(1)
      x.set(-trackItemOffset)
      requestAnimationFrame(() => {
        setIsJumping(false)
        setIsAnimating(false)
      })
      return
    }
    if (position === 0) {
      setIsJumping(true)
      setPosition(items.length)
      x.set(-items.length * trackItemOffset)
      requestAnimationFrame(() => {
        setIsJumping(false)
        setIsAnimating(false)
      })
      return
    }
    setIsAnimating(false)
  }

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const { offset, velocity } = info
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0
    if (direction === 0) return
    setPosition((prev) =>
      Math.max(0, Math.min(prev + direction, itemsForRender.length - 1))
    )
  }

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(itemsForRender.length - 1, 0),
          right: 0,
        },
      }

  const activeIndex =
    items.length === 0
      ? 0
      : loop
        ? (position - 1 + items.length) % items.length
        : Math.min(position, items.length - 1)

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-border p-4"
      ref={containerRef}
      style={{ width: `${baseWidth}px` }}
    >
      <motion.div
        animate={{ x: -(position * trackItemOffset) }}
        className="flex"
        drag={isAnimating ? false : "x"}
        onAnimationComplete={handleAnimationComplete}
        onAnimationStart={() => setIsAnimating(true)}
        onDragEnd={handleDragEnd}
        style={{
          gap: `${GAP}px`,
          perspective: 1000,
          perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
          width: itemWidth,
          x,
        }}
        transition={transition}
        {...dragProps}
      >
        {itemsForRender.map(({ item, key }, index) => (
          <CarouselCard
            index={index}
            item={item}
            itemWidth={itemWidth}
            key={key}
            trackItemOffset={trackItemOffset}
            transition={transition}
            x={x}
          />
        ))}
      </motion.div>
      <div className="mt-4 flex justify-center gap-2">
        {items.map((item, index) => (
          <motion.button
            animate={{ scale: activeIndex === index ? 1.2 : 1 }}
            aria-current={activeIndex === index}
            aria-label={item.title}
            className={cn(
              "size-2 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
              activeIndex === index ? "bg-primary" : "bg-muted-foreground/40"
            )}
            key={item.id}
            onClick={() => setPosition(loop ? index + 1 : index)}
            transition={{ duration: 0.15 }}
            type="button"
          />
        ))}
      </div>
    </div>
  )
}
