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
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover"
import { AudioLinesIcon } from "@/components/animate-ui/icons/audio-lines"
import { OrbitIcon } from "@/components/animate-ui/icons/orbit"
import { Volume1Icon } from "@/components/animate-ui/icons/volume-1"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { DraggableWindow } from "@/components/widgets/draggable-window"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"
import ElasticSlider from "../ElasticSlider"

// Full track descriptor. `src` drives the <audio> element; if absent the player
// falls back to a simulated clock so the UI works before files are downloaded.
// Drop MP3s into public/tracks/ then fill in `src: "/KangaFlow/tracks/file.mp3"`.
export type Track = {
  title: string
  composer: string
  artist?: string
  duration: number // seconds — used as slider range fallback before metadata loads
  src?: string // URL served by Next.js static export, e.g. "/KangaFlow/tracks/..."
  album?: string
  year?: number
  genre?: string
  coverSrc?: string // URL to album-art image (square, 200×200+ recommended)
  accentColor?: string // dominant hex/oklch colour for optional player tint
}

type Minutes = number & { _brand: "minutes" }
type Seconds = number & { _brand: "seconds" }

// Non-empty tuple so PLAYLIST[0] is always Track (satisfies noUncheckedIndexedAccess).
// Add more tracks: nix run nixpkgs#yt-dlp -- -x --audio-format mp3 --audio-quality 0 \
//   -o "public/tracks/%(id)s.%(ext)s" "<youtube-url>"
//   Get the duration via nix run nixpkgs#yt-dlp -- --print duration "<youtube-url>"
// To slice and take a particular section in seconds --download-sections "*0-203"
export const PLAYLIST: readonly [Track, ...Track[]] = [
  {
    composer: "Wizet / Nexon",
    duration: 377,
    genre: "Game OST",
    src: "/tracks/maplestory-intro.mp3",
    title: "MapleStory — Intro Theme",
  },
  {
    composer: "Sergei Bortkiewicz",
    duration: 375,
    genre: "Classical",
    src: "/tracks/bortkiewicz-op24-1.mp3",
    title: "Nocturne (Diana), Op.24/1",
  },
  {
    artist: "Nikolai Lvovich Lugansky",
    composer: "Nikolai Girshevich Kapustin",
    duration: 203,
    genre: "Jazz/Classical",
    src: "/tracks/kapustin-eight-concert-etudes-op40-7.mp3",
    title: "Eight Concert Etudes, Op.40/7",
  },
  {
    artist: "Yunchan Lim",
    composer: "Fryderyk Franciszek Chopin",
    duration: 135,
    genre: "Classical",
    src: "/tracks/chopin-op-10-10.mp3",
    title: "Etude (A Flat Major), Op.10/10",
  },
]

// Format a whole-second count as m:ss (e.g. 258 → "4:18"). Pure + exported so it
// can be unit-tested independently of the component.
export function formatSecondsToMMSS(
  totalSeconds: number
): `${Minutes}:${Seconds}` {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60) as Minutes
  const seconds = (safe % 60) as Seconds
  return `${minutes}:${seconds.toString().padStart(2, "0") as `${Seconds}`}`
}

// Springy press/hover feedback shared by the transport buttons.
const TAP_SPRING = { damping: 18, stiffness: 500, type: "spring" } as const

export function MediaPlayer() {
  const { translate } = useLocale()
  const { isMediaPlayerOpen, setIsMediaPlayerOpen, envSettings } =
    useGlobalStates()
  const wd = envSettings.widgetDefaults.media

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  const [audioDuration, setAudioDuration] = useState<number | null>(null)
  const [mounted, setMounted] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const isPlayingRef = useRef(false)
  const track = PLAYLIST[currentIndex] ?? PLAYLIST[0]
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // Scrolling browser-tab title while playing; static when reducedMotion is on.
  useEffect(() => {
    if (!isPlaying) return
    const prev = document.title
    const playTitle = `♪ ${track.title} · ${track.artist}  `
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
  }, [isPlaying, track.title, track.artist, shouldReduceMotion])

  useEffect(() => setMounted(true), [])

  const hasAudio = Boolean(track.src)
  const duration = audioDuration ?? track.duration

  // biome-ignore lint/correctness/useExhaustiveDependencies: mounted gates the portal render; setters are stable
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTimeUpdate = () => setCurrentTimeSec(Math.floor(audio.currentTime))
    const onEnded = () => {
      setCurrentIndex((i) => (i + 1) % PLAYLIST.length)
      setCurrentTimeSec(0)
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

  useEffect(() => {
    if (hasAudio || !isPlaying || currentTimeSec < duration) return
    setCurrentIndex((i) => (i + 1) % PLAYLIST.length)
    setCurrentTimeSec(0)
  }, [hasAudio, isPlaying, currentTimeSec, duration])

  const goToIndex = (index: number): void => {
    const count = PLAYLIST.length
    setCurrentIndex(((index % count) + count) % count)
    setCurrentTimeSec(0)
  }

  const goToNext = (): void => goToIndex(currentIndex + 1)

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
                    transition={{ duration: 0.3, ease: "easeOut" }}
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
              transition={TAP_SPRING}
              whileHover={{ scale: 1.15, x: -2 }}
              whileTap={{ scale: 0.85 }}
            >
              <AnimatedTooltip label={translate("mediaPlayer.loop")} side="top">
                <Button
                  aria-label={translate("mediaPlayer.loop")}
                  onClick={() => {}}
                  size="icon"
                  variant="ghost"
                >
                  <OrbitIcon animateOnHover className="size-4" />
                </Button>
              </AnimatedTooltip>
            </motion.div>

            <motion.div
              transition={TAP_SPRING}
              whileHover={{ scale: 1.15, x: -2 }}
              whileTap={{ scale: 0.85 }}
            >
              <AnimatedTooltip
                label={
                  (
                    PLAYLIST[
                      (currentIndex - 1 + PLAYLIST.length) % PLAYLIST.length
                    ] as Track
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
              transition={TAP_SPRING}
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
                    transition={{ duration: 0.12 }}
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
              transition={TAP_SPRING}
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
                  transition={TAP_SPRING}
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
                      <Volume1Icon animateOnHover className="size-4" />
                    </Button>
                  </AnimatedTooltip>
                </motion.div>
              </PopoverTrigger>
              <PopoverContent>
                <div className="bg-none px-3.5">
                  <ElasticSlider
                    isStepped={false}
                    maxValue={100}
                    startingValue={0}
                  />
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </DraggableWindow>
    </>
  )
}
