"use client"

import { motion, type Variants } from "motion/react"

import {
  getVariants,
  type IconProps,
  IconWrapper,
  useAnimateIconContext,
} from "@/components/animate-ui/icons/icon"

type Volume2Props = IconProps<keyof typeof animations>

const animations = {
  default: (() => {
    const animation: Record<string, Variants> = {
      path3: {},
    }

    for (let i = 1; i <= 2; i++) {
      animation[`path${i}`] = {
        animate: {
          opacity: 0,
          scale: 0,
          transition: {
            opacity: {
              delay: 0.2 * (i - 1),
              duration: 0.2,
              ease: "easeInOut",
              repeat: 1,
              repeatDelay: 0.2,
              repeatType: "reverse",
            },
            scale: {
              delay: 0.2 * (i - 1),
              duration: 0.2,
              ease: "easeInOut",
              repeat: 1,
              repeatDelay: 0.2,
              repeatType: "reverse",
            },
          },
        },
        initial: { opacity: 1, scale: 1 },
      }
    }

    return animation
  })() satisfies Record<string, Variants>,
} as const

function IconComponent({ size, ...props }: Volume2Props) {
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
        d="M16 9a5 5 0 0 1 0 6"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path2 !== undefined ? { variants: variants.path2 } : {})}
        d="M19.364 18.364a9 9 0 0 0 0-12.728"
        initial="initial"
      />
      <motion.path
        {...(controls !== undefined ? { animate: controls } : {})}
        {...(variants.path3 !== undefined ? { variants: variants.path3 } : {})}
        d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"
        initial="initial"
      />
    </motion.svg>
  )
}

function Volume2(props: Volume2Props) {
  return <IconWrapper icon={IconComponent} {...props} />
}

export {
  animations,
  Volume2,
  Volume2 as Volume2Icon,
  type Volume2Props,
  type Volume2Props as Volume2IconProps,
}
