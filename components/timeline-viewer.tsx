"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { ArrowLeft, ArrowRight, X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import Image from "next/image"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useState } from "react"

import { TimelineLinks } from "@/components/timeline-links"
import {
  PORTFOLIOS,
  pad2,
  shotLayoutId,
} from "@/components/timeline-portfolios"
import { stepIndex } from "@/lib/timeline"
import { Z_LAYERS } from "@/lib/z-order"
import { useLocale } from "@/providers/locale-provider"

const CONTROL =
  "border-border bg-card/85 text-foreground hover:border-tooltip-shadow focus-visible:border-tooltip-shadow absolute z-10 grid size-10 cursor-pointer place-items-center rounded-full border outline-none transition-[border-color,scale] hover:scale-105 disabled:invisible"

/**
 * Fullscreen screenshot viewer. The image shares a Motion `layoutId` with the
 * thumbnail it opened from, so it morphs (position, size, radius) between the
 * two. Radix Dialog supplies the modal semantics: focus trap + return, Esc,
 * aria-modal, scroll lock. ←/→ step through portfolios with a slide; once you
 * step away the layoutId is dropped, so closing on another entry fades instead
 * of flying into the wrong thumbnail.
 */
export function TimelineViewer({
  originIndex,
  onClose,
  onReturnFocus,
  reducedMotion,
}: {
  /** Entry the viewer opened from; `null` = closed. */
  originIndex: number | null
  onClose: () => void
  /** Focus the thumbnail of `index` once the dialog has closed. */
  onReturnFocus: (index: number) => void
  reducedMotion: boolean
}) {
  const open = originIndex !== null
  return (
    <DialogPrimitive.Root
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      open={open}
    >
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount key="timeline-viewer">
            <ViewerBody
              onClose={onClose}
              onReturnFocus={onReturnFocus}
              originIndex={originIndex}
              reducedMotion={reducedMotion}
            />
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  )
}

