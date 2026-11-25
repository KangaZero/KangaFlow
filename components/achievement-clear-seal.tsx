"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useLocale } from "@/providers/locale-provider"

/**
 * Hanko-style "CLEAR!" seal stamped onto the achievements progress strip once
 * every achievement is unlocked. Purely presentational; the count is already
 * exposed by the <progress> it sits beside. Styles: achievements-top.css.
 */
export function AchievementClearSeal({ count }: { count: string }) {
  const { translate } = useLocale()

  return (
    <span className="at-seal">
      <span className="at-seal-body">
        <b>{translate("about.quest.clear")}</b>
        <small aria-hidden="true">{count}</small>
      </span>
    </span>
  )
}
