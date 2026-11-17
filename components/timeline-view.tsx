"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/timeline.css"

import {
  motion,
  useInView,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
} from "motion/react"
import { useEffect, useRef, useState } from "react"

import {
  ScrollProgress,
  ScrollProgressProvider,
} from "@/components/animate-ui/primitives/animate/scroll-progress"
import { LocaleTransition } from "@/components/locale-transition"
import { TimelineLinks } from "@/components/timeline-links"
import {
  PORTFOLIOS,
  type Portfolio,
  pad2,
  shotLayoutId,
} from "@/components/timeline-portfolios"
import { TimelineViewer } from "@/components/timeline-viewer"
import { ProgressiveImage } from "@/components/ui/progressive-image"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { passedCount } from "@/lib/timeline"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

const REVEAL = {
  initial: { opacity: 0, y: 24 },
  transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] as const },
  viewport: { amount: 0.3, once: true },
  whileInView: { opacity: 1, y: 0 },
}

/*
 * Timeline = editorial calm at rest (huge outlined years, heavy headlines,
 * greyscale screenshots, sticky year rail) + the rebel plate as the moment:
 * a scroll-drawn spine with diamond markers, and the plate + accent shard +
 * bolt tip wiping in behind an entry on hover / keyboard focus (always on for
 * the current site). Screenshots open a fullscreen viewer via a shared-layout
 * morph (components/timeline-viewer).
 */
