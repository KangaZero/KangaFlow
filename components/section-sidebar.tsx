"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useEffect, useState } from "react"

import { ABOUT_SECTIONS } from "@/components/about-section"
import LineSidebar from "@/components/LineSidebar"
import { useLocale } from "@/providers/locale-provider"

// Right-rail table of contents: highlights whichever About section is in view
// (scroll-spy via IntersectionObserver) and scrolls to a section on click.
export function SectionSidebar() {
  const { translate } = useLocale()
  const [active, setActive] = useState(0)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue
          }
          const index = ABOUT_SECTIONS.findIndex(
            (section) => section.id === entry.target.id
          )
          if (index !== -1) {
            setActive(index)
          }
        }
      },
      // A thin band ~40% down the viewport acts as the "current section" line.
      { rootMargin: "-40% 0px -55% 0px" }
    )

    for (const section of ABOUT_SECTIONS) {
      const el = document.getElementById(section.id)
      if (el) {
        observer.observe(el)
      }
    }
    return () => observer.disconnect()
  }, [])

  const items = ABOUT_SECTIONS.map((section) => translate(section.labelKey))

  const scrollToSection = (index: number) => {
    const section = ABOUT_SECTIONS[index]
    if (section) {
      document
        .getElementById(section.id)
        ?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  return (
    <LineSidebar
      activeIndex={active}
      defaultActive={0}
      falloff="smooth"
      fontSize={0.85}
      itemGap={20}
      items={items}
      markerGap={0}
      markerLength={32}
      maxShift={30}
      onItemClick={scrollToSection}
      proximityRadius={80}
      scaleTick
      showIndex
      showMarker
      smoothing={100}
      tickScale={0.5}
    />
  )
}
