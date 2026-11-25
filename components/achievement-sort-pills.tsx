"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { LayoutGroup, motion } from "motion/react"
import * as React from "react"

import { ACHIEVEMENT_SORTS, type AchievementSort } from "@/lib/achievements"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

/**
 * Segmented sort control as a skewed slab (achievements-top.css). The active
 * highlight is ONE element shared through `layoutId`, so switching sort makes
 * it glide between options instead of blinking off one and on the other.
 */
export function AchievementSortPills({
  value,
  onChange,
  className,
}: {
  value: AchievementSort
  onChange: (sort: AchievementSort) => void
  className?: string
}) {
  const { translate } = useLocale()
  // Scope the layoutId so two instances on one page never share a highlight.
  const groupId = React.useId()

  return (
    <LayoutGroup id={groupId}>
      <fieldset className={cn("at-sort", className)}>
        <legend className="sr-only">
          {translate("achievements.sort.label")}
        </legend>
        {ACHIEVEMENT_SORTS.map((sort) => {
          const active = sort === value
          return (
            <motion.button
              aria-pressed={active}
              className="at-sort-option"
              key={sort}
              onClick={() => onChange(sort)}
              type="button"
              whileTap={{ scale: 0.94 }}
            >
              {active ? (
                <motion.span
                  aria-hidden
                  className="at-sort-indicator"
                  layoutId="achievement-sort-indicator"
                  transition={{ damping: 30, stiffness: 400, type: "spring" }}
                />
              ) : null}
              <span className="at-sort-label">
                {translate(`achievements.sort.${sort}`)}
              </span>
            </motion.button>
          )
        })}
      </fieldset>
    </LayoutGroup>
  )
}