export function TimelineView() {
  const { translate } = useLocale()
  const { animationPref } = useGlobalStates()
  const reducedMotion = isReducedMotion(animationPref, useReducedMotion())
  const listRef = useRef<HTMLOListElement>(null)
  const startsRef = useRef<number[]>([])
  const [passed, setPassed] = useState(0)
  const [active, setActive] = useState(0)
  const [viewerIndex, setViewerIndex] = useState<number | null>(null)
  const thumbnailsRef = useRef<(HTMLButtonElement | null)[]>([])

  // Spine fill: list scroll progress, measured against a line 60% down the
  // viewport so an entry "arrives" a little before it reaches the middle.
  const { scrollYProgress } = useScroll({
    offset: ["start 60%", "end 60%"],
    target: listRef,
  })

  // Each entry's top as a fraction of the list height → markers light up when
  // the drawn spine reaches them.
  useEffect(() => {
    const list = listRef.current
    if (!list) return
    const measure = () => {
      const height = list.offsetHeight || 1
      startsRef.current = Array.from(list.children, (child) =>
        child instanceof HTMLElement ? child.offsetTop / height : 1
      )
      setPassed(passedCount(startsRef.current, scrollYProgress.get()))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(list)
    return () => observer.disconnect()
  }, [scrollYProgress])

  useMotionValueEvent(scrollYProgress, "change", (progress) => {
    const next = passedCount(startsRef.current, progress)
    setPassed((current) => (current === next ? current : next))
  })

  return (
    <main className="min-h-svh w-full pb-28 sm:pb-0">
      {/* Reading-progress bar: fills as you scroll the page. */}
      <ScrollProgressProvider global>
        <ScrollProgress
          className="bg-primary fixed inset-x-0 top-0 z-50 h-1 origin-left"
          mode="scaleX"
        />
      </ScrollProgressProvider>

      <div className="mx-auto max-w-6xl px-6 pt-16 pb-20 md:px-10">
        <header className="mb-12">
          <LocaleTransition>
            <h1 className="font-heading text-5xl leading-[0.9] font-extrabold tracking-tight sm:text-7xl">
              {translate("timeline.heading")}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-[52ch] text-sm">
              {translate("timeline.subtitle")}
            </p>
          </LocaleTransition>
        </header>

        <div className="grid gap-9 md:grid-cols-[70px_minmax(0,1fr)]">
          <nav
            aria-label={translate("timeline.heading")}
            className="sticky top-24 hidden self-start md:grid md:gap-1"
          >
            {PORTFOLIOS.map((portfolio, index) => (
              <a
                aria-current={index === active ? "true" : undefined}
                className="text-muted-foreground aria-[current=true]:text-foreground grid grid-cols-[14px_1fr] items-center gap-2 py-1.5 font-mono text-[11px] font-bold transition-colors"
                href={`#timeline-${portfolio.slug}`}
                key={portfolio.slug}
              >
                <i
                  aria-hidden
                  className={
                    index === active
                      ? "bg-tooltip-shadow h-0.5 w-3.5 transition-all"
                      : "bg-border h-0.5 w-2 transition-all"
                  }
                />
                {portfolio.year}
              </a>
            ))}
          </nav>

          <ol className="relative pl-[30px] md:pl-10" ref={listRef}>
            <span
              aria-hidden
              className="bg-border absolute top-0 bottom-0 left-[9px] w-0.5"
            >
              <motion.span
                className="bg-tooltip-shadow absolute inset-0 origin-top"
                style={{ scaleY: reducedMotion ? 1 : scrollYProgress }}
              />
            </span>
            {PORTFOLIOS.map((portfolio, index) => (
              <TimelineEntry
                active={index === active}
                index={index}
                isOpen={viewerIndex === index}
                key={portfolio.slug}
                onActive={setActive}
                onOpen={setViewerIndex}
                passed={reducedMotion || index < passed}
                portfolio={portfolio}
                reducedMotion={reducedMotion}
                thumbnailRef={(button) => {
                  thumbnailsRef.current[index] = button
                }}
              />
            ))}
          </ol>
        </div>
      </div>

      <TimelineViewer
        onClose={() => setViewerIndex(null)}
        onReturnFocus={(index) => thumbnailsRef.current[index]?.focus()}
        originIndex={viewerIndex}
        reducedMotion={reducedMotion}
      />
    </main>
  )
}

function TimelineEntry({
  portfolio,
  index,
  active,
  passed,
  isOpen,
  reducedMotion,
  onActive,
  onOpen,
  thumbnailRef,
}: {
  portfolio: Portfolio
  index: number
  active: boolean
  passed: boolean
  /** This entry's screenshot is currently shown in the viewer. */
  isOpen: boolean
  reducedMotion: boolean
  onActive: (index: number) => void
  onOpen: (index: number) => void
  thumbnailRef: (button: HTMLButtonElement | null) => void
}) {
  const { translate } = useLocale()
  const ref = useRef<HTMLLIElement>(null)
  // "Active" = the entry crossing the middle band of the viewport.
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" })
  useEffect(() => {
    if (inView) onActive(index)
  }, [inView, index, onActive])

  const reveal = reducedMotion ? {} : REVEAL

  return (
    <li
      className="timeline-entry border-sidebar-border relative grid scroll-mt-20 items-end gap-9 border-t py-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]"
      data-active={active}
      data-current={portfolio.current === true}
      id={`timeline-${portfolio.slug}`}
      ref={ref}
    >
      <span
        aria-hidden
        className="timeline-marker absolute top-[72px] -left-[27px] size-[11px] md:-left-[37px]"
        data-passed={passed}
      />
      <span
        aria-hidden
        className="timeline-numeral font-heading absolute top-1.5 -left-1.5 text-[clamp(110px,17vw,210px)] leading-[0.8] font-black"
      >
        {portfolio.year.slice(2)}
      </span>

      <motion.div className="relative pt-[clamp(96px,14vw,170px)]" {...reveal}>
        <div className="relative -ml-[34px] py-4 pr-6 pl-[34px]">
          <span
            aria-hidden
            className="timeline-plate absolute -top-1 -right-3.5 -bottom-2.5 left-0"
          >
            <span className="timeline-plate__shard" />
            <span className="timeline-plate__body" />
          </span>
          <div className="timeline-copy relative">
            <div
              className="text-tooltip-shadow font-mono text-[11px] font-bold tracking-[0.2em]"
              data-slot="timeline-index"
            >
              {`${pad2(index + 1)} / ${pad2(PORTFOLIOS.length)} · `}
              <time dateTime={portfolio.year}>{portfolio.year}</time>
            </div>
            <h2 className="font-heading mt-2 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[clamp(30px,4vw,46px)] leading-[0.95] font-extrabold tracking-tight">
              {portfolio.name}
              {portfolio.current ? (
                <span className="timeline-now rounded-full px-2 py-1 text-[11px] leading-none font-bold tracking-[0.14em] uppercase">
                  {translate("timeline.current")}
                </span>
              ) : null}
            </h2>
            <LocaleTransition className="mb-4 max-w-[42ch]">
              <p className="text-muted-foreground text-[15px] leading-relaxed">
                {translate(`timeline.entries.${portfolio.slug}`)}
              </p>
            </LocaleTransition>
            <TimelineLinks portfolio={portfolio} />
          </div>
        </div>
      </motion.div>

      <motion.figure className="relative m-0" {...reveal}>
        <button
          aria-haspopup="dialog"
          aria-label={`${translate("timeline.viewer.expand")}: ${portfolio.name}`}
          className="group focus-visible:outline-tooltip-shadow relative block w-full cursor-zoom-in rounded-[4px] focus-visible:outline-3 focus-visible:outline-offset-4"
          onClick={() => onOpen(index)}
          ref={thumbnailRef}
          type="button"
        >
          {isOpen ? (
            // Keep the space (and the focusable button) while the image is
            // "away" in the viewer, so Radix can return focus here on close.
            <div className="aspect-[16/10] w-full" />
          ) : (
            <motion.div
              className="border-border relative aspect-[16/10] overflow-hidden border"
              {...(reducedMotion
                ? {}
                : { layoutId: shotLayoutId(portfolio.slug) })}
              style={{ borderRadius: 4 }}
              transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <ProgressiveImage
                alt={portfolio.name}
                className="object-cover object-top"
                fill
                placeholder={portfolio.placeholder}
                sizes="(min-width: 768px) 55vw, 92vw"
                src={portfolio.image}
                // The hover filter/scale lives on the wrapper so it never
                // shares a `transition` with the reveal's opacity.
                wrapperClassName="timeline-shot"
              />
            </motion.div>
          )}
          <span
            aria-hidden
            className="bg-background/70 text-foreground absolute right-2.5 bottom-2.5 grid size-8 place-items-center rounded-lg opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            ⤢
          </span>
        </button>
      </motion.figure>
    </li>
  )
}
