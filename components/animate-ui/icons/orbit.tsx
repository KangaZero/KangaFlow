"use client"

import { motion, type Variants } from "motion/react"

import {
  getVariants,
  type IconProps,
  IconWrapper,
  useAnimateIconContext,
} from "@/components/animate-ui/icons/icon"

type OrbitProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    circle1: {},
    circle2: {},
    group: {
      animate: {
        rotate: 360,
        transition: {
          duration: 2,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        },
      },
      initial: { rotate: 0 },
    },
    path1: {},
    path2: {},
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: OrbitProps) {
  const { controls } = useAnimateIconContext()
  const variants = getVariants(animations)

  return (
    <motion.svg
      {...(controls !== undefined ? { animate: controls } : {})}
      {...(variants.group !== undefined ? { variants: variants.group } : {})}
      fill="none"
      height={size}
      initial="initial"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path1 !== undefined ? { variants: variants.path1 } : {})}
        d="M20.341 6.484A10 10 0 0 1 10.266 21.85"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path2 !== undefined ? { variants: variants.path2 } : {})}
        d="M3.659 17.516A10 10 0 0 1 13.74 2.152"
        initial="initial"
      />
      <motion.circle
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.circle1 !== undefined
          ? { variants: variants.circle1 }
          : {})}
        cx="12"
        cy="12"
        initial="initial"
        r="3"
      />
      <motion.circle
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.circle2 !== undefined
          ? { variants: variants.circle2 }
          : {})}
        cx="19"
        cy="5"
        initial="initial"
        r="2"
      />
      <motion.circle
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.circle3 !== undefined
          ? { variants: variants.circle3 }
          : {})}
        cx="5"
        cy="19"
        initial="initial"
        r="2"
      />
    </motion.svg>
  )
}

function Orbit(props: OrbitProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  Orbit,
  Orbit as OrbitIcon,
  type OrbitProps,
  type OrbitProps as OrbitIconProps,
}
