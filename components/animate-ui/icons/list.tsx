"use client"

import { motion, type Variants } from "motion/react"

import {
  getVariants,
  type IconProps,
  IconWrapper,
  useAnimateIconContext,
} from "@/components/animate-ui/icons/icon"

type ListProps = IconProps<keyof typeof animations>

const animations = {
  default: {
    path1: {
      animate: {
        opacity: [0, 1],
        pathLength: [0, 1],
        scale: [1.1, 1],
        transition: {
          duration: 0.4,
          ease: "easeInOut",
        },
      },
      initial: {
        opacity: 1,
        pathLength: 1,
        scale: 1,
      },
    },
    path2: {
      animate: {
        opacity: [0, 1],
        pathLength: [0, 1],
        scale: [1.1, 1],
        transition: {
          delay: 0.2,
          duration: 0.4,
          ease: "easeInOut",
        },
      },
      initial: {
        opacity: 1,
        pathLength: 1,
        scale: 1,
      },
    },
    path3: {
      animate: {
        opacity: [0, 1],
        pathLength: [0, 1],
        scale: [1.1, 1],
        transition: {
          delay: 0.4,
          duration: 0.4,
          ease: "easeInOut",
        },
      },
      initial: {
        opacity: 1,
        pathLength: 1,
        scale: 1,
      },
    },
    path4: {
      animate: {
        opacity: [0, 1],
        pathLength: [0, 1],
        scale: [1.1, 1],
        transition: {
          delay: 0.6,
          duration: 0.4,
          ease: "easeInOut",
        },
      },
      initial: {
        opacity: 1,
        pathLength: 1,
        scale: 1,
      },
    },
    path5: {
      animate: {
        opacity: [0, 1],
        pathLength: [0, 1],
        scale: [1.1, 1],
        transition: {
          delay: 0.8,
          duration: 0.4,
          ease: "easeInOut",
        },
      },
      initial: {
        opacity: 1,
        pathLength: 1,
        scale: 1,
      },
    },
    path6: {
      animate: {
        opacity: [0, 1],
        pathLength: [0, 1],
        scale: [1.1, 1],
        transition: {
          delay: 1,
          duration: 0.4,
          ease: "easeInOut",
        },
      },
      initial: {
        opacity: 1,
        pathLength: 1,
        scale: 1,
      },
    },
    rect: {},
  } satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: ListProps) {
  const { controls } = useAnimateIconContext()
  const variants = getVariants(animations)

  return (
    <motion.svg
      fill="none"
      height={size}
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
        d="M3 5h.01"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path2 !== undefined ? { variants: variants.path2 } : {})}
        d="M8 5h13"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path3 !== undefined ? { variants: variants.path3 } : {})}
        d="M3 12h.01"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path4 !== undefined ? { variants: variants.path4 } : {})}
        d="M8 12h13"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path5 !== undefined ? { variants: variants.path5 } : {})}
        d="M3 19h.01"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path6 !== undefined ? { variants: variants.path6 } : {})}
        d="M8 19h13"
        initial="initial"
      />
    </motion.svg>
  )
}

function List(props: ListProps) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  List,
  List as ListIcon,
  type ListProps,
  type ListProps as ListIconProps,
}
