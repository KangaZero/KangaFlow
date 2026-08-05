"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  GripVertical,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
} from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { AudioLinesIcon } from "@/components/animate-ui/icons/audio-lines"
import { ListIcon } from "@/components/animate-ui/icons/list"
import { OrbitIcon } from "@/components/animate-ui/icons/orbit"
import { Volume1Icon } from "@/components/animate-ui/icons/volume-1"
import { Volume2Icon } from "@/components/animate-ui/icons/volume-2"
import { VolumeOffIcon } from "@/components/animate-ui/icons/volume-off"
import { ElasticSlider } from "@/components/ElasticSlider"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { TrackList } from "@/components/widgets/track-list"
import { formatSecondsToMMSS, PLAYLIST } from "@/components/widgets/tracks"
import { SPRING_TAP, TWEEN_FAST, TWEEN_TRACK } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

const TRACK_FAVORITES_KEY = "kangaflow:trackFavorites"

function loadFavorites(): ReadonlySet<number> {
  if (typeof window === "undefined") return new Set()
  try {
    const raw: unknown = JSON.parse(
      window.localStorage.getItem(TRACK_FAVORITES_KEY) ?? "[]"
    )
    return new Set(Array.isArray(raw) ? (raw as number[]) : [])
  } catch {
    return new Set()
  }
}

