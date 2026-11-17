"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Inline track list rendered inside the media player's accordion (it used to
// be a separate draggable window).

import { Heart } from "lucide-react"
import { LayoutGroup, motion } from "motion/react"
import type * as React from "react"
import { memo } from "react"
import { formatSecondsToMMSS, PLAYLIST } from "@/components/widgets/tracks"
import { SPRING_PILL, SPRING_REORDER } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

type TrackListProps = {
  currentIndex: number
  favoritedIndices: readonly number[]
  restIndices: readonly number[]
  onSelect: (index: number) => void
  onToggleFavorite: (index: number) => void
}

// Rows cascade in when the accordion opens.
const ROW_STAGGER_S = 0.035

export const TrackList = memo(function TrackList({
  currentIndex,
  favoritedIndices,
  onSelect,
  onToggleFavorite,
  restIndices,
}: TrackListProps): React.JSX.Element {
  const { translate } = useLocale()

  return (
    <div className="no-scrollbar p-1.5">
      <LayoutGroup>
        {favoritedIndices.length > 0 ? (
          <div>
            <p className="text-muted-foreground px-2.5 py-1 text-[10px] font-medium tracking-wide uppercase">
              {translate("mediaPlayer.favorites")}
            </p>
            {favoritedIndices.map((i, row) => {
              const t = PLAYLIST[i] ?? PLAYLIST[0]
              const isActive = currentIndex === i
              const trackId = `track-${i}`
              return (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group relative flex items-center rounded-lg",
                    isActive
                      ? "text-foreground"
                      : "text-foreground hover:bg-muted/60"
                  )}
                  initial={{ opacity: 0, y: -6 }}
                  key={trackId}
                  layout
                  layoutId={trackId}
                  transition={{
                    ...SPRING_REORDER,
                    // Stagger only the entrance; reorders stay immediate.
                    opacity: { delay: ROW_STAGGER_S * row, duration: 0.2 },
                    y: { ...SPRING_REORDER, delay: ROW_STAGGER_S * row },
                  }}
                >
                  {isActive ? (
                    <motion.span
                      className="bg-primary/15 ring-primary/30 absolute inset-0 rounded-lg ring-1"
                      layoutId="track-list-active"
                      transition={SPRING_PILL}
                    />
                  ) : null}
                  <button
                    className="relative flex flex-1 items-center gap-2.5 px-2.5 py-2 text-left"
                    onClick={() => onSelect(i)}
                    type="button"
                  >
                    <span className="flex min-w-0 flex-col">
                      <div className="grid grid-cols-2 gap-x-3">
                        <span className="truncate text-sm font-medium">
                          {t.title}
                        </span>
                        <span
                          className={cn(
                            "ml-auto shrink-0 font-mono text-[10px] tabular-nums",
                            isActive
                              ? "text-primary-ink"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatSecondsToMMSS(t.duration)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "truncate text-xs",
                          isActive
                            ? "text-muted-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {t.composer}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs",
                          isActive
                            ? "text-muted-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {t.artist !== undefined ? t.artist : ""}
                      </span>
                    </span>
                  </button>
                  <button
                    aria-label={translate("mediaPlayer.unfavorite")}
                    className={cn(
                      "relative mr-1 flex size-7 shrink-0 items-center justify-center rounded-lg opacity-100 transition-opacity",
                      isActive
                        ? "text-primary-ink hover:text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(i)
                    }}
                    type="button"
                  >
                    <Heart className="size-3.5 fill-current" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        ) : null}
        {restIndices.length > 0 ? (
          <div
            className={
              favoritedIndices.length > 0
                ? "border-border/40 mt-1 border-t pt-1"
                : ""
            }
          >
            {favoritedIndices.length > 0 ? (
              <p className="text-muted-foreground px-2.5 py-1 text-[10px] font-medium tracking-wide uppercase">
                {translate("mediaPlayer.allTracks")}
              </p>
            ) : null}
            {restIndices.map((i, n) => {
              const row = favoritedIndices.length + n
              const t = PLAYLIST[i] ?? PLAYLIST[0]
              const isActive = currentIndex === i
              const trackId = `track-${i}`
              return (
                <motion.div
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "group relative flex items-center rounded-lg",
                    isActive
                      ? "text-foreground"
                      : "text-foreground hover:bg-muted/60"
                  )}
                  initial={{ opacity: 0, y: -6 }}
                  key={trackId}
                  layout
                  layoutId={trackId}
                  transition={{
                    ...SPRING_REORDER,
                    // Stagger only the entrance; reorders stay immediate.
                    opacity: { delay: ROW_STAGGER_S * row, duration: 0.2 },
                    y: { ...SPRING_REORDER, delay: ROW_STAGGER_S * row },
                  }}
                >
                  {isActive ? (
                    <motion.span
                      className="bg-primary/15 ring-primary/30 absolute inset-0 rounded-lg ring-1"
                      layoutId="track-list-active"
                      transition={SPRING_PILL}
                    />
                  ) : null}
                  <button
                    className="relative flex flex-1 items-center gap-2.5 px-2.5 py-2 text-left"
                    onClick={() => onSelect(i)}
                    type="button"
                  >
                    <span className="flex min-w-0 flex-col">
                      <div className="grid grid-cols-2 gap-x-3">
                        <span className="truncate text-sm font-medium">
                          {t.title}
                        </span>
                        <span
                          className={cn(
                            "ml-auto shrink-0 font-mono text-[10px] tabular-nums",
                            isActive
                              ? "text-primary-ink"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatSecondsToMMSS(t.duration)}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "truncate text-xs",
                          isActive
                            ? "text-muted-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {t.composer}
                      </span>
                      <span
                        className={cn(
                          "truncate text-xs",
                          isActive
                            ? "text-muted-foreground"
                            : "text-muted-foreground"
                        )}
                      >
                        {t.artist !== undefined ? t.artist : ""}
                      </span>
                    </span>
                  </button>
                  <button
                    aria-label={translate("mediaPlayer.favorite")}
                    className={cn(
                      "relative mr-1 flex size-7 shrink-0 items-center justify-center rounded-lg transition-opacity",
                      isActive
                        ? "text-primary-ink hover:text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                      "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => {
                      e.stopPropagation()
                      onToggleFavorite(i)
                    }}
                    type="button"
                  >
                    <Heart className="size-3.5" />
                  </button>
                </motion.div>
              )
            })}
          </div>
        ) : null}
      </LayoutGroup>
    </div>
  )
})
