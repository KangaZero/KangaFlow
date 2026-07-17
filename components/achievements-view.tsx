"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { LayoutGrid, ListFilter } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import * as React from "react"

import { AchievementCard } from "@/components/achievement-card"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { getAchievementDef, RARITIES, type Rarity } from "@/lib/achievements"
import { useAchievements } from "@/providers/achievements-provider"
import { useLocale } from "@/providers/locale-provider"

const COLUMN_OPTIONS = [1, 2, 3] as const
type ColumnCount = (typeof COLUMN_OPTIONS)[number]

const titleContainer = {
  hidden: {},
  show: { transition: { delayChildren: 0.1, staggerChildren: 0.05 } },
}
const titleChar = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export function AchievementsView() {
  const { achievements, countByRarity } = useAchievements()
  const { translate } = useLocale()
  const [search, setSearch] = React.useState("")
  const [rarityFilter, setRarityFilter] = React.useState<Rarity[]>([])
  const [columns, setColumns] = React.useState<ColumnCount>(3)

  const heading = translate("achievements.heading")
  const query = search.trim().toLowerCase()

  const filtered = achievements.filter((achievement) => {
    const def = getAchievementDef(achievement.id)
    const hidden = def.secret && !achievement.isUnlocked
    const title = hidden
      ? translate("achievements.hidden")
      : translate(`achievements.items.${achievement.id}.title`)
    const matchesSearch = title.toLowerCase().includes(query)
    const matchesRarity =
      rarityFilter.length === 0 || rarityFilter.includes(def.rarity)
    return matchesSearch && matchesRarity
  })

  function toggleRarity(rarity: Rarity) {
    setRarityFilter((prev) =>
      prev.includes(rarity)
        ? prev.filter((value) => value !== rarity)
        : [...prev, rarity]
    )
  }

  function cycleColumns() {
    setColumns((prev) => {
      const index = COLUMN_OPTIONS.indexOf(prev)
      return COLUMN_OPTIONS[(index + 1) % COLUMN_OPTIONS.length] ?? 1
    })
  }

  const hasFilters = query.length > 0 || rarityFilter.length > 0
  const resultText = hasFilters
    ? filtered.length > 0
      ? `${filtered.length} ${translate("achievements.search.results")}`
      : translate("achievements.search.noResults")
    : ""

  return (
    <main className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 p-6">
      <motion.h1
        animate="show"
        className="flex font-medium text-2xl"
        initial="hidden"
        variants={titleContainer}
      >
        {Array.from(heading).map((char, index) => (
          <motion.span
            // biome-ignore lint/suspicious/noArrayIndexKey: characters are positional; index is the stable identity here.
            key={`${char}-${index}`}
            variants={titleChar}
          >
            {char === " " ? " " : char}
          </motion.span>
        ))}
      </motion.h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          aria-label={translate("achievements.search.placeholder")}
          className="max-w-xs"
          onChange={(event) => setSearch(event.target.value)}
          placeholder={translate("achievements.search.placeholder")}
          value={search}
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={rarityFilter.length > 0 ? "default" : "outline"}>
              <ListFilter />
              {translate("achievements.filter.label")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>
              {translate("achievements.filter.label")}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {RARITIES.map((rarity) => (
              <DropdownMenuCheckboxItem
                checked={rarityFilter.includes(rarity)}
                key={rarity}
                onCheckedChange={() => toggleRarity(rarity)}
                onSelect={(event) => event.preventDefault()}
              >
                {`${translate(`achievements.rarities.${rarity}`)} (${countByRarity[rarity]})`}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button onClick={cycleColumns} variant="ghost">
          <LayoutGrid />
          {translate("achievements.toggleColumns")}
        </Button>
        {resultText ? (
          <span className="text-muted-foreground text-xs">{resultText}</span>
        ) : null}
      </div>

      <motion.div
        className="grid gap-4"
        layout
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        <AnimatePresence>
          {filtered.map((achievement) => (
            <motion.div
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              initial={{ opacity: 0, scale: 0.9 }}
              key={achievement.id}
              layout
            >
              <AchievementCard achievement={achievement} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    </main>
  )
}
