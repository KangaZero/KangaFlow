"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Bar media control ("expand on hover"): a compact capsule — album art inside a
// progress ring, plus the track title — that widens on hover or keyboard focus
// to reveal prev / play-pause / next / volume (and loop + track list). When
// nothing has been played yet it shows a disabled "Nothing playing" capsule
// instead of disappearing, so the bar layout never jumps.

import { Music, SkipBack, SkipForward } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import type * as React from "react"
import { useCallback, useState } from "react"
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
import { BarTooltip, barTooltipSide } from "@/components/niri/bar-tooltip"
import type { BorderRadius } from "@/components/niri/settings"
import { PLAYLIST } from "@/components/widgets/tracks"
import { SPRING_PILL, TWEEN_FAST } from "@/lib/motion"
import { trackProgress } from "@/lib/niri-bar"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

type MiniPillProps = {
  barPosition: "bottom" | "left" | "right" | "top"
  barRadius: BorderRadius
  vertical?: boolean
}

// Play ↔ pause as ONE path that morphs: both shapes use the same commands
// (two 4-point sub-paths), so Motion can interpolate `d` point by point.
const PLAY_PATH = "M8 5 L8 19 L19 12 L19 12 Z M8 5 L8 5 L8 5 L8 5 Z"
const PAUSE_PATH =
  "M7 5 L7 19 L10.5 19 L10.5 5 Z M13.5 5 L13.5 19 L17 19 L17 5 Z"

const RING_RADIUS = 10
const RING_LENGTH = 2 * Math.PI * RING_RADIUS

