"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { ShareButton } from "@/components/animate-ui/components/community/share-button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  type Achievement,
  getAchievementDef,
  RARITY_ICON,
  rarityColorVar,
} from "@/lib/achievements"
import { type SharePlatform, shareIntentUrl } from "@/lib/share"
import { useLocale } from "@/providers/locale-provider"

export function AchievementCard({ achievement }: { achievement: Achievement }) {
  const { locale, translate } = useLocale()
  const def = getAchievementDef(achievement.id)
  const Icon = RARITY_ICON[def.rarity]
  const color = rarityColorVar(def.rarity)
  const hidden = def.secret && !achievement.isUnlocked

  const title = hidden
    ? translate("achievements.hidden")
    : translate(`achievements.items.${achievement.id}.title`)
  const description = hidden
    ? translate("achievements.hidden")
    : translate(`achievements.items.${achievement.id}.description`)
  const rarityLabel = translate(`achievements.rarities.${def.rarity}`)

  const status = achievement.isUnlocked
    ? `${translate("achievements.unlocked")} · ${new Date(
        achievement.unlockedAt
      ).toLocaleDateString(locale)}`
    : `${translate("achievements.locked")} · ${rarityLabel}`

  // Web Share API on supporting devices (mobile), clipboard copy as fallback.
  async function share() {
    const url = window.location.href
    const text = `${translate("achievements.toast.unlocked")} ${title}`
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text, title, url })
      } catch {
        // User dismissed the share sheet — nothing to do.
      }
      return
    }
    await navigator.clipboard?.writeText(url)
  }

  // Per-platform share intents surfaced by the ShareButton's hover icons. GitHub
  // has no share endpoint (shareIntentUrl returns null), so it copies the link.
  function shareTo(platform: SharePlatform) {
    const url = window.location.href
    const text = `${translate("achievements.toast.unlocked")} ${title}`
    const intent = shareIntentUrl(platform, { text, url })
    if (intent) {
      window.open(intent, "_blank", "noopener,noreferrer")
      return
    }
    void navigator.clipboard?.writeText(url)
  }

  return (
    <Card
      className="h-full"
      style={{
        borderColor: achievement.isUnlocked ? color : undefined,
        opacity: achievement.isUnlocked ? 1 : 0.65,
      }}
    >
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon style={{ color }} />
          <span>{title}</span>
          <Badge
            className="ml-auto"
            style={{ borderColor: color, color }}
            variant="outline"
          >
            {rarityLabel}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-muted-foreground text-sm">{description}</p>
        <span className="text-muted-foreground text-xs">{status}</span>
      </CardContent>
      {achievement.isUnlocked ? (
        <CardFooter>
          <ShareButton
            icon="prefix"
            onClick={share}
            onIconClick={shareTo}
            size="sm"
          >
            {translate("achievements.share")}
          </ShareButton>
        </CardFooter>
      ) : null}
    </Card>
  )
}
