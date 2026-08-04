"use client"

import { motion, type Variants } from "motion/react"

import {
  getVariants,
  type IconProps,
  IconWrapper,
  useAnimateIconContext,
} from "@/components/animate-ui/icons/icon"

type VolumeOffProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    group: {
      animate: {
        transition: { duration: 0.6, ease: "easeInOut" },
        x: [0, "-7%", "7%", "-7%", "7%", 0],
      },
      initial: {
        x: 0,
      },
    },
    path1: {},
    path2: {},
    path3: {},
    path4: {},
    path5: {},
  } satisfies Record<string, Variants>,
  off: {
    path1: {},
    path2: {},
    path3: {
      animate: {
        opacity: 1,
        pathLength: 1,
        transition: { duration: 0.6, ease: "easeInOut" },
      },
      initial: {
        opacity: 0,
        pathLength: 0,
      },
    },
    path4: {},
    path5: {},
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: VolumeOffProps) {
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
        d="M16 9a5 5 0 0 1 .95 2.293"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path2 !== undefined ? { variants: variants.path2 } : {})}
        d="M19.364 5.636a9 9 0 0 1 1.889 9.96"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path3 !== undefined ? { variants: variants.path3 } : {})}
        d="m2 2 20 20"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path4 !== undefined ? { variants: variants.path4 } : {})}
        d="m7 7-.587.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298V11"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path5 !== undefined ? { variants: variants.path5 } : {})}
        d="M9.828 4.172A.686.686 0 0 1 11 4.657v.686"
        initial="initial"
      />
    </motion.svg>
  )
}

function VolumeOff(props: VolumeOffProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  VolumeOff,
  VolumeOff as VolumeOffIcon,
  type VolumeOffProps,
  type VolumeOffProps as VolumeOffIconProps,
}
