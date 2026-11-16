"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { AnimatePresence, motion, type Transition } from "motion/react"

import {
  CATALOGUE_COUNT_BY_RARITY,
  RARITIES,
  type Rarity,
} from "@/lib/achievements"
import { cn } from "@/lib/utils"
import { useAchievements } from "@/providers/achievements-provider"
import { useLocale } from "@/providers/locale-provider"

const SPRING: Transition = { damping: 22, stiffness: 420, type: "spring" }

const group = {
  hidden: {},
  show: { transition: { delayChildren: 0.15, staggerChildren: 0.05 } },
}
const chip = {
  hidden: { opacity: 0, scale: 0.8, y: 6 },
  show: { opacity: 1, scale: 1, transition: SPRING, y: 0 },
}

/**
 * Per-rarity collection counters ("Rare 1/3") that double as the rarity filter.
 * Toggling springs a tinted fill in and spins the gem; the unlocked count rolls
 * when it changes.
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
    <motion.fieldset
      animate="show"
      aria-label={translate("achievements.filter.label")}
      className={cn("flex flex-wrap gap-2", className)}
      initial="hidden"
      variants={group}
    >
      {RARITIES.map((rarity) => {
        const pressed = selected.includes(rarity)
        const unlocked = countByRarity[rarity]
        const total = CATALOGUE_COUNT_BY_RARITY[rarity]
        const complete = total > 0 && unlocked === total
        const color = `var(--rarity-${rarity})`

        return (
          <motion.button
            aria-pressed={pressed}
            className="border-border bg-card relative inline-flex h-8 cursor-pointer items-center gap-2 overflow-hidden rounded-full border pr-3 pl-2.5 text-xs"
            key={rarity}
            onClick={() => onToggle(rarity)}
            style={{ borderColor: pressed ? color : undefined }}
            type="button"
            variants={chip}
            whileHover={{ transition: SPRING, y: -2 }}
            whileTap={{ scale: 0.92 }}
          >
            {/* Tinted fill springs in from the centre when the chip is on. */}
            <motion.span
              animate={{ opacity: pressed ? 1 : 0, scale: pressed ? 1 : 0.6 }}
              aria-hidden
              className="absolute inset-0 rounded-full"
              initial={false}
              style={{
                background: `color-mix(in oklch, ${color} 18%, transparent)`,
              }}
              transition={SPRING}
            />
            <motion.span
              animate={{ rotate: pressed ? 225 : 45 }}
              aria-hidden
              className="relative size-2 rounded-[2px]"
              initial={false}
              style={{ background: color }}
              transition={SPRING}
            />
            <span className="relative">
              {translate(`achievements.rarities.${rarity}`)}
            </span>
            <span
              className="text-muted-foreground relative inline-flex tabular-nums"
              style={{ color: complete ? color : undefined }}
            >
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
          </motion.button>
        )
      })}
    </motion.fieldset>
  )
}
