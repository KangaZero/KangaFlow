"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { LayoutGrid, Search } from "lucide-react"
import { useReducedMotion } from "motion/react"
import * as React from "react"

import { AchievementBinder } from "@/components/achievement-binder"
import { AchievementCodex } from "@/components/achievement-codex"
import { cardMorphName } from "@/components/achievement-collection-card"
import {
  type AchievementCollection,
  AchievementCollectionProvider,
} from "@/components/achievement-collection-context"
import { AchievementDetails } from "@/components/achievement-details"
import { AchievementRarityChips } from "@/components/achievement-rarity-chips"
import { AchievementSlab } from "@/components/achievement-slab"
import { AchievementSortPills } from "@/components/achievement-sort-pills"
import { AchievementTable } from "@/components/achievement-table"
import { useUnlockFx } from "@/components/achievement-unlock-fx"
import { AchievementsProgress } from "@/components/achievements-progress"
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog"
import { PageHeader } from "@/components/page-header"
import { Input } from "@/components/ui/input"
import { useRevealedAchievements } from "@/hooks/use-revealed-achievements"
import { getAchievementLabels } from "@/lib/achievement-labels"
import {
  type AchievementId,
  type AchievementSort,
  isNewlyUnlocked,
  type Rarity,
  sortAchievements,
} from "@/lib/achievements"
import { fuzzyScore } from "@/lib/fuzzy"
import { nextAchievementLayout } from "@/lib/globalStates"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { useAchievements } from "@/providers/achievements-provider"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"
import "@/components/achievements-top.css"
import "@/components/achievement-collection.css"

export function AchievementsView() {
  const { achievements } = useAchievements()
  const { translate } = useLocale()
  const { achievementLayout, setAchievementLayout, animationPref } =
    useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const { api: fx, layer: fxLayer } = useUnlockFx()
  const { revealed, reveal } = useRevealedAchievements()
  const [search, setSearch] = React.useState("")
  const [rarityFilter, setRarityFilter] = React.useState<Rarity[]>([])
  const [sort, setSort] = React.useState<AchievementSort>("set")
  const [inspectedId, setInspectedId] = React.useState<AchievementId | null>(
    null
  )
  // Captured once per visit: "NEW" badges should not flicker off mid-session.
  const [now] = React.useState(() => Date.now())
  const searchId = React.useId()

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

  // Layout and sort changes are Transitions: the keyed <ViewTransition>s
  // cross-fade the layout and glide reordered cards (no-ops when the browser
  // or the motion setting says no).
  function cycleLayout() {
    React.startTransition(() =>
      setAchievementLayout(nextAchievementLayout(achievementLayout))
    )
  }
  function changeSort(next: AchievementSort) {
    React.startTransition(() => setSort(next))
  }
  const inspect = React.useCallback((id: AchievementId) => {
    React.startTransition(() => setInspectedId(id))
  }, [])
  function closeInspect() {
    React.startTransition(() => setInspectedId(null))
  }

  // Every card stays in its place; the filters only dim what they exclude.
  const ordered = sortAchievements(achievements, sort)
  const visible = new Set(filtered.map((achievement) => achievement.id))
  const collection: AchievementCollection = {
    fx,
    inspect,
    inspectedId,
    markRevealed: reveal,
    reduced,
    revealed,
    visible,
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

      <section className="at-scope">
        <AchievementsProgress className="at-slam" />
        <AchievementRarityChips
          onToggle={toggleRarity}
          selected={rarityFilter}
        />
        <div className="at-tools at-slam" style={{ "--k": 3 }}>
          <search>
            <label className="sr-only" htmlFor={searchId}>
              {translate("achievements.search.placeholder")}
            </label>
            <div className="at-field">
              <Search aria-hidden className="at-field-icon size-3.5" />
              <Input
                autoCapitalize="none"
                autoComplete="off"
                autoCorrect="off"
                className="at-field-input h-auto rounded-none border-0 bg-transparent p-0 focus-visible:ring-0 dark:bg-transparent"
                id={searchId}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={translate("achievements.search.placeholder")}
                spellCheck={false}
                type="search"
                value={search}
              />
            </div>
          </search>
          <AchievementSortPills onChange={changeSort} value={sort} />
          <button className="at-layout" onClick={cycleLayout} type="button">
            <LayoutGrid aria-hidden className="size-3.5" />
            <span>{translate("achievements.toggleLayout")}</span>
            <b className="at-layout-name">
              {translate(`achievements.layouts.${achievementLayout}`)}
            </b>
          </button>
          {/* Always mounted so screen readers announce changes to it. */}
          <span
            className="at-status"
            data-empty={hasFilters && filtered.length === 0 ? "" : undefined}
            role="status"
          >
            {resultText}
          </span>
        </div>
      </section>

      <AchievementCollectionProvider value={collection}>
        <section className="acl-scope">
          <React.ViewTransition
            default="none"
            enter="acl-swap-in"
            exit="acl-swap-out"
            key={achievementLayout}
          >
            <div>
              {achievementLayout === "binder" ? (
                <AchievementBinder achievements={ordered} />
              ) : achievementLayout === "table" ? (
                <AchievementTable achievements={achievements} />
              ) : (
                <AchievementCodex achievements={ordered} />
              )}
            </div>
          </React.ViewTransition>
        </section>
      </AchievementCollectionProvider>
      {fxLayer}

      <Dialog
        onOpenChange={(open) => {
          if (!open) closeInspect()
        }}
        open={inspected != null}
      >
        <DialogContent
          aria-describedby={undefined}
          className="gap-8 sm:max-w-3xl md:grid-cols-[minmax(0,20rem)_1fr] md:items-center"
          // The card morphs in through the view transition; the dialog's own
          // spring would hand it an invisible target, so it snaps instead.
          {...(reduced ? {} : { transition: { duration: 0 } })}
        >
          {inspected ? (
            <>
              <DialogTitle className="sr-only">
                {getAchievementLabels(inspected, translate).title}
              </DialogTitle>
              <AchievementSlab
                achievement={inspected}
                isNew={isNewlyUnlocked(inspected, now)}
                morphName={cardMorphName(inspected.id)}
              />
              <AchievementDetails achievement={inspected} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  )
}
