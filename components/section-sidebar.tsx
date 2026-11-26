"use client"

// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/section-sidebar.css"

import { motion, useReducedMotion } from "motion/react"
import type { MouseEvent } from "react"
import { ABOUT_SECTIONS } from "@/components/about-section"
import { LocaleTransition } from "@/components/locale-transition"
import { useActiveSection } from "@/hooks/use-active-section"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// Module-level, so useActiveSection gets the same array on every render.
const SECTION_IDS = ABOUT_SECTIONS.map((section) => section.id)

//TODO consider moving all motion variants to their own lib file
const slideFromLeft = {
  hidden: { opacity: 0, x: -100 },
  show: { opacity: 1, x: 0 },
} as const

// Left-rail table of contents, "B · Ticker rail": in-page links with a gold
// tick each; the section being read (scroll-spy) gets aria-current, a thick
// gold bar and an accent index tag. Clicking scrolls to the section and moves
// focus to it, so keyboard users continue from there.
export function SectionSidebar() {
  const { translate } = useLocale()
  const { animationPref, isHelloEffectAnimationComplete } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const active = useActiveSection(SECTION_IDS)

  if (!isHelloEffectAnimationComplete) return null

  const goToSection = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
    const section = document.getElementById(id)
    if (!section) return
    event.preventDefault()
    section.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "start",
    })
    section.focus({ preventScroll: true })
  }

  return (
    <motion.div
      animate="show"
      initial="hidden"
      transition={{ duration: 0.6, ease: "easeIn" }}
      variants={slideFromLeft}
    >
      <LocaleTransition variant="fade">
        <nav
          aria-label={translate("about.sectionsNav")}
          className="section-rail"
          data-reduced={reduced}
        >
          <ol>
            {ABOUT_SECTIONS.map((section, index) => (
              <li key={section.id}>
                <a
                  aria-current={index === active ? "true" : undefined}
                  href={`#${section.id}`}
                  onClick={(event) => goToSection(event, section.id)}
                >
                  <span className="section-rail__index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {translate(section.labelKey)}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </LocaleTransition>
    </motion.div>
  )
}
