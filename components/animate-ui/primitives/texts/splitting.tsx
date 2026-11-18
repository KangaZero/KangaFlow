"use client"
// Vendored from animate-ui (registry item `primitives-texts-splitting`),
// adapted to the repo's strict TS: the `text as string` / `ref as` casts are
// replaced by narrowing, and the element type is the span it actually renders.

import {
  type HTMLMotionProps,
  motion,
  type TargetAndTransition,
  type Transition,
  type Variants,
} from "motion/react"
import * as React from "react"

import { type UseIsInViewOptions, useIsInView } from "@/hooks/use-is-in-view"

type DefaultSplittingTextProps = Omit<
  HTMLMotionProps<"span">,
  "children" | "initial" | "animate" | "transition"
> & {
  initial?: TargetAndTransition
  animate?: TargetAndTransition
  transition?: Transition
  stagger?: number
  delay?: number
  disableAnimation?: boolean
} & UseIsInViewOptions

type CharsOrWordsSplittingTextProps = DefaultSplittingTextProps & {
  type?: "chars" | "words"
  text: string
}

type LinesSplittingTextProps = DefaultSplittingTextProps & {
  type?: "lines"
  text: string[]
}

type SplittingTextProps =
  | CharsOrWordsSplittingTextProps
  | LinesSplittingTextProps

const SplittingText: React.FC<SplittingTextProps> = ({
  ref,
  text,
  type = "chars",
  initial = { opacity: 0, x: 150 },
  animate = { opacity: 1, x: 0 },
  transition = { duration: 0.7, ease: "easeOut" },
  stagger,
  delay = 0,
  inView = false,
  inViewMargin = "0px",
  inViewOnce = true,
  disableAnimation = false,
  ...props
}) => {
  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: {
        delayChildren: delay / 1000,
        staggerChildren:
          stagger ?? (type === "chars" ? 0.05 : type === "words" ? 0.2 : 0.3),
      },
    },
  }

  const itemVariants: Variants = {
    hidden: disableAnimation ? animate : initial,
    visible: {
      ...animate,
      transition: disableAnimation ? { duration: 0 } : transition,
    },
  }

  const { ref: localRef, isInView } = useIsInView<HTMLSpanElement>(
    ref ?? null,
    { inView, inViewMargin, inViewOnce }
  )
  const state = isInView ? "visible" : "hidden"

  if (Array.isArray(text)) {
    return (
      <motion.span
        animate={state}
        initial="hidden"
        ref={localRef}
        variants={containerVariants}
        {...props}
      >
        {text.map((line, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: lines are positional; the index is their identity.
          <React.Fragment key={`line-${index}`}>
            <motion.span
              style={{ display: "inline-block" }}
              variants={itemVariants}
            >
              {line}
            </motion.span>
            {index < text.length - 1 ? <br /> : null}
          </React.Fragment>
        ))}
      </motion.span>
    )
  }

  if (type === "words") {
    const tokens = text.match(/\S+\s*/g) ?? []
    return (
      <motion.span
        animate={state}
        initial="hidden"
        ref={localRef}
        variants={containerVariants}
        {...props}
      >
        {tokens.map((token, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: words are positional; the index is their identity.
          <React.Fragment key={`word-${index}`}>
            <motion.span
              style={{ display: "inline-block", whiteSpace: "normal" }}
              variants={itemVariants}
            >
              {token.trim()}
            </motion.span>
            {/\s$/.test(token) ? " " : null}
          </React.Fragment>
        ))}
      </motion.span>
    )
  }

  // Chars: each word is its own nowrap group (so a word never breaks
  // mid-letter), and its delay continues the global character count so the
  // stagger runs across word boundaries without a restart.
  const tokens = text.split(/(\s+)/)
  const perChar = stagger ?? 0.05
  const baseDelaySec = delay / 1000
  let globalIndex = 0

  return (
    <motion.span
      animate={state}
      initial="hidden"
      ref={localRef}
      variants={{ hidden: {}, visible: { transition: {} } }}
      {...props}
    >
      {tokens.map((token, wordIndex) => {
        if (/^\s+$/.test(token)) {
          // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional; the index is their identity.
          return <span key={`space-${wordIndex}`}>{token}</span>
        }
        const chars = Array.from(token)
        const wordDelay = baseDelaySec + perChar * globalIndex
        globalIndex += chars.length

        return (
          <motion.span
            animate={state}
            initial="hidden"
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens are positional; the index is their identity.
            key={`word-${wordIndex}`}
            style={{ display: "inline-block", whiteSpace: "nowrap" }}
            transition={{ delayChildren: wordDelay, staggerChildren: perChar }}
            variants={{}}
          >
            {chars.map((char, charIndex) => (
              <motion.span
                // biome-ignore lint/suspicious/noArrayIndexKey: characters are positional; the index is their identity.
                key={`char-${wordIndex}-${charIndex}`}
                style={{ display: "inline-block", whiteSpace: "pre" }}
                variants={itemVariants}
              >
                {char}
              </motion.span>
            ))}
          </motion.span>
        )
      })}
    </motion.span>
  )
}

export { SplittingText, type SplittingTextProps }
