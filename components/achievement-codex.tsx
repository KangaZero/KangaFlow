"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  type KeyboardEvent as ReactKeyboardEvent,
  startTransition,
  useRef,
  useState,
  ViewTransition,
} from "react"

import { AchievementArt } from "@/components/achievement-art"
import { AchievementCollectionCard } from "@/components/achievement-collection-card"
import { useAchievementCollection } from "@/components/achievement-collection-context"
import { AchievementDetails } from "@/components/achievement-details"
import { getAchievementLabels } from "@/lib/achievement-labels"
import { needsReveal } from "@/lib/achievement-reveal"
import {
  type Achievement,
  type AchievementId,
  rarityColorVar,
  setNumberLabel,
} from "@/lib/achievements"
import { useLocale } from "@/providers/locale-provider"

const STEP: Readonly<Record<string, -1 | 1>> = {
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -1,
}

/**
 * Layout C: a numbered index of mini tiles beside one showcase card and its
 * details. Arrow keys walk the index (roving tabindex); changing selection is
 * a Transition, so the showcase card animates in.
 */
export function AchievementCodex({
  achievements,
}: {
  achievements: readonly Achievement[]
}) {
  const { translate } = useLocale()
  const { revealed, visible } = useAchievementCollection()
  const [selectedId, setSelectedId] = useState<AchievementId | null>(null)
  const indexRef = useRef<HTMLOListElement>(null)
  const selected =
    achievements.find((achievement) => achievement.id === selectedId) ??
    achievements[0]
  if (!selected) return null

  function select(id: AchievementId, focus = false) {
    startTransition(() => setSelectedId(id))
    if (focus)
      requestAnimationFrame(() =>
        indexRef.current
          ?.querySelector<HTMLElement>(`[data-codex-id="${id}"]`)
          ?.focus()
      )
  }

  function onKeyDown(event: ReactKeyboardEvent<HTMLOListElement>) {
    const step = STEP[event.key]
    if (step === undefined || !selected) return
    event.preventDefault()
    const from = achievements.indexOf(selected)
    const next =
      achievements[(from + step + achievements.length) % achievements.length]
    if (next) select(next.id, true)
  }

  return (
    <div className="acl-codex">
      <ol className="acl-index" onKeyDown={onKeyDown} ref={indexRef}>
        {achievements.map((achievement) => {
          const { def, title, hidden } = getAchievementLabels(
            achievement,
            translate
          )
          const fresh = needsReveal(achievement, revealed)
          const current = achievement.id === selected.id
          const state = !achievement.isUnlocked
            ? "locked"
            : fresh
              ? "new"
              : "owned"
          return (
            <ViewTransition key={achievement.id}>
              <li
                className="acl-deal"
                data-dimmed={visible.has(achievement.id) ? undefined : ""}
              >
                <button
                  aria-current={current || undefined}
                  aria-label={`${setNumberLabel(achievement.id)} ${state === "owned" || !hidden ? title : translate("achievements.hidden")}`}
                  className="acl-tile"
                  data-codex-id={achievement.id}
                  data-state={state}
                  onClick={() => select(achievement.id)}
                  style={{ "--rc": rarityColorVar(def.rarity) }}
                  tabIndex={current ? 0 : -1}
                  type="button"
                >
                  {state === "owned" ? (
                    <AchievementArt id={achievement.id} />
                  ) : state === "new" ? (
                    <span className="acl-tile-new">
                      {translate("achievements.slab.new")}
                    </span>
                  ) : null}
                  <span className="acl-tile-no">
                    {setNumberLabel(achievement.id)}
                  </span>
                </button>
              </li>
            </ViewTransition>
          )
        })}
      </ol>
      <div className="acl-showcase">
        <ViewTransition
          default="none"
          enter="acl-swap-in"
          exit="acl-swap-out"
          key={selected.id}
        >
          <div className="acl-stage">
            <AchievementCollectionCard achievement={selected} />
          </div>
        </ViewTransition>
        <AchievementDetails achievement={selected} />
      </div>
    </div>
  )
}