export function MediaPlayer() {
  const { translate } = useLocale()
  const {
    isMediaPlayerOpen,
    setIsMediaPlayerOpen,
    envSettings,
    setEnvSettings,
  } = useGlobalStates()
  const wd = envSettings.widgetDefaults.media

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)
  const [favorites, setFavorites] = useState<ReadonlySet<number>>(loadFavorites)
  const [showList, setShowList] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const isPlayingRef = useRef(false)
  const track = PLAYLIST[currentIndex] ?? PLAYLIST[0]
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    isPlayingRef.current = isPlaying
    if (audioRef.current)
      audioRef.current.volume = Math.min(
        1,
        Math.max(
          0,
          envSettings.widgetDefaults.media.options.currentVolume / 100
        )
      )
  }, [isPlaying, envSettings.widgetDefaults.media.options.currentVolume])

  // Scrolling browser-tab title while playing; static when reducedMotion is on.
  useEffect(() => {
    if (!isPlaying) return
    const prev = document.title
    const playTitle = `♪ ${track.title} · ${track.composer}  `
    if (shouldReduceMotion) {
      document.title = playTitle.trim()
      return () => {
        document.title = prev
      }
    }
    let offset = 0
    const id = window.setInterval(() => {
      document.title = playTitle.slice(offset) + playTitle.slice(0, offset)
      offset = (offset + 1) % playTitle.length
    }, 300)
    return () => {
      window.clearInterval(id)
      document.title = prev
    }
  }, [isPlaying, track.title, track.composer, shouldReduceMotion])

  useEffect(() => setMounted(true), [])

  const hasAudio = Boolean(track.src)
  const duration = audioDuration ?? track.duration

  // Keep audio.loop in sync with isLooping so the browser's native loop behaviour
  // reflects the current setting immediately (not just on the next track end).
  // biome-ignore lint/correctness/useExhaustiveDependencies: <need to be mounted first before audioRef.current can be found>
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.loop = wd.options.isLooping
  }, [mounted, wd.options.isLooping])

  // biome-ignore lint/correctness/useExhaustiveDependencies: mounted gates the portal render; setters are stable
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => setCurrentTimeSec(Math.floor(audio.currentTime))
    // When loop is true, the browser loops natively and never fires "ended".
    // When loop is false, "ended" fires and we advance to the next track.
    const onEnded = () => {
      setCurrentTimeSec(0)
      setCurrentIndex((i) => (i + 1) % PLAYLIST.length)
    }
    const onLoadedMetadata = () =>
      setAudioDuration(
        Number.isFinite(audio.duration) ? Math.floor(audio.duration) : null
      )
    const onError = () => setAudioDuration(null)
    audio.addEventListener("timeupdate", onTimeUpdate)
    audio.addEventListener("ended", onEnded)
    audio.addEventListener("loadedmetadata", onLoadedMetadata)
    audio.addEventListener("error", onError)
    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate)
      audio.removeEventListener("ended", onEnded)
      audio.removeEventListener("loadedmetadata", onLoadedMetadata)
      audio.removeEventListener("error", onError)
    }
  }, [mounted])

  // biome-ignore lint/correctness/useExhaustiveDependencies: mounted + track.src cover all source changes; isPlayingRef/setters are stable
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !track.src) return
    setAudioDuration(null)
    setCurrentTimeSec(0)
    audio.src = track.src
    audio.load()
    if (isPlayingRef.current) void audio.play().catch(() => setIsPlaying(false))
  }, [mounted, currentIndex, track.src])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !hasAudio) return
    if (isPlaying) {
      void audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, hasAudio])

  useEffect(() => {
    if (hasAudio || !isPlaying) return
    const id = window.setInterval(() => setCurrentTimeSec((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [hasAudio, isPlaying])

  const goToIndex = (index: number): void => {
    const count = PLAYLIST.length
    setCurrentIndex(((index % count) + count) % count)
    setCurrentTimeSec(0)
  }

  const goToNext = (): void => goToIndex(currentIndex + 1)

  const toggleFavorite = useCallback((index: number): void => {
    setFavorites((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      window.localStorage.setItem(
        TRACK_FAVORITES_KEY,
        JSON.stringify([...next])
      )
      return next
    })
  }, [])

  const { favoritedIndices, restIndices } = useMemo(() => {
    const all = PLAYLIST.map((_, i) => i)
    return {
      favoritedIndices: all.filter((i) => favorites.has(i)),
      restIndices: all.filter((i) => !favorites.has(i)),
    }
  }, [favorites])

  const handleSelectTrack = useCallback((index: number): void => {
    setCurrentIndex(index)
    if (!isPlayingRef.current) setIsPlaying(true)
  }, [])

  const closeList = useCallback(() => setShowList(false), [])

  const goToPrevious = (): void => {
    if (currentTimeSec > 3) {
      setCurrentTimeSec(0)
      const audio = audioRef.current
      if (audio) audio.currentTime = 0
      return
    }
    goToIndex(currentIndex - 1)
  }

  return (
    <>
      {/* Audio always in DOM after mount so effects can set src before UI opens. */}
      {mounted
        ? createPortal(
            // biome-ignore lint/a11y/useMediaCaption: music player — no caption track applicable
            <audio className="hidden" ref={audioRef} />,
            document.body
          )
        : null}

      <DraggableWindow
        anchor={wd.anchor}
        defaultHeight={224}
        defaultOffset={wd.offset}
        defaultWidth={320}
        icon={<GripVertical aria-hidden className="size-3.5" />}
        isOpen={isMediaPlayerOpen}
        minHeight={180}
        minWidth={280}
        onClose={() => setIsMediaPlayerOpen(false)}
        storageKey="media-player"
        title={translate("mediaPlayer.nowPlaying")}
      >
        <div className="flex flex-col gap-3 p-4">
          {/* Track meta */}
          <div className="flex items-center gap-3">
            <div className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md bg-primary/10 text-primary">
              {track.coverSrc ? (
                // biome-ignore lint/performance/noImgElement: static export — next/image optimization unavailable
                <img
                  alt={`${track.title} cover`}
                  className="size-full object-cover"
                  src={track.coverSrc}
                />
              ) : (
                <AnimatePresence initial={false} mode="wait">
                  <motion.div
                    animate={{ opacity: 1, rotateY: 0 }}
                    aria-hidden
                    exit={{ opacity: 0, rotateY: -90 }}
                    initial={{ opacity: 0, rotateY: 90 }}
                    key={isPlaying ? "playing" : "paused"}
                    style={{ transformStyle: "preserve-3d" }}
                    transition={TWEEN_TRACK}
                  >
                    {isPlaying ? (
                      <AudioLinesIcon animate />
                    ) : (
                      <Music className="size-5" />
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-sm">{track.title}</p>
              <p className="truncate text-muted-foreground text-xs">
                {track.composer}
                {track.album ? ` · ${track.album}` : ""}
              </p>
            </div>

            <motion.div
              className="[anchor-name:--list-btn]"
              transition={SPRING_TAP}
              whileHover={{ scale: 1.15 }}
              whileTap={{ scale: 0.85 }}
            >
              <AnimatedTooltip
                label={translate("mediaPlayer.list")}
                side="left"
              >
                <Button
                  aria-label={translate("mediaPlayer.list")}
                  onClick={() => setShowList((v) => !v)}
                  size="icon"
                  variant={showList ? "link" : "ghost"}
                >
                  <ListIcon animateOnTap className="size-4" />
                </Button>
              </AnimatedTooltip>
            </motion.div>
          </div>

          {/* Scrubber */}
          <div className="flex flex-col gap-1.5">
            <Slider
              aria-label={translate("mediaPlayer.seek")}
              max={duration || 1}
              onValueChange={(value) => {
                const t = value[0] ?? 0
                setCurrentTimeSec(t)
                if (audioRef.current) audioRef.current.currentTime = t
              }}
              step={1}
              value={[Math.min(currentTimeSec, duration || 1)]}
            />
            <div className="flex justify-between font-mono text-[10px] text-muted-foreground tabular-nums">
              <span>{formatSecondsToMMSS(currentTimeSec)}</span>
              <span>{formatSecondsToMMSS(duration)}</span>
            </div>
          </div>

          {/* Transport controls */}
          <div className="flex items-center justify-center gap-2">
            <motion.div
              transition={SPRING_TAP}
              whileHover={{ scale: 1.15, x: -2 }}
              whileTap={{ scale: 0.85 }}
            >
              <AnimatedTooltip label={translate("mediaPlayer.loop")} side="top">
                <Button
                  aria-label={translate("mediaPlayer.loop")}
                  onClick={() => {
                    setEnvSettings({
                      ...envSettings,
                      widgetDefaults: {
                        ...envSettings.widgetDefaults,
                        media: {
                          ...envSettings.widgetDefaults.media,
                          options: {
                            ...envSettings.widgetDefaults.media.options,
                            isLooping: !wd.options.isLooping,
                          },
                        },
                      },
                    })
                  }}
                  size="icon"
                  variant={wd.options.isLooping ? "link" : "ghost"}
                >
                  <OrbitIcon
                    animate={wd.options.isLooping}
                    animateOnHover
                    className="size-4"
                  />
                </Button>
              </AnimatedTooltip>
            </motion.div>

            <motion.div
              transition={SPRING_TAP}
              whileHover={{ scale: 1.15, x: -2 }}
              whileTap={{ scale: 0.85 }}
            >
              <AnimatedTooltip
                label={
                  (
                    PLAYLIST[
                      (currentIndex - 1 + PLAYLIST.length) % PLAYLIST.length
                    ] ?? PLAYLIST[0]
                  ).title
                }
                side="top"
              >
                <Button
                  aria-label={translate("mediaPlayer.previous")}
                  onClick={() => {
                    goToPrevious()
                    if (!isPlaying) setIsPlaying(true)
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <SkipBack className="size-5" />
                </Button>
              </AnimatedTooltip>
            </motion.div>

            <motion.div
              transition={SPRING_TAP}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.85 }}
            >
              <Button
                aria-label={translate(
                  isPlaying ? "mediaPlayer.pause" : "mediaPlayer.play"
                )}
                className="relative size-11 rounded-full"
                onClick={() => setIsPlaying((p) => !p)}
                size="icon"
              >
                {/* Breathing sonar: 3 rings expand+fade with staggered delays */}
                {isPlaying
                  ? [0, 0.5, 1.0].map((delay) => (
                      <motion.span
                        animate={{ opacity: [0.55, 0], scale: [1, 1.8] }}
                        aria-hidden
                        className="absolute inset-0 rounded-full border border-primary-foreground/40"
                        key={delay}
                        transition={{
                          delay,
                          duration: 1.5,
                          ease: "easeOut",
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      />
                    ))
                  : null}
                <AnimatePresence initial={false} mode="wait">
                  <motion.span
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    initial={{ opacity: 0, scale: 0.6 }}
                    key={isPlaying ? "pause" : "play"}
                    transition={TWEEN_FAST}
                  >
                    {isPlaying ? (
                      <Pause className="size-5" />
                    ) : (
                      <Play className="size-5" />
                    )}
                  </motion.span>
                </AnimatePresence>
              </Button>
            </motion.div>

            <motion.div
              transition={SPRING_TAP}
              whileHover={{ scale: 1.15, x: 2 }}
              whileTap={{ scale: 0.85 }}
            >
              <AnimatedTooltip
                label={
                  PLAYLIST[(currentIndex + 1) % PLAYLIST.length]?.title ??
                  PLAYLIST[0].title
                }
                side="top"
              >
                <Button
                  aria-label={translate("mediaPlayer.next")}
                  onClick={() => {
                    goToNext()
                    if (!isPlaying) setIsPlaying(true)
                  }}
                  size="icon"
                  variant="ghost"
                >
                  <SkipForward className="size-5" />
                </Button>
              </AnimatedTooltip>
            </motion.div>
            <Popover>
              <PopoverTrigger>
                <motion.div
                  transition={SPRING_TAP}
                  whileHover={{ scale: 1.15, x: -2 }}
                  whileTap={{ scale: 0.85 }}
                >
                  <AnimatedTooltip
                    label={translate("mediaPlayer.volume")}
                    side="top"
                  >
                    <Button
                      aria-label={translate("mediaPlayer.volume")}
                      onClick={() => {}}
                      size="icon"
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
                            <VolumeOffIcon animateOnHover className="size-4" />
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
                            <Volume1Icon animateOnHover className="size-4" />
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
                            <Volume2Icon animateOnHover className="size-4" />
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </Button>
                  </AnimatedTooltip>
                </motion.div>
              </PopoverTrigger>
              <PopoverContent>
                <div className="bg-none px-3.5">
                  <ElasticSlider
                    isStepped={false}
                    maxValue={100}
                    // TODO: Consider using immer to make life easier
                    setValue={(value) => {
                      setEnvSettings({
                        ...envSettings,
                        widgetDefaults: {
                          ...envSettings.widgetDefaults,
                          media: {
                            ...envSettings.widgetDefaults.media,
                            options: {
                              ...envSettings.widgetDefaults.media.options,
                              currentVolume: value,
                            },
                          },
                        },
                      })
                    }}
                    startingValue={0}
                    value={wd.options.currentVolume}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </DraggableWindow>

      <TrackList
        currentIndex={currentIndex}
        favoritedIndices={favoritedIndices}
        isOpen={showList}
        onClose={closeList}
        onSelect={handleSelectTrack}
        onToggleFavorite={toggleFavorite}
        restIndices={restIndices}
      />
    </>
  )
}
