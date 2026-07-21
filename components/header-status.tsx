"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useEffect, useMemo, useRef, useState } from "react"

import { person } from "@/lib/person"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

const HOLD_MS = 8000
const SCRAMBLE_MS = 1000

// rAF reimplementation of the portfolio's GSAP ScrambleText (this project uses
// Motion / no GSAP). Reveals `target` left-to-right over SCRAMBLE_MS; each
// not-yet-revealed slot shows a random character drawn from the target itself,
// so English scrambles with latin glyphs and Japanese with kana/kanji. Then it
// holds for HOLD_MS and advances to the next line.
function useScrambleCycle(texts: readonly string[]): string {
  const [display, setDisplay] = useState(texts[0] ?? "")
  const rafRef = useRef<number | null>(null)
  const timeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (texts.length === 0) {
      return
    }

    let index = 0
    setDisplay(texts[0] ?? "")

    const scrambleTo = (target: string) => {
      const pool = [...new Set(target.replace(/\s/g, "").split(""))]
      const start = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - start) / SCRAMBLE_MS, 1)
        const revealed = Math.floor(progress * target.length)
        let out = ""
        for (let i = 0; i < target.length; i++) {
          const ch = target[i] ?? ""
          out +=
            i < revealed || ch === " "
              ? ch
              : (pool[Math.floor(Math.random() * pool.length)] ?? ch)
        }
        setDisplay(out)
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setDisplay(target)
          timeoutRef.current = window.setTimeout(advance, HOLD_MS)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    const advance = () => {
      index = (index + 1) % texts.length
      scrambleTo(texts[index] ?? "")
    }

    timeoutRef.current = window.setTimeout(advance, HOLD_MS)

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
      }
      if (timeoutRef.current != null) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [texts])

  return display
}

export function HeaderStatus({ className }: { className?: string }) {
  const { translate } = useLocale()

  // Same three lines as the HeaderDate hover card (single i18n source).
  const texts = useMemo(
    () => [
      `${translate("headerCard.basedIn")} ${person.location}`,
      translate("headerCard.workplace"),
      translate("headerCard.status"),
    ],
    [translate]
  )

  const display = useScrambleCycle(texts)

  return (
    <span
      aria-live="polite"
      className={cn(
        "min-w-[15ch] text-right font-[family-name:var(--font-heading-ja)] text-muted-foreground text-sm tabular-nums",
        className
      )}
    >
      {display}
    </span>
  )
}
