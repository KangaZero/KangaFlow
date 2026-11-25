"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import type { KeyboardEvent as ReactKeyboardEvent } from "react"

import { AchievementCollectionCard } from "@/components/achievement-collection-card"
import { useAchievementCollection } from "@/components/achievement-collection-context"
import { Kbd } from "@/components/ui/kbd"
import { useCardHand } from "@/hooks/use-card-hand"
import {
  ACHIEVEMENTS,
  type Achievement,
  type AchievementId,
  RARITIES,
  type Rarity,
  rarityColorVar,
} from "@/lib/achievements"
import { playSfx } from "@/lib/sfx/play"
import { useLocale } from "@/providers/locale-provider"
import "@/components/card-hand.css"

const idsOf = (rarity: Rarity): readonly AchievementId[] =>
  ACHIEVEMENTS.filter((def) => def.rarity === rarity).map((def) => def.id)

// Module constant: useCardHand restores its stored order whenever `ids`
// changes identity, so each hand's default order must be stable. `satisfies`
// makes a newly added rarity without a hand a type error.
const IDS_BY_RARITY = {
  common: idsOf("common"),
  legendary: idsOf("legendary"),
  mythic: idsOf("mythic"),
  rare: idsOf("rare"),
  uncommon: idsOf("uncommon"),
} as const satisfies Record<Rarity, readonly AchievementId[]>

const focusCardButton = () => ".acc"

function playMoveSound(): void {
  playSfx("menu-move")
}

/** One rarity's fanned hand (the projects hand's drag + keyboard, shared). */
function AchievementHand({
  rarity,
  achievements,
}: {
  rarity: Rarity
  achievements: ReadonlyMap<AchievementId, Achievement>
}) {
  const { translate } = useLocale()
  const { visible } = useAchievementCollection()
  const hand = useCardHand({
    enabled: true,
    focusSelector: focusCardButton,
    ids: IDS_BY_RARITY[rarity],
    onReorder: playMoveSound,
    storageKey: `kangaflow:achievement-hand:${rarity}`,
  })
  const cards = hand.order.flatMap((id) => {
    const achievement = achievements.get(id)
    return achievement ? [achievement] : []
  })
  const owned = cards.filter((card) => card.isUnlocked).length
  const middle = (cards.length - 1) / 2

  return (
    <div
      className="acl-row"
      data-row={rarity}
      style={{ "--rc": rarityColorVar(rarity) }}
    >
      <div
        className="acl-row-tag"
        data-complete={owned === cards.length ? "" : undefined}
      >
        <b>{translate(`achievements.rarities.${rarity}`)}</b>
        <span>{`${owned}/${cards.length}`}</span>
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: keyboard delegation for the cards' own buttons (roving arrows, Shift-reorder), not a control itself. */}
      <div
        className="card-hand acl-hand"
        onKeyDown={hand.onHandKeyDown}
        ref={hand.handRef}
      >
        {cards.map((achievement, index) => (
          <div
            className="card-hand-card acl-hand-card"
            data-card-id={achievement.id}
            data-dimmed={visible.has(achievement.id) ? undefined : ""}
            data-dragging={hand.dragging === achievement.id}
            data-settling={hand.settling === achievement.id}
            key={achievement.id}
            onPointerDown={hand.onCardPointerDown(achievement.id)}
            style={{
              "--off": index - middle,
              "--z": 10 - Math.abs(Math.round(index - middle)),
            }}
          >
            <AchievementCollectionCard achievement={achievement} />
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Layout B: a fanned hand per rarity. Cards drag to reorder within their row
 * (a row is its rarity, so cards never cross rows); ←/→ choose, Shift+←/→
 * move, ↑/↓ switch row.
 */
export function AchievementTable({
  achievements,
}: {
  achievements: readonly Achievement[]
}) {
  const { translate } = useLocale()
  const byId = new Map(
    achievements.map((achievement) => [achievement.id, achievement])
  )

  // ↑/↓: focus the card at the same slot (clamped) in the previous/next row.
  function onKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step =
      event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1 : 0
    if (step === 0 || !(event.target instanceof Element)) return
    const row = event.target.closest<HTMLElement>(".acl-row")
    const card = event.target.closest<HTMLElement>("[data-card-id]")
    const rows = [
      ...event.currentTarget.querySelectorAll<HTMLElement>(".acl-row"),
    ]
    if (!row || !card) return
    const target = rows[rows.indexOf(row) + step]
    if (!target) return
    event.preventDefault()
    const slots = [...(row.querySelector(".acl-hand")?.children ?? [])]
    const nextSlots = target.querySelectorAll<HTMLElement>(
      "[data-card-id] .acc"
    )
    const slot = Math.min(slots.indexOf(card), nextSlots.length - 1)
    nextSlots[Math.max(0, slot)]?.focus()
  }

  return (
    <div className="acl-table-wrap">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: ↑/↓ row switching delegated from the cards' buttons. */}
      <div className="acl-table" onKeyDown={onKeyDown}>
        {RARITIES.map((rarity) => (
          <AchievementHand achievements={byId} key={rarity} rarity={rarity} />
        ))}
      </div>
      <p className="acl-legend">
        <span>
          <Kbd>←→</Kbd>
          {translate("cardHand.legend.choose")}
        </span>
        <span>
          <Kbd>↑↓</Kbd>
          {translate("cardHand.legend.row")}
        </span>
        <span>
          <Kbd>Enter</Kbd>
          {translate("achievements.collection.open")}
        </span>
        <span>
          <Kbd>⇧←→</Kbd>
          {translate("cardHand.legend.move")}
        </span>
        <span>
          <Kbd>⠿</Kbd>
          {translate("cardHand.legend.drag")}
        </span>
      </p>
    </div>
  )
}