function ViewerBody({
  originIndex,
  onClose,
  onReturnFocus,
  reducedMotion,
}: {
  originIndex: number
  onClose: () => void
  onReturnFocus: (index: number) => void
  reducedMotion: boolean
}) {
  const { translate } = useLocale()
  const [active, setActive] = useState(originIndex)
  const [direction, setDirection] = useState<-1 | 1>(1)
  const portfolio = PORTFOLIOS[active]
  if (portfolio == null) return null
  const morph = !reducedMotion && active === originIndex

  const step = (delta: -1 | 1) => {
    const next = stepIndex(active, delta, PORTFOLIOS.length)
    if (next === null) return
    setDirection(delta)
    setActive(next)
  }

  return (
    <>
      <DialogPrimitive.Overlay asChild forceMount>
        <motion.div
          animate={{ opacity: 1 }}
          className="bg-background/70 fixed inset-0 backdrop-blur-md backdrop-saturate-[.8]"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          style={{ zIndex: Z_LAYERS.dialog }}
          transition={{ duration: reducedMotion ? 0.15 : 0.26 }}
        />
      </DialogPrimitive.Overlay>
      <DialogPrimitive.Content
        asChild
        forceMount
        // Radix would restore focus to whatever was focused before opening
        // (often nothing for a mouse click): send it to the thumbnail of the
        // entry being viewed instead, which may differ after ←/→.
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onReturnFocus(active)
        }}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault()
            step(-1)
          } else if (event.key === "ArrowRight") {
            event.preventDefault()
            step(1)
          }
        }}
      >
        <motion.div
          className="timeline-viewer fixed inset-0 grid place-items-center px-[4vw] py-[4vh] outline-none"
          // The content covers the screen, so Radix never sees an "outside"
          // click: treat a click on the empty area as the backdrop.
          onClick={(event) => {
            if (event.target === event.currentTarget) onClose()
          }}
          style={{ zIndex: Z_LAYERS.dialog }}
        >
          <DialogPrimitive.Close
            aria-label={translate("timeline.viewer.close")}
            className={`${CONTROL} top-[2vh] right-[2vw]`}
          >
            <X aria-hidden className="size-4" />
          </DialogPrimitive.Close>
          <button
            aria-label={translate("timeline.viewer.previous")}
            className={`${CONTROL} bottom-[2vh] left-[2vw] md:top-1/2 md:bottom-auto md:-translate-y-1/2`}
            disabled={active === 0}
            onClick={() => step(-1)}
            type="button"
          >
            <ArrowLeft aria-hidden className="size-4" />
          </button>
          <button
            aria-label={translate("timeline.viewer.next")}
            className={`${CONTROL} right-[2vw] bottom-[2vh] md:top-1/2 md:bottom-auto md:-translate-y-1/2`}
            disabled={active === PORTFOLIOS.length - 1}
            onClick={() => step(1)}
            type="button"
          >
            <ArrowRight aria-hidden className="size-4" />
          </button>

          <div className="grid w-full max-w-[1180px] items-center gap-6 md:grid-cols-[minmax(0,1fr)_300px]">
            <motion.div
              className="relative aspect-[16/10] w-full max-w-[calc((92vh-20px)*1.6)] justify-self-center overflow-hidden shadow-2xl"
              // Morph from the thumbnail via shared layout, or just fade (after
              // stepping away / reduced motion). Spread so no prop is passed as
              // an explicit `undefined` (exactOptionalPropertyTypes).
              {...(morph
                ? { layoutId: shotLayoutId(portfolio.slug) }
                : {
                    animate: { opacity: 1 },
                    exit: { opacity: 0 },
                    initial: { opacity: 0 },
                  })}
              style={{ borderRadius: 14 }}
              transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            >
              <AnimatePresence
                custom={direction}
                initial={false}
                mode="popLayout"
              >
                <motion.div
                  animate={{ filter: "grayscale(0)", opacity: 1, x: 0 }}
                  className="absolute inset-0"
                  exit={{ opacity: 0, x: reducedMotion ? 0 : -direction * 40 }}
                  initial={{
                    filter: morph ? "grayscale(0.6)" : "grayscale(0)",
                    opacity: morph ? 1 : 0,
                    x: reducedMotion || morph ? 0 : direction * 40,
                  }}
                  key={portfolio.slug}
                  transition={{ duration: 0.24 }}
                >
                  <Image
                    alt={portfolio.name}
                    className="object-cover object-top"
                    fill
                    sizes="(min-width: 768px) 70vw, 92vw"
                    src={portfolio.image}
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>

            <motion.div
              animate={{ opacity: 1, x: 0 }}
              className="text-tooltip-foreground relative py-4 pr-6 pl-[34px]"
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              initial={{ opacity: 0, x: reducedMotion ? 0 : 18 }}
              key={`info-${portfolio.slug}`}
              transition={{ delay: reducedMotion ? 0 : 0.12, duration: 0.24 }}
            >
              <span aria-hidden className="absolute inset-0">
                <span className="timeline-plate__shard" />
                <span className="timeline-plate__body" />
              </span>
              <div className="relative">
                <div className="text-[11px] font-bold tracking-[0.2em] [color:color-mix(in_oklch,var(--tooltip-shadow)_55%,var(--tooltip-foreground))]">
                  {`${pad2(active + 1)} / ${pad2(PORTFOLIOS.length)} · `}
                  <time dateTime={portfolio.year}>{portfolio.year}</time>
                </div>
                <DialogPrimitive.Title className="font-heading mt-2 mb-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-3xl leading-none font-extrabold tracking-tight">
                  {portfolio.name}
                  {portfolio.current ? (
                    <span className="timeline-now rounded-full px-2 py-1 text-[11px] leading-none font-bold tracking-[0.14em] uppercase">
                      {translate("timeline.current")}
                    </span>
                  ) : null}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mb-4 text-sm leading-relaxed [color:color-mix(in_oklch,var(--tooltip-foreground)_80%,transparent)]">
                  {translate(`timeline.entries.${portfolio.slug}`)}
                </DialogPrimitive.Description>
                <TimelineLinks portfolio={portfolio} />
              </div>
            </motion.div>
          </div>
        </motion.div>
      </DialogPrimitive.Content>
    </>
  )
}
