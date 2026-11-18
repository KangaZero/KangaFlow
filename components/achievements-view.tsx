"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { LayoutGrid } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import * as React from "react"

import { AchievementDetails } from "@/components/achievement-details"
import { AchievementRarityChips } from "@/components/achievement-rarity-chips"
import { AchievementSlab } from "@/components/achievement-slab"
import { AchievementSortPills } from "@/components/achievement-sort-pills"
import { AchievementsProgress } from "@/components/achievements-progress"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getAchievementLabels } from "@/lib/achievement-labels"
import {
  type AchievementId,
  type AchievementSort,
  isNewlyUnlocked,
  type Rarity,
  sortAchievements,
} from "@/lib/achievements"
import { fuzzyScore } from "@/lib/fuzzy"
import { COLUMN_OPTIONS } from "@/lib/globalStates"
import { useAchievements } from "@/providers/achievements-provider"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

export function AchievementsView() {
  const { achievements } = useAchievements()
  const { translate } = useLocale()
  const { columnCount, setColumnCount } = useGlobalStates()
  const [search, setSearch] = React.useState("")
  const [rarityFilter, setRarityFilter] = React.useState<Rarity[]>([])
  const [sort, setSort] = React.useState<AchievementSort>("set")
  const [inspectedId, setInspectedId] = React.useState<AchievementId | null>(
    null
  )
  // Captured once per visit: "NEW" badges should not flicker off mid-session.
  const [now] = React.useState(() => Date.now())

  const heading = translate("achievements.heading")
  const query = search.trim()

  const searched = achievements
    .map((achievement) => {
      const { def, title } = getAchievementLabels(achievement, translate)
      return { achievement, def, score: fuzzyScore(query, title) }
    })
    .filter(
      // Keep fuzzy matches (score !== null) that also pass the rarity filter.
      (row): row is typeof row & { score: number } =>
        row.score !== null &&
        (rarityFilter.length === 0 || rarityFilter.includes(row.def.rarity))
    )
  // While searching, relevance wins; otherwise the chosen sort applies.
  const filtered =
    query.length > 0
      ? searched.sort((a, b) => b.score - a.score).map((row) => row.achievement)
      : sortAchievements(
          searched.map((row) => row.achievement),
          sort
        )

  const inspected =
    achievements.find((achievement) => achievement.id === inspectedId) ?? null

  function toggleRarity(rarity: Rarity) {
    setRarityFilter((prev) =>
      prev.includes(rarity)
        ? prev.filter((value) => value !== rarity)
        : [...prev, rarity]
    )
  }

  function cycleColumns() {
    const index = COLUMN_OPTIONS.indexOf(columnCount)
    const next = COLUMN_OPTIONS[(index + 1) % COLUMN_OPTIONS.length]
    if (next) setColumnCount(next)
  }

  const hasFilters = query.length > 0 || rarityFilter.length > 0
  const resultText = hasFilters
    ? filtered.length > 0
      ? `${filtered.length} ${translate("achievements.search.results")}`
      : translate("achievements.search.noResults")
    : ""

  return (
    <main className="mx-auto flex min-h-svh max-w-6xl flex-col gap-6 px-6 pt-16 pb-6 md:px-10">
      <PageHeader
        className="mb-6"
        page="achievements"
        subtitle={translate("achievements.subtitle")}
        title={heading}
      />

      <section className="flex flex-col gap-4">
        <AchievementsProgress className="max-w-sm" />
        <AchievementRarityChips
          onToggle={toggleRarity}
          selected={rarityFilter}
        />
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={translate("achievements.search.placeholder")}
          className="max-w-xs"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={translate("achievements.search.placeholder")}
          value={search}
        />
        <AchievementSortPills onChange={setSort} value={sort} />
        <Button onClick={cycleColumns} variant="ghost">
          <LayoutGrid />
          {translate("achievements.toggleColumns")}
        </Button>
        {resultText ? (
          <span className="text-muted-foreground text-xs">{resultText}</span>
        ) : null}
      </div>

      <motion.div
        className="grid gap-5"
        layout
        style={{
          gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
        }}
      >
        <AnimatePresence mode="popLayout">
          {filtered.map((achievement) => {
            const slab = (
              <AchievementSlab
                achievement={achievement}
                isNew={isNewlyUnlocked(achievement, now)}
                onInspect={() => setInspectedId(achievement.id)}
              />
            )
            return (
              <motion.div
                animate={{ opacity: 1, scale: 1 }}
                className={
                  columnCount === 1
                    ? "bg-card grid items-center gap-7 rounded-2xl border p-4 sm:grid-cols-[13.75rem_1fr]"
                    : undefined
                }
                exit={{ opacity: 0, scale: 0.9 }}
                initial={{ opacity: 0, scale: 0.9 }}
                key={achievement.id}
                layout
              >
                {slab}
                {columnCount === 1 ? (
                  <AchievementDetails achievement={achievement} />
                ) : null}
              </motion.div>
            )
          })}
        </AnimatePresence>
      </motion.div>

      <Dialog
        onOpenChange={(open) => {
          if (!open) setInspectedId(null)
        }}
        open={inspected != null}
      >
        <DialogContent
          aria-describedby={undefined}
          className="gap-8 sm:max-w-3xl md:grid-cols-[minmax(0,20rem)_1fr] md:items-center"
        >
          {inspected ? (
            <>
              <DialogTitle className="sr-only">
                {getAchievementLabels(inspected, translate).title}
              </DialogTitle>
              <AchievementSlab
                achievement={inspected}
                isNew={isNewlyUnlocked(inspected, now)}
              />
              <AchievementDetails achievement={inspected} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  )
}