// Transport button: 24px hit target, quiet hover, pressed scale, focus ring.
const TRANSPORT =
  "text-foreground/85 hover:bg-foreground/9 hover:text-foreground focus-visible:ring-primary inline-grid size-6 shrink-0 cursor-pointer place-items-center rounded-[7px] transition-[background-color,color,transform] duration-150 outline-none focus-visible:ring-2 active:scale-90 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-3"

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
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  const wd = envSettings.widgetDefaults.media
  const track = PLAYLIST[mediaCurrentIndex] ?? PLAYLIST[0]
  const isLooping = wd.options.isLooping
  const currentDuration = wd.options.currentDuration
  // Once something has played this session the control stays usable when
  // paused (currentDuration is only persisted by the player later, so relying
  // on it alone would flip a paused pill back to "Nothing playing").
  const [hasPlayed, setHasPlayed] = useState(isMediaPlayerPlaying)
  if (isMediaPlayerPlaying && !hasPlayed) setHasPlayed(true)
  const hasMedia = isMediaPlayerPlaying || currentDuration > 0 || hasPlayed
  const expanded = hasMedia && (hovered || focused)
  const progress = trackProgress(currentDuration, track.duration)
  const count = PLAYLIST.length
  const tipSide = barTooltipSide(barPosition)
  const volume = wd.options.currentVolume

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

  const VolumeIcon =
    volume <= 0 ? VolumeOffIcon : volume < 70 ? Volume1Icon : Volume2Icon
  const volumeKey = volume <= 0 ? "mute" : volume < 70 ? "low" : "high"

  // Disabled capsule: same footprint, so the bar never reflows when playback
  // starts. Nothing to control yet, so it is not focusable.
  if (!hasMedia) {
    return (
      <div
        className={cn(
          // foreground/80, not muted: muted text on the translucent bar glass
          // fell under AA over light wallpapers.
          "bg-foreground/6 text-foreground/80 flex items-center gap-1.5",
          vertical ? "flex-col px-0.5 py-1" : "h-7.5 pr-2.5 pl-1"
        )}
        style={{ borderRadius: `${Math.max(barRadius - 3, 6)}px` }}
      >
        <span className="bg-foreground/10 grid size-6 place-items-center rounded-full">
          <Music aria-hidden className="size-3" />
        </span>
        {vertical ? (
          <span className="sr-only">
            {translate("mediaPlayer.nothingPlaying")}
          </span>
        ) : (
          <span className="text-[0.6875rem]">
            {translate("mediaPlayer.nothingPlaying")}
          </span>
        )}
      </div>
    )
  }

  return (
    <motion.div
      aria-label={`${translate("mediaPlayer.nowPlaying")}: ${track.title}`}
      className={cn(
        "bg-foreground/6 hover:bg-foreground/9 text-foreground focus-visible:ring-primary flex items-center gap-1.5 transition-colors outline-none focus-visible:ring-2",
        vertical ? "flex-col px-0.5 py-1" : "h-7.5 pr-2 pl-1"
      )}
      layout
      onBlur={(event) => {
        // Collapse only once focus leaves the whole control (focus-within).
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false)
        }
      }}
      onFocus={(event) => {
        // Keyboard focus only: a mouse click also focuses the button, which
        // would otherwise keep the capsule open after the pointer leaves.
        if (event.target.matches(":focus-visible")) setFocused(true)
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      role="group"
      style={{ borderRadius: `${Math.max(barRadius - 3, 6)}px` }}
      // Focusable so keyboard users can open it: focusing the capsule reveals
      // the transport, and the next Tab moves into those buttons.
      tabIndex={0}
      transition={SPRING_PILL}
    >
      {/* Art inside a progress ring; mini equaliser while playing. */}
      <motion.span
        className="relative grid size-6 shrink-0 place-items-center"
        layout="position"
      >
        <svg
          aria-hidden
          className="absolute inset-0 -rotate-90"
          viewBox="0 0 24 24"
        >
          <circle
            className="stroke-foreground/12"
            cx="12"
            cy="12"
            fill="none"
            r={RING_RADIUS}
            strokeWidth="2"
          />
          <circle
            className="stroke-primary-ink transition-[stroke-dashoffset] duration-500"
            cx="12"
            cy="12"
            fill="none"
            r={RING_RADIUS}
            strokeDasharray={RING_LENGTH}
            strokeDashoffset={RING_LENGTH * (1 - progress)}
            strokeLinecap="round"
            strokeWidth="2"
          />
        </svg>
        <span
          aria-hidden
          className="from-primary to-primary/40 relative flex size-4.5 items-end justify-center gap-[1.5px] overflow-hidden rounded-full bg-linear-to-br pb-1"
          style={
            track.coverSrc
              ? {
                  backgroundImage: `url(${track.coverSrc})`,
                  backgroundSize: "cover",
                }
              : undefined
          }
        >
          {[0, 1, 2].map((bar) => (
            <motion.i
              animate={
                isMediaPlayerPlaying && !shouldReduceMotion
                  ? { scaleY: [0.35, 1, 0.35] }
                  : { scaleY: 0.35 }
              }
              className="bg-primary-foreground block h-2 w-[1.5px] origin-bottom rounded-[1px]"
              key={bar}
              transition={
                isMediaPlayerPlaying && !shouldReduceMotion
                  ? {
                      delay: bar * 0.18,
                      duration: 0.8,
                      ease: "easeInOut",
                      repeat: Number.POSITIVE_INFINITY,
                    }
                  : { duration: 0.2 }
              }
            />
          ))}
        </span>
      </motion.span>

      {/* Title: marquee while playing (edge-faded), static truncate when paused. */}
      {vertical ? null : (
        <motion.div
          className="max-w-30 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_6%,black_88%,transparent)]"
          layout="position"
        >
          <AnimatePresence initial={false} mode="wait">
            {isMediaPlayerPlaying && !shouldReduceMotion ? (
              <motion.div
                animate={{ x: [0, "-50%"] }}
                className="flex text-[0.6875rem] font-medium whitespace-nowrap"
                key={`marquee-${track.title}`}
                transition={{
                  x: {
                    duration: 10,
                    ease: "linear",
                    repeat: Number.POSITIVE_INFINITY,
                    repeatType: "loop",
                  },
                }}
              >
                <span className="shrink-0 pr-7">{track.title}</span>
                <span aria-hidden className="shrink-0 pr-7">
                  {track.title}
                </span>
              </motion.div>
            ) : (
              <motion.span
                animate={{ opacity: 1 }}
                className="block truncate text-[0.6875rem] font-medium"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                key="static"
                transition={TWEEN_FAST}
              >
                {track.title}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Transport: revealed on hover / keyboard focus. */}
      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            animate={{ opacity: 1 }}
            className={cn("flex items-center gap-px", vertical && "flex-col")}
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="transport"
            layout="position"
            transition={TWEEN_FAST}
          >
            <BarTooltip
              label={translate("mediaPlayer.previous")}
              side={tipSide}
            >
              <button
                aria-label={translate("mediaPlayer.previous")}
                className={TRANSPORT}
                onClick={() => {
                  setMediaCurrentIndex((i) => (i - 1 + count) % count)
                  setIsMediaPlayerPlaying(true)
                }}
                type="button"
              >
                <SkipBack />
              </button>
            </BarTooltip>
            <button
              aria-label={translate(
                isMediaPlayerPlaying ? "mediaPlayer.pause" : "mediaPlayer.play"
              )}
              className={cn(TRANSPORT, "rounded-full")}
              onClick={() => setIsMediaPlayerPlaying((v) => !v)}
              type="button"
            >
              <svg aria-hidden className="size-3" viewBox="0 0 24 24">
                <motion.path
                  animate={{ d: isMediaPlayerPlaying ? PAUSE_PATH : PLAY_PATH }}
                  d={isMediaPlayerPlaying ? PAUSE_PATH : PLAY_PATH}
                  fill="currentColor"
                  initial={false}
                  transition={SPRING_PILL}
                />
              </svg>
            </button>
            <BarTooltip label={translate("mediaPlayer.next")} side={tipSide}>
              <button
                aria-label={translate("mediaPlayer.next")}
                className={TRANSPORT}
                onClick={() => {
                  setMediaCurrentIndex((i) => (i + 1) % count)
                  setIsMediaPlayerPlaying(true)
                }}
                type="button"
              >
                <SkipForward />
              </button>
            </BarTooltip>
            {/* Vertical bars have little room along the edge: transport only;
                volume, loop and the track list stay in the media widget. */}
            {vertical ? null : (
              <>
                <Popover>
                  <BarTooltip
                    label={translate("mediaPlayer.volume")}
                    side={tipSide}
                  >
                    <PopoverTrigger asChild>
                      <button
                        aria-label={translate("mediaPlayer.volume")}
                        className={TRANSPORT}
                        type="button"
                      >
                        <AnimatePresence initial={false} mode="wait">
                          <motion.span
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex"
                            exit={{ opacity: 0.5, scale: 0.6 }}
                            initial={{ opacity: 0.5, scale: 0.6 }}
                            key={volumeKey}
                            transition={TWEEN_FAST}
                          >
                            <VolumeIcon animateOnHover className="size-3" />
                          </motion.span>
                        </AnimatePresence>
                      </button>
                    </PopoverTrigger>
                  </BarTooltip>
                  <PopoverContent side={tipSide}>
                    <div className="px-3.5">
                      <ElasticSlider
                        isStepped={false}
                        maxValue={100}
                        setValue={setVolume}
                        startingValue={0}
                        value={volume}
                      />
                    </div>
                  </PopoverContent>
                </Popover>
                <span
                  aria-hidden
                  className={cn(
                    "bg-foreground/12 mx-0.5 shrink-0",
                    vertical ? "my-0.5 h-px w-3" : "h-3 w-px"
                  )}
                />
                <BarTooltip
                  label={translate("mediaPlayer.loop")}
                  side={tipSide}
                >
                  <button
                    aria-label={translate("mediaPlayer.loop")}
                    aria-pressed={isLooping}
                    className={cn(TRANSPORT, isLooping && "text-primary-ink")}
                    onClick={toggleLoop}
                    type="button"
                  >
                    <OrbitIcon
                      animate={isLooping}
                      animateOnHover
                      className="size-3"
                    />
                  </button>
                </BarTooltip>
                <BarTooltip
                  label={translate("mediaPlayer.list")}
                  side={tipSide}
                >
                  <button
                    aria-label={translate("mediaPlayer.list")}
                    aria-pressed={isTrackListOpen}
                    className={cn(
                      TRANSPORT,
                      isTrackListOpen && "text-primary-ink"
                    )}
                    onClick={() => setIsTrackListOpen((v) => !v)}
                    type="button"
                  >
                    <ListIcon animateOnTap className="size-3" />
                  </button>
                </BarTooltip>
              </>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}
