"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { LayoutGroup, motion } from "motion/react"
import * as React from "react"

import { ACHIEVEMENT_SORTS, type AchievementSort } from "@/lib/achievements"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

/**
 * Segmented sort control. The active highlight is ONE element shared through
 * `layoutId`, so switching sort makes it glide between pills instead of
 * blinking off one and on the other.
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
      <fieldset
        aria-label={translate("achievements.sort.label")}
        className={cn(
          "bg-muted inline-flex h-9 items-center gap-0.5 rounded-full p-1",
          className
        )}
      >
        {ACHIEVEMENT_SORTS.map((sort) => {
          const active = sort === value
          return (
            <motion.button
              aria-pressed={active}
              className={cn(
                "relative h-7 cursor-pointer rounded-full px-3 text-xs transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
              key={sort}
              onClick={() => onChange(sort)}
              type="button"
              whileTap={{ scale: 0.94 }}
            >
              {active ? (
                <motion.span
                  aria-hidden
                  className="bg-background absolute inset-0 rounded-full shadow-sm"
                  layoutId="achievement-sort-indicator"
                  transition={{ damping: 30, stiffness: 400, type: "spring" }}
                />
              ) : null}
              <span className="relative">
                {translate(`achievements.sort.${sort}`)}
              </span>
            </motion.button>
          )
        })}
      </fieldset>
    </LayoutGroup>
  )
}
