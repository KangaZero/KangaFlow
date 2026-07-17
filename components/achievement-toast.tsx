"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { X } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"
import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  type Achievement,
  getAchievementDef,
  RARITY_ICON,
  rarityColorVar,
} from "@/lib/achievements"
import { useAchievements } from "@/providers/achievements-provider"
import { useLocale } from "@/providers/locale-provider"

const AUTO_DISMISS_MS = 6000

function ToastCard({ achievement }: { achievement: Achievement }) {
  const { translate } = useLocale()
  const { dismissCurrent } = useAchievements()
  const def = getAchievementDef(achievement.id)
  const Icon = RARITY_ICON[def.rarity]
  const color = rarityColorVar(def.rarity)

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="pointer-events-auto flex items-center gap-3 rounded-xl border bg-popover p-3 pr-2 shadow-lg"
      exit={{ opacity: 0, scale: 0.9, y: -80 }}
      initial={{ opacity: 0, scale: 0.9, y: -80 }}
      style={{ borderColor: color }}
      transition={{ damping: 24, stiffness: 300, type: "spring" }}
    >
      <Icon style={{ color }} />
      <span className="flex flex-col">
        <span className="font-medium text-sm">
          {translate("achievements.toast.unlocked")}
        </span>
        <span className="text-muted-foreground text-xs">
          {translate(`achievements.items.${achievement.id}.title`)}
        </span>
      </span>
      <Button
        aria-label={translate("achievements.toast.dismiss")}
        onClick={dismissCurrent}
        size="icon-sm"
        variant="ghost"
      >
        <X />
      </Button>
    </motion.div>
  )
}

export function AchievementToast() {
  const { currentUnlocked, dismissCurrent } = useAchievements()

  React.useEffect(() => {
    if (currentUnlocked == null) {
      return
    }
    const timer = window.setTimeout(dismissCurrent, AUTO_DISMISS_MS)
    return () => window.clearTimeout(timer)
  }, [currentUnlocked, dismissCurrent])

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-100 flex justify-center px-4">
      <AnimatePresence>
        {currentUnlocked != null && (
          <ToastCard achievement={currentUnlocked} key={currentUnlocked.id} />
        )}
      </AnimatePresence>
    </div>
  )
}
