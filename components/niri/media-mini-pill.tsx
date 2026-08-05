"use client"

import { Pause, Play, SkipBack, SkipForward } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import type * as React from "react"
import { useCallback } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { ListIcon } from "@/components/animate-ui/icons/list"
import { OrbitIcon } from "@/components/animate-ui/icons/orbit"
import { Volume1Icon } from "@/components/animate-ui/icons/volume-1"
import { Volume2Icon } from "@/components/animate-ui/icons/volume-2"
import { VolumeOffIcon } from "@/components/animate-ui/icons/volume-off"
import { ElasticSlider } from "@/components/ElasticSlider"
import type { BorderRadius } from "@/components/niri/settings"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import { PLAYLIST } from "@/components/widgets/tracks"
import { TWEEN_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

type MiniPillProps = {
  barPosition: "bottom" | "left" | "right" | "top"
  barRadius: BorderRadius
  vertical?: boolean
}

export function MediaMiniPill({
  barPosition,
  barRadius,
  vertical = false,
}: MiniPillProps): React.JSX.Element {
  const {
    envSettings,
    isMediaPlayerPlaying,
    isTrackListOpen,
    mediaCurrentIndex,
    setEnvSettings,
    setIsMediaPlayerPlaying,
    setIsTrackListOpen,
    setMediaCurrentIndex,
  } = useGlobalStates()
  const { translate } = useLocale()

  const shouldReduceMotion = useReducedMotion()
  const wd = envSettings.widgetDefaults.media
  const track = PLAYLIST[mediaCurrentIndex] ?? PLAYLIST[0]
  const isLooping = wd.options.isLooping
  const currentDuration = wd.options.currentDuration
  const isVisible = isMediaPlayerPlaying || currentDuration > 0

  const count = PLAYLIST.length
  const tooltipSide =
    barPosition === "bottom"
      ? "top"
      : barPosition === "top"
        ? "bottom"
        : barPosition === "left"
          ? "right"
          : "left"

  const toggleLoop = useCallback(() => {
    setEnvSettings((prev) => ({
      ...prev,
      widgetDefaults: {
        ...prev.widgetDefaults,
        media: {
          ...prev.widgetDefaults.media,
          options: {
            ...prev.widgetDefaults.media.options,
            isLooping: !prev.widgetDefaults.media.options.isLooping,
          },
        },
      },
    }))
  }, [setEnvSettings])

  const setVolume = useCallback(
    (value: number) => {
      setEnvSettings((prev) => ({
        ...prev,
        widgetDefaults: {
          ...prev.widgetDefaults,
          media: {
            ...prev.widgetDefaults.media,
            options: {
              ...prev.widgetDefaults.media.options,
              currentVolume: value,
            },
          },
        },
      }))
    },
    [setEnvSettings]
  )

  return (
    <AnimatePresence>
      {isVisible ? (
        <motion.div
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "flex items-center gap-0.5 overflow-hidden border border-border/50 bg-card/80 px-1.5 py-0.5 backdrop-blur",
            vertical && "flex-col"
          )}
          exit={{ opacity: 0, scale: 0 }}
          initial={{ opacity: 0, scale: 0 }}
          style={{ borderRadius: `${barRadius}px` }}
          transition={{ duration: 0.25, ease: "easeOut", type: "tween" }}
        >
          {/* Track title: marquee while playing, truncated static when paused */}
          <div
            className={cn("overflow-hidden", vertical ? "hidden" : "max-w-24")}
          >
            <AnimatePresence initial={false} mode="wait">
              {isMediaPlayerPlaying && !shouldReduceMotion ? (
                <motion.div
                  animate={vertical ? { y: [0, "-50%"] } : { x: [0, "-50%"] }}
                  className={cn(
                    "flex text-[10px] text-foreground",
                    vertical ? "flex-col" : ""
                  )}
                  exit={{ opacity: 1 }}
                  initial={{ opacity: 1 }}
                  key={`marquee-${track.title}`}
                  transition={{
                    opacity: { duration: 0.1 },
                    x: {
                      duration: 8,
                      ease: "linear",
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "loop",
                    },
                    y: {
                      duration: 8,
                      ease: "linear",
                      repeat: Number.POSITIVE_INFINITY,
                      repeatType: "loop",
                    },
                  }}
                >
                  <span className="shrink-0 pr-6">{track.title}</span>
                  <span aria-hidden className="shrink-0 pr-6">
                    {track.title}
                  </span>
                </motion.div>
              ) : (
                <motion.span
                  animate={{ opacity: 1 }}
                  className={cn(
                    "block truncate text-[10px] text-foreground",
                    vertical && "[writing-mode:vertical-rl]"
                  )}
                  exit={{ opacity: 0 }}
                  initial={{ opacity: 0 }}
                  key="static"
                  transition={{ duration: 0.1 }}
                >
                  {track.title}
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Divider */}
          <div
            className={cn(
              "shrink-0 bg-border/50",
              vertical ? "h-px w-3" : "h-3 w-px"
            )}
          />

          {/* Previous */}
          <AnimatedTooltip
            label={translate("mediaPlayer.previous")}
            side={tooltipSide}
          >
            <Button
              aria-label={translate("mediaPlayer.previous")}
              onClick={() => {
                setMediaCurrentIndex((i) => (i - 1 + count) % count)
                setIsMediaPlayerPlaying(true)
              }}
              size="icon-sm"
              variant="ghost"
            >
              <SkipBack className="size-3" />
            </Button>
          </AnimatedTooltip>

          {/* Play / Pause */}
          <Button
            aria-label={translate(
              isMediaPlayerPlaying ? "mediaPlayer.pause" : "mediaPlayer.play"
            )}
            onClick={() => setIsMediaPlayerPlaying((v) => !v)}
            size="icon-sm"
            variant="ghost"
          >
            <AnimatePresence initial={false} mode="wait">
              <motion.span
                animate={{ opacity: 1, scale: 1 }}
                className="flex"
                exit={{ opacity: 0, scale: 0.6 }}
                initial={{ opacity: 0, scale: 0.6 }}
                key={isMediaPlayerPlaying ? "pause" : "play"}
                transition={TWEEN_FAST}
              >
                {isMediaPlayerPlaying ? (
                  <Pause className="size-3" />
                ) : (
                  <Play className="size-3" />
                )}
              </motion.span>
            </AnimatePresence>
          </Button>

          {/* Next */}
          <AnimatedTooltip
            label={translate("mediaPlayer.next")}
            side={tooltipSide}
          >
            <Button
              aria-label={translate("mediaPlayer.next")}
              onClick={() => {
                setMediaCurrentIndex((i) => (i + 1) % count)
                setIsMediaPlayerPlaying(true)
              }}
              size="icon-sm"
              variant="ghost"
            >
              <SkipForward className="size-3" />
            </Button>
          </AnimatedTooltip>

          {/* Loop */}
          <AnimatedTooltip
            label={translate("mediaPlayer.loop")}
            side={tooltipSide}
          >
            <Button
              aria-label={translate("mediaPlayer.loop")}
              onClick={toggleLoop}
              size="icon-sm"
              variant={isLooping ? "link" : "ghost"}
            >
              <OrbitIcon
                animate={isLooping}
                animateOnHover
                className="size-3"
              />
            </Button>
          </AnimatedTooltip>

          {/* Track list toggle */}
          <AnimatedTooltip
            label={translate("mediaPlayer.list")}
            side={tooltipSide}
          >
            <Button
              aria-label={translate("mediaPlayer.list")}
              onClick={() => setIsTrackListOpen((v) => !v)}
              size="icon-sm"
              variant={isTrackListOpen ? "link" : "ghost"}
            >
              <ListIcon animateOnTap className="size-3" />
            </Button>
          </AnimatedTooltip>

          {/* Volume */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                aria-label={translate("mediaPlayer.volume")}
                size="icon-sm"
                variant="ghost"
              >
                <AnimatePresence mode="wait">
                  {wd.options.currentVolume <= 0 ? (
                    <motion.span
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex"
                      exit={{ opacity: 0.5, scale: 0.6 }}
                      initial={{ opacity: 0.5, scale: 0.6 }}
                      key="mute"
                      transition={TWEEN_FAST}
                    >
                      <VolumeOffIcon animateOnHover className="size-3" />
                    </motion.span>
                  ) : wd.options.currentVolume < 70 ? (
                    <motion.span
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex"
                      exit={{ opacity: 0.5, scale: 0.6 }}
                      initial={{ opacity: 0.5, scale: 0.6 }}
                      key="low"
                      transition={TWEEN_FAST}
                    >
                      <Volume1Icon animateOnHover className="size-3" />
                    </motion.span>
                  ) : (
                    <motion.span
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex"
                      exit={{ opacity: 0.5, scale: 0.6 }}
                      initial={{ opacity: 0.5, scale: 0.6 }}
                      key="high"
                      transition={TWEEN_FAST}
                    >
                      <Volume2Icon animateOnHover className="size-3" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </PopoverTrigger>
            <PopoverContent side={tooltipSide}>
              <div className="px-3.5">
                <ElasticSlider
                  isStepped={false}
                  maxValue={100}
                  setValue={setVolume}
                  startingValue={0}
                  value={wd.options.currentVolume}
                />
              </div>
            </PopoverContent>
          </Popover>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
