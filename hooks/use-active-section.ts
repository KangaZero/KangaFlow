"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useEffect, useState } from "react"
import { ACTIVE_SECTION_LINE, pickActiveSection } from "@/lib/active-section"

/**
 * Scroll-spy: the index of the section currently being read, out of `ids`.
 *
 * The sections are looked up by id on every measure instead of once on mount,
 * so it does not matter when they appear. (The About sections mount only after
 * the hello intro; an observer wired on mount found none and never tracked.)
 * Measures are rAF-throttled and run on scroll, resize, and any change to the
 * page's size (sections mounting or revealing), which a ResizeObserver on
 * <body> reports. Pass a stable (module-level) `ids` array.
 */
export function useActiveSection(ids: readonly string[]): number {
  const [active, setActive] = useState(0)

  useEffect(() => {
    let frame = 0
    const measure = () => {
      frame = 0
      const tops = ids.map(
        (id) => document.getElementById(id)?.getBoundingClientRect().top ?? null
      )
      const root = document.documentElement
      // 2px slack: fractional scroll positions never quite reach scrollHeight.
      const atBottom =
        window.scrollY + window.innerHeight >= root.scrollHeight - 2
      setActive(
        pickActiveSection(
          tops,
          window.innerHeight * ACTIVE_SECTION_LINE,
          atBottom
        )
      )
    }
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure)
    }

    schedule()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    const resizeObserver = new ResizeObserver(schedule)
    resizeObserver.observe(document.body)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      resizeObserver.disconnect()
    }
  }, [ids])

  return active
}
