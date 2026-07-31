"use client"

import type { Variants } from "motion/react"
import { motion, useAnimation } from "motion/react"
import {
  type HTMLAttributes,
  type RefObject,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react"

import { cn } from "@/lib/utils"

export interface AlarmClockIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

interface AlarmClockIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
}

const PATH_VARIANTS: Variants = {
  animate: {
    transition: {
      x: {
        duration: 0.3,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      },
      y: {
        damping: 25,
        duration: 0.2,
        stiffness: 200,
        type: "spring",
      },
    },
    x: [-1, 1, -1, 1, -1, 0],
    y: -1.5,
  },
  normal: {
    transition: {
      damping: 25,
      duration: 0.2,
      stiffness: 200,
      type: "spring",
    },
    x: 0,
    y: 0,
  },
}

const SECONDARY_PATH_VARIANTS: Variants = {
  animate: {
    transition: {
      x: {
        duration: 0.3,
        ease: "linear",
        repeat: Number.POSITIVE_INFINITY,
      },
      y: {
        damping: 25,
        duration: 0.2,
        stiffness: 200,
        type: "spring",
      },
    },
    x: [-2, 2, -2, 2, -2, 0],
    y: -2.5,
  },
  normal: {
    transition: {
      damping: 25,
      duration: 0.2,
      stiffness: 200,
      type: "spring",
    },
    x: 0,
    y: 0,
  },
}

const AlarmClockIcon = ({
  onMouseEnter,
  onMouseLeave,
  className,
  size = 28,
  ref,
  ...props
}: AlarmClockIconProps & { ref?: RefObject<AlarmClockIconHandle | null> }) => {
  const controls = useAnimation()
  const isControlledRef = useRef(false)

  useImperativeHandle(ref, () => {
    isControlledRef.current = true

    return {
      startAnimation: () => controls.start("animate"),
      stopAnimation: () => controls.start("normal"),
    }
  })

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseEnter?.(e)
      } else {
        controls.start("animate")
      }
    },
    [controls, onMouseEnter]
  )

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (isControlledRef.current) {
        onMouseLeave?.(e)
      } else {
        controls.start("normal")
      }
    },
    [controls, onMouseLeave]
  )

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: lucide-animated hover-trigger wrapper — decorative icon used inside labelled buttons
    <div
      aria-hidden={true}
      className={cn(className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      {/* biome-ignore lint/a11y/noSvgWithoutTitle: decorative svg inside aria-hidden wrapper */}
      <svg
        fill="none"
        height={size}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        style={{ overflow: "visible" }}
        viewBox="0 0 24 24"
        width={size}
        xmlns="http://www.w3.org/2000/svg"
      >
        <motion.path
          animate={controls}
          d="M18 20.5L19.5 22"
          initial="normal"
          variants={PATH_VARIANTS}
        />
        <motion.path
          animate={controls}
          d="M6 20.5L4.5 22"
          initial="normal"
          variants={PATH_VARIANTS}
        />
        <motion.path
          animate={controls}
          d="M21 13C21 17.968 16.968 22 12 22C7.032 22 3 17.968 3 13C3 8.032 7.032 4 12 4C16.968 4 21 8.032 21 13Z"
          initial="normal"
          variants={PATH_VARIANTS}
        />
        <motion.path
          animate={controls}
          d="M15.339 15.862L12.549 14.197C12.063 13.909 11.667 13.216 11.667 12.649V8.95898"
          initial="normal"
          variants={PATH_VARIANTS}
        />
        <motion.path
          animate={controls}
          d="M18 2L21.747 5.31064"
          initial="normal"
          variants={SECONDARY_PATH_VARIANTS}
        />
        <motion.path
          animate={controls}
          d="M6 2L2.25304 5.31064"
          initial="normal"
          variants={SECONDARY_PATH_VARIANTS}
        />
      </svg>
    </div>
  )
}

AlarmClockIcon.displayName = "AlarmClockIcon"

export { AlarmClockIcon }
