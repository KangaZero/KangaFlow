"use client"

import { Heart, List } from "lucide-react"
import { LayoutGroup, motion } from "motion/react"
import type * as React from "react"
import { memo } from "react"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { formatSecondsToMMSS, PLAYLIST } from "@/components/widgets/tracks"
import { SPRING_PILL, SPRING_REORDER } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

type TrackListProps = {
  isOpen: boolean
  onClose: () => void
  currentIndex: number
  favoritedIndices: readonly number[]
  restIndices: readonly number[]
  onSelect: (index: number) => void
  onToggleFavorite: (index: number) => void
}

export const TrackList = memo(function TrackList({
  currentIndex,
  favoritedIndices,
  isOpen,
  onClose,
  onSelect,
  onToggleFavorite,
  restIndices,
}: TrackListProps): React.JSX.Element {
  const { translate } = useLocale()

  return (
    <DraggableWindow
      defaultHeight={300}
      defaultWidth={280}
      icon={<List aria-hidden className="size-3.5" />}
      isOpen={isOpen}
      minHeight={200}
      minWidth={240}
      onClose={onClose}
      positionClassName="bottom-4 right-96"
      storageKey="media-player-list"
      title={translate("mediaPlayer.list")}
    >
      <div className="no-scrollbar p-1.5">
        <LayoutGroup>
          {favoritedIndices.length > 0 ? (
            <div>
              <p className="px-2.5 py-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                {translate("mediaPlayer.favorites")}
              </p>
              {favoritedIndices.map((i) => {
                const t = PLAYLIST[i] ?? PLAYLIST[0]
                const isActive = currentIndex === i
                const trackId = `track-${i}`
                return (
                  <motion.div
                    className={cn(
                      "group relative flex items-center rounded-lg",
                      isActive
                        ? "text-primary-foreground"
                        : "text-foreground hover:bg-muted/60"
                    )}
                    key={trackId}
                    layout
                    layoutId={trackId}
                    transition={SPRING_REORDER}
                  >
                    {isActive ? (
                      <motion.span
                        className="absolute inset-0 rounded-lg bg-primary"
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
                          <span className="truncate font-medium text-sm">
                            {t.title}
                          </span>
                          <span
                            className={cn(
                              "ml-auto shrink-0 font-mono text-[10px] tabular-nums",
                              isActive
                                ? "text-primary-foreground/70"
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
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {t.composer}
                        </span>
                        <span
                          className={cn(
                            "truncate text-xs",
                            isActive
                              ? "text-primary-foreground/80"
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
                          ? "text-primary-foreground/70 hover:text-primary-foreground"
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
                  ? "mt-1 border-border/40 border-t pt-1"
                  : ""
              }
            >
              {favoritedIndices.length > 0 ? (
                <p className="px-2.5 py-1 font-medium text-[10px] text-muted-foreground uppercase tracking-wide">
                  {translate("mediaPlayer.allTracks")}
                </p>
              ) : null}
              {restIndices.map((i) => {
                const t = PLAYLIST[i] ?? PLAYLIST[0]
                const isActive = currentIndex === i
                const trackId = `track-${i}`
                return (
                  <motion.div
                    className={cn(
                      "group relative flex items-center rounded-lg",
                      isActive
                        ? "text-primary-foreground"
                        : "text-foreground hover:bg-muted/60"
                    )}
                    key={trackId}
                    layout
                    layoutId={trackId}
                    transition={SPRING_REORDER}
                  >
                    {isActive ? (
                      <motion.span
                        className="absolute inset-0 rounded-lg bg-primary"
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
                          <span className="truncate font-medium text-sm">
                            {t.title}
                          </span>
                          <span
                            className={cn(
                              "ml-auto shrink-0 font-mono text-[10px] tabular-nums",
                              isActive
                                ? "text-primary-foreground/70"
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
                              ? "text-primary-foreground/80"
                              : "text-muted-foreground"
                          )}
                        >
                          {t.composer}
                        </span>
                        <span
                          className={cn(
                            "truncate text-xs",
                            isActive
                              ? "text-primary-foreground/80"
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
                          ? "text-primary-foreground/70 hover:text-primary-foreground"
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
    </DraggableWindow>
  )
})
