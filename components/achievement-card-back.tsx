"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { KangaFlowLogo } from "@/components/ui/kangaflow-logo"
import { useLocale } from "@/providers/locale-provider"

// The logo's 800×400 canvas is mostly empty; crop to the mark (+ stroke) so it
// fills the emblem.
const LOGO_VIEWBOX = "236 112 328 176"

/**
 * Chrome card back, the same stock as the About projects cards (brushed chrome
 * + iridescent sheen, --tc-* tokens in globals.css). `isNew` = a fresh unlock
 * still face down: its rarity leaks out (tinted rays, ring, breathing aura)
 * and it invites a tap. Purely visual; the button around it carries the name.
 * Styles: achievement-collection.css.
 */
export function AchievementCardBack({ isNew = false }: { isNew?: boolean }) {
  const { translate } = useLocale()

  return (
    <span aria-hidden="true" className="acb" data-new={isNew || undefined}>
      <span className="acb-rays" />
      <span className="acb-frame" />
      <span className="acb-label acb-label--top">
        {translate("achievements.collection.backSeries")}
      </span>
      <span className="acb-emblem">
        <KangaFlowLogo
          animated={false}
          aria-hidden
          className="h-auto w-[80%]"
          viewBox={LOGO_VIEWBOX}
        />
      </span>
      <span className="acb-label acb-label--bottom">
        {translate("achievements.collection.backBrand")}
      </span>
      <i className="acb-corner" />
      <i className="acb-corner" />
      <i className="acb-corner" />
      <i className="acb-corner" />
      <span className="acb-sheen" />
      {isNew ? (
        <>
          <i className="acb-new">{translate("achievements.slab.new")}</i>
          <i className="acb-tap">
            {translate("achievements.collection.tapToReveal")}
          </i>
        </>
      ) : null}
    </span>
  )
}
