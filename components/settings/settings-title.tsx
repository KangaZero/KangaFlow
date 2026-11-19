"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { type CSSProperties, useEffect, useRef, useState } from "react"

import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { playSfx } from "@/lib/sfx/play"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// The display word stays Latin in every locale so the easter egg is universal;
// the localised title is announced by the dialog's (sr-only) Dialog.Title.
const WORD = "SETTINGS"
// N for Neko: the trigger letter.
const NEKO_INDEX = WORD.indexOf("N")
const PAW_COUNT = 7
const PAW_MS = 800

type Burst = { id: number }

// Paw prints fly out on a fixed ring (deterministic, so render stays pure).
function pawStyle(index: number): CSSProperties {
  const angle = (index / PAW_COUNT) * Math.PI * 2 + 0.3
  const distance = 40 + (index % 3) * 12
  return {
    "--dx": `${Math.cos(angle) * distance}px`,
    "--dy": `${Math.sin(angle) * distance}px`,
    "--r": `${(index % 2 === 0 ? 1 : -1) * (20 + index * 6)}deg`,
  }
}

/**
 * "SETTINGS" with a secret: the N (for Neko) is a real toggle button for the
 * site's neko.
 * Summoned from here, the cat comes out inverted (a white "negative" neko);
 * clicking again sends it away. Hover peeks a pair of cat ears out of the N.
 */
export function SettingsTitle({ reduced }: { reduced: boolean }) {
  const { translate } = useLocale()
  const { onekoEnabled, setOnekoEnabled, setOnekoInverted } = useGlobalStates()
  const [bursts, setBursts] = useState<readonly Burst[]>([])
  const [flips, setFlips] = useState(0)
  const nextId = useRef(0)
  const timers = useRef<number[]>([])

  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) window.clearTimeout(timer)
    }
  }, [])

  function toggleNeko() {
    if (onekoEnabled) {
      setOnekoEnabled(false)
      setOnekoInverted(false)
      playSfx("oneko-dismiss")
    } else {
      setOnekoInverted(true)
      setOnekoEnabled(true)
      playSfx("oneko-summon")
    }
    setFlips((count) => count + 1)
    if (reduced) return
    nextId.current += 1
    const id = nextId.current
    setBursts((current) => [...current, { id }])
    timers.current.push(
      window.setTimeout(() => {
        setBursts((current) => current.filter((burst) => burst.id !== id))
      }, PAW_MS)
    )
  }

  return (
    <div className="pm-title">
      {Array.from(WORD).map((char, index) =>
        index === NEKO_INDEX ? (
          <AnimatedTooltip
            className="pm-neko-tip"
            key="neko-toggle"
            label={translate(
              onekoEnabled ? "settings.nekoDismiss" : "settings.nekoSummon"
            )}
          >
            <button
              aria-label={translate("settings.nekoToggle")}
              aria-pressed={onekoEnabled}
              className="pm-ch pm-ch-neko"
              onClick={toggleNeko}
              style={{
                "--c": index,
                transform: `rotateY(${flips * 360}deg)`,
                transition: reduced
                  ? "none"
                  : "transform 0.6s cubic-bezier(0.3, 1.5, 0.5, 1)",
              }}
              type="button"
            >
              <span aria-hidden="true" className="pm-ears" />
              {char}
              {bursts.map((burst) =>
                Array.from({ length: PAW_COUNT }, (_, paw) => (
                  <span
                    aria-hidden="true"
                    className="pm-paw"
                    // biome-ignore lint/suspicious/noArrayIndexKey: paws are positional within one burst; the burst id makes the key unique.
                    key={`${burst.id}-${paw}`}
                    style={pawStyle(paw)}
                  >
                    🐾
                  </span>
                ))
              )}
            </button>
          </AnimatedTooltip>
        ) : (
          <span
            aria-hidden="true"
            className="pm-ch"
            // biome-ignore lint/suspicious/noArrayIndexKey: letters are positional; the index is their identity.
            key={index}
            style={{ "--c": index }}
          >
            {char}
          </span>
        )
      )}
    </div>
  )
}
