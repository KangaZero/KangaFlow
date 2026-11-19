"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { motion, useReducedMotion } from "motion/react"

import { SplittingText } from "@/components/animate-ui/primitives/texts/splitting"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { navPositionLabel, type PageName, positionLabel } from "@/lib/pages"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// Seconds between characters of the title, and the pause after the last one
// lands before the subtitle starts. The subtitle's delay is derived from the
// title's length, so a 2-character 実績 does not wait as long as "Achievements".
const CHAR_STAGGER = 0.045
const SUBTITLE_PAUSE = 0.35

type PageHeaderProps = {
  title: string
  /** Omitted: no subtitle line (About's Work and Education). */
  subtitle?: string
  className?: string
} & (
  | { page: PageName; section?: never }
  | {
      /** A section inside a page (zero-based index of total): renders an
       *  h2 and plays when scrolled into view instead of on mount. */
      section: { index: number; total: number }
      page?: never
    }
)

/**
 * Shared header for the content pages: a "02 / 04" eyebrow numbered from the
 * nav order, a heavy mono title that splits in character by character, and a
 * light italic serif subtitle that fades up once the title has landed.
 * Both animations are keyed on the locale, so switching language replays them.
 * Page sections (About's projects) reuse it via `section`, so every title on
 * the site shares one design.
 */
export function PageHeader({
  page,
  section,
  title,
  subtitle,
  className,
}: PageHeaderProps) {
  const { locale } = useLocale()
  const { animationPref } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const position = section
    ? positionLabel(section.index, section.total)
    : page
      ? navPositionLabel(page)
      : undefined
  const Heading = section ? "h2" : "h1"
  const subtitleShown = { filter: "blur(0px)", opacity: 1, y: 0 }
  const subtitleDelay = Array.from(title).length * CHAR_STAGGER + SUBTITLE_PAUSE

  return (
    <header className={cn(section ? "mb-2" : "mb-12", className)}>
      {position ? (
        <p
          aria-hidden="true"
          className="text-muted-foreground mb-3 flex items-center gap-2 font-mono text-[11px] tracking-[0.14em]"
        >
          <span className="bg-primary h-0.5 w-4.5" />
          {position}
        </p>
      ) : null}
      <Heading className="font-heading text-5xl leading-[0.9] font-extrabold tracking-tight sm:text-7xl">
        {/* Per-character spans read letter by letter in some screen readers,
            so the accessible name is the plain string and the split is hidden. */}
        <span className="sr-only">{title}</span>
        <SplittingText
          animate={{ filter: "blur(0px)", opacity: 1, y: 0 }}
          aria-hidden="true"
          disableAnimation={reduced}
          initial={{ filter: "blur(6px)", opacity: 0, y: "0.4em" }}
          inView={section !== undefined}
          key={locale}
          stagger={CHAR_STAGGER}
          text={title}
          transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </Heading>
      {subtitle ? (
        <motion.p
          {...(section
            ? { viewport: { once: true }, whileInView: subtitleShown }
            : { animate: subtitleShown })}
          className="text-muted-foreground mt-4 max-w-[46ch] font-serif text-lg leading-snug font-light italic sm:text-xl [&:lang(ja)]:text-base [&:lang(ja)]:not-italic"
          initial={reduced ? false : { filter: "blur(3px)", opacity: 0, y: 4 }}
          key={locale}
          transition={{ delay: subtitleDelay, duration: 0.9, ease: "easeOut" }}
        >
          {subtitle}
        </motion.p>
      ) : null}
    </header>
  )
}
