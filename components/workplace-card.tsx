"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/workplace-card.css"

import { motion, useReducedMotion } from "motion/react"

import { TokyoMap } from "@/components/tokyo-map"
import { RansomWord } from "@/components/ui/ransom-word"
import { isReducedMotion } from "@/lib/isReducedMotion"
import { person } from "@/lib/person"
import {
  SHARD,
  SHARD_DELAY,
  SHARD_HIDDEN,
  SHARD_SHOWN,
  SLAM,
  SLAM_HIDDEN,
  SLAM_SHOWN,
  WIPE_DURATION,
  WIPE_EASE,
  WIPE_HIDDEN,
  WIPE_SHOWN,
} from "@/lib/rebel-motion"
import { splitAround } from "@/lib/text-highlight"
import { formatCoordinates } from "@/lib/tokyo-map"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// Workplace read-out shown when hovering the header date: a "rebel" plate whose
// outline rises into a bolt tip pointing up at the date, an accent shard behind
// it sharing the same silhouette, and the same wipe + slam entrance as
// AnimatedTooltip (lib/rebel-motion). Content: Tokyo in ransom letters with a
// decorative 東京 sticker, the employer, the real TokyoMap as a taped photo,
// the coordinates, and the required GSI attribution.
export function WorkplaceCard({ className }: { className?: string }) {
  const { locale, translate } = useLocale()
  const reduceMotion = useReducedMotion()
  const { animationPref } = useGlobalStates()
  // Reduced motion: render the final state straight away (no wipe/slam).
  const enter = !isReducedMotion(animationPref, reduceMotion)
  const city = translate("headerCard.city").toLocaleUpperCase(locale)
  const workplace = translate("headerCard.workplace")
  const employer = splitAround(workplace, person.workplace)

  return (
    <motion.div
      animate={SLAM_SHOWN}
      className={cn("workplace-card", className)}
      initial={enter ? SLAM_HIDDEN : false}
      transition={{ ...SLAM, opacity: { duration: 0.12 } }}
    >
      <motion.div
        animate={{ clipPath: WIPE_SHOWN }}
        className="relative"
        initial={enter ? { clipPath: WIPE_HIDDEN } : false}
        transition={{ duration: WIPE_DURATION, ease: WIPE_EASE }}
      >
        <motion.div
          animate={SHARD_SHOWN}
          aria-hidden
          className="workplace-card__shard tooltip-shape-bottom-start"
          initial={enter ? SHARD_HIDDEN : false}
          transition={{ ...SHARD, delay: SHARD_DELAY }}
        />
        <div className="workplace-card__plate tooltip-shape-bottom-start">
          <p className="workplace-card__city">
            <span className="workplace-card__label">
              {translate("headerCard.basedIn")}
            </span>
            <span className="sr-only">{city}</span>
            <RansomWord
              className="inline-flex items-end"
              delay={enter ? 0.14 : 0}
              text={city}
            />
            <span aria-hidden className="workplace-card__sticker">
              {translate("headerCard.citySticker")}
            </span>
          </p>
          <p className="workplace-card__work">
            {employer ? (
              <>
                {employer.before}
                <b>{employer.match}</b>
                {employer.after}
              </>
            ) : (
              workplace
            )}
          </p>
          <figure className="workplace-card__photo">
            <TokyoMap
              className="w-full"
              label={translate("headerCard.map.label")}
              point={person.locationCoordinates}
            />
            <figcaption>{translate("headerCard.map.caption")}</figcaption>
          </figure>
          <p className="workplace-card__coords">
            {formatCoordinates(person.locationCoordinates)}
          </p>
          {/* Required attribution for the ward geometry. GSI asks for 出典元の明記,
              which is what 地図出典 renders; the source name (地球地図日本 /
              Global Map Japan) stays recognisable in both locales. */}
          <p className="workplace-card__credit">
            {translate("headerCard.map.credit")}
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
