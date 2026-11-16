"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { ShareButton } from "@/components/animate-ui/components/community/share-button"
import { LocaleTransition } from "@/components/locale-transition"
import { getAchievementLabels } from "@/lib/achievement-labels"
import {
  ACHIEVEMENTS,
  type Achievement,
  formatSplit,
  rarityColorVar,
  rarityStars,
  setNumber,
} from "@/lib/achievements"
import { playSfx } from "@/lib/sfx/play"
import { type SharePlatform, shareIntentUrl } from "@/lib/share"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

/** Confirmation sound once the clipboard write actually resolved. */
function playCopySound(): void {
  playSfx("copy")
}

/**
 * Text side of an achievement: title, description, metadata and (once unlocked)
 * sharing. Rendered beside the slab in the one-column layout and in the inspect
 * dialog.
 */
export function AchievementDetails({
  achievement,
  className,
}: {
  achievement: Achievement
  className?: string
}) {
  const { locale, translate } = useLocale()
  const { def, hidden, title, description, rarityLabel } = getAchievementLabels(
    achievement,
    translate
  )

  const status = achievement.isUnlocked
    ? `${translate("achievements.unlocked")} · ${new Date(
        achievement.unlockedAt
      ).toLocaleDateString(locale)}`
    : translate("achievements.locked")
  const split =
    achievement.id === "speedophile" && achievement.isUnlocked
      ? formatSplit(achievement.split)
      : null

  const shareText = `${translate("achievements.toast.unlocked")} ${title}`

  // Web Share API where supported (mobile), clipboard copy as fallback.
  async function share() {
    const url = window.location.href
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: shareText, title, url })
      } catch {
        // User dismissed the share sheet: nothing to do.
      }
      return
    }
    await navigator.clipboard?.writeText(url).then(playCopySound)
  }

  // GitHub has no share endpoint (shareIntentUrl returns null): copy the link.
  function shareTo(platform: SharePlatform) {
    const url = window.location.href
    const intent = shareIntentUrl(platform, { text: shareText, url })
    if (intent) {
      window.open(intent, "_blank", "noopener,noreferrer")
      return
    }
    void navigator.clipboard?.writeText(url).then(playCopySound)
  }

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <LocaleTransition className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      </LocaleTransition>

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-1 text-xs">
        <dt className="text-muted-foreground text-[0.625rem] tracking-widest uppercase">
          {translate("achievements.slab.rarityLabel")}
        </dt>
        <dd style={{ color: hidden ? undefined : rarityColorVar(def.rarity) }}>
          {hidden ? rarityLabel : `${rarityStars(def.rarity)} ${rarityLabel}`}
        </dd>
        <dt className="text-muted-foreground text-[0.625rem] tracking-widest uppercase">
          {translate("achievements.slab.setLabel")}
        </dt>
        <dd className="tabular-nums">
          {`#${setNumber(achievement.id)} / ${ACHIEVEMENTS.length}`}
        </dd>
        <dt className="text-muted-foreground text-[0.625rem] tracking-widest uppercase">
          {translate("achievements.slab.statusLabel")}
        </dt>
        <dd>{status}</dd>
        {split ? (
          <>
            <dt className="text-muted-foreground text-[0.625rem] tracking-widest uppercase">
              {translate("achievements.slab.splitLabel")}
            </dt>
            <dd className="tabular-nums">{split}</dd>
          </>
        ) : null}
      </dl>

      {achievement.isUnlocked ? (
        <ShareButton
          className="self-start"
          icon="prefix"
          onClick={share}
          onIconClick={shareTo}
          size="sm"
        >
          {translate("achievements.share")}
        </ShareButton>
      ) : null}
    </div>
  )
}
