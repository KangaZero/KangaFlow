"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { AnimatePresence, motion, type Transition } from "motion/react"

import {
  CATALOGUE_COUNT_BY_RARITY,
  RARITIES,
  type Rarity,
  rarityColorVar,
} from "@/lib/achievements"
import { cn } from "@/lib/utils"
import { useAchievements } from "@/providers/achievements-provider"
import { useLocale } from "@/providers/locale-provider"

const SPRING: Transition = { damping: 22, stiffness: 420, type: "spring" }

/**
 * Per-rarity collection counters ("Rare 1/3") that double as the rarity filter:
 * skewed slab chips with a shadow in the rarity colour (achievements-top.css).
 * Pressing lifts the chip and spins its gem (CSS); the unlocked count rolls
 * when it changes (Motion).
 */
export function AchievementRarityChips({
  selected,
  onToggle,
  className,
}: {
  selected: readonly Rarity[]
  onToggle: (rarity: Rarity) => void
  className?: string
}) {
  // countByRarity = UNLOCKED per rarity; the catalogue gives the totals.
  const { countByRarity } = useAchievements()
  const { translate } = useLocale()

  return (
    <fieldset className={cn("at-chips", className)}>
      <legend className="sr-only">
        {translate("achievements.filter.label")}
      </legend>
      {RARITIES.map((rarity, index) => {
        const unlocked = countByRarity[rarity]
        const total = CATALOGUE_COUNT_BY_RARITY[rarity]

        return (
          <button
            aria-pressed={selected.includes(rarity)}
            className="at-chip"
            data-complete={total > 0 && unlocked === total ? "" : undefined}
            key={rarity}
            onClick={() => onToggle(rarity)}
            style={{ "--k": index, "--r": rarityColorVar(rarity) }}
            type="button"
          >
            <span aria-hidden="true" className="at-chip-gem" />
            <span>{translate(`achievements.rarities.${rarity}`)}</span>
            <span className="at-chip-count">
              <span className="relative inline-flex overflow-hidden">
                <AnimatePresence initial={false} mode="popLayout">
                  <motion.span
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    initial={{ opacity: 0, y: 10 }}
                    key={unlocked}
                    transition={SPRING}
                  >
                    {unlocked}
                  </motion.span>
                </AnimatePresence>
              </span>
              {`/${total}`}
            </span>
          </button>
        )
      })}
    </fieldset>
  )
}
