"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  GripVertical,
  Music,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from "lucide-react"
import {
  AnimatePresence,
  motion,
  useDragControls,
  useReducedMotion,
} from "motion/react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { GLASS_SURFACE } from "@/components/niri/glass"
import { AnimatedTooltip } from "@/components/ui/animated-tooltip"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// Full track descriptor. `src` drives the <audio> element; if absent the player
// falls back to a simulated clock so the UI works before files are downloaded.
// Drop MP3s into public/tracks/ then fill in `src: "/KangaFlow/tracks/file.mp3"`.
export type Track = {
  title: string
  artist: string
  duration: number // seconds — used as slider range fallback before metadata loads
  src?: string // URL served by Next.js static export, e.g. "/KangaFlow/tracks/..."
  album?: string
  year?: number
  genre?: string
  coverSrc?: string // URL to album-art image (square, 200×200+ recommended)
  accentColor?: string // dominant hex/oklch colour for optional player tint
}

// Non-empty tuple so PLAYLIST[0] is always Track (satisfies noUncheckedIndexedAccess).
// Add more tracks: nix run nixpkgs#yt-dlp -- -x --audio-format mp3 --audio-quality 0 \
//   -o "public/tracks/%(id)s.%(ext)s" "<youtube-url>"
const PLAYLIST: readonly [Track, ...Track[]] = [
  {
    artist: "Wizet / Nexon",
    duration: 377,
    genre: "Game OST",
    src: "/tracks/maplestory-intro.mp3",
    title: "MapleStory — Intro Theme",
  },
  {
    artist: "Sergei Bortkiewicz",
    duration: 375,
    genre: "Classical",
    src: "/tracks/bortkiewicz-op24-1.mp3",
    title: "Nocturne (Diana), Op. 24/1",
  },
]

// Format a whole-second count as m:ss (e.g. 258 → "4:18"). Pure + exported so it
// can be unit-tested independently of the component.
export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

// Springy press/hover feedback shared by the transport buttons.
const TAP_SPRING = { damping: 18, stiffness: 500, type: "spring" } as const

// Animated equalizer bars shown while playing — purely decorative "now playing"
// affordance. Motion loops each bar's height on its own offset.
function EqualizerBars() {
  return (
    <div aria-hidden className="flex items-end gap-0.5">
      {[0, 1, 2].map((bar) => (
        <motion.span
          animate={{ height: ["30%", "100%", "50%", "90%", "30%"] }}
          className="w-0.5 rounded-full bg-primary"
          key={bar}
          style={{ height: "30%" }}
          transition={{
            delay: bar * 0.15,
            duration: 0.9,
            ease: "easeInOut",
            repeat: Number.POSITIVE_INFINITY,
          }}
        />
      ))}
    </div>
  )
}

export function MediaPlayer() {
  const { translate } = useLocale()
  const { isMediaPlayerOpen, setIsMediaPlayerOpen, envSettings } =
    useGlobalStates()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)
  // Actual duration from audio metadata; overrides the static Track.duration when loaded.
  const [audioDuration, setAudioDuration] = useState<number | null>(null)

  const [mounted, setMounted] = useState(false)
  const constraintsRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()
  const audioRef = useRef<HTMLAudioElement>(null)
  // Ref so the source-change effect can read play-intent without being in its deps.
  const isPlayingRef = useRef(false)
  const track = PLAYLIST[currentIndex] ?? PLAYLIST[0]
  const shouldReduceMotion = useReducedMotion()

  useEffect(() => {
    isPlayingRef.current = isPlaying
  }, [isPlaying])

  // Mirror current track in the browser tab title while playing; restore on pause/unmount.
  useEffect(() => {
    if (!isPlaying) return
    const prev = document.title
    // Two trailing spaces create a visible gap between loop repetitions.
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

  // Wire up audio element events. Runs once after the portal renders (mounted = true).
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

  // Load the new source when the track changes or after the portal first renders.
  // isPlaying is read via ref to avoid retriggering load() on every play/pause toggle.
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

  // Sync play/pause — never calls load(), so it's safe to run on every toggle.
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !hasAudio) return
    if (isPlaying) {
      void audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying, hasAudio])

  // Fallback simulated tick — only active when there is no real audio src.
  useEffect(() => {
    if (hasAudio || !isPlaying) return
    const id = window.setInterval(() => setCurrentTimeSec((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [hasAudio, isPlaying])

  // Auto-advance fallback (simulated mode only).
  useEffect(() => {
    if (hasAudio || !isPlaying || currentTimeSec < duration) return
    setCurrentIndex((i) => (i + 1) % PLAYLIST.length)
    setCurrentTimeSec(0)
  }, [hasAudio, isPlaying, currentTimeSec, duration])

  function goToIndex(index: number) {
    const count = PLAYLIST.length
    setCurrentIndex(((index % count) + count) % count)
    setCurrentTimeSec(0)
  }

  function goToNext() {
    goToIndex(currentIndex + 1)
  }

  function goToPrevious() {
    if (currentTimeSec > 3) {
      setCurrentTimeSec(0)
      const audio = audioRef.current
      if (audio) audio.currentTime = 0
      return
    }
    goToIndex(currentIndex - 1)
  }

  if (!mounted) return null

  return createPortal(
    <div
      className="pointer-events-none fixed inset-0 z-50"
      ref={constraintsRef}
    >
      {/* Always in DOM so effects can initialise src before the player UI opens. */}
      {/* biome-ignore lint/a11y/useMediaCaption: music player — no caption track applicable */}
      <audio className="hidden" ref={audioRef} />
      <AnimatePresence>
        {isMediaPlayerOpen ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "pointer-events-auto absolute right-4 bottom-4 w-80 overflow-hidden rounded-xl text-card-foreground",
              GLASS_SURFACE[envSettings.glass]
            )}
            drag
            dragConstraints={constraintsRef}
            dragControls={dragControls}
            dragElastic={0.08}
            dragListener={false}
            dragMomentum={false}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ damping: 26, stiffness: 320, type: "spring" }}
          >
            {/* Drag handle / title bar */}
            <div
              className="flex cursor-grab items-center gap-2 border-border border-b bg-muted/40 px-3 py-2"
              onPointerDown={(event) => dragControls.start(event)}
            >
              <GripVertical
                aria-hidden
                className="size-4 text-muted-foreground"
              />
              <span className="flex-1 font-medium text-muted-foreground text-xs">
                {translate("mediaPlayer.nowPlaying")}
              </span>
              <Button
                aria-label={translate("mediaPlayer.close")}
                className="size-6"
                onClick={() => setIsMediaPlayerOpen(false)}
                size="icon"
                variant="ghost"
              >
                <X className="size-4" />
              </Button>
            </div>

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
                  ) : isPlaying ? (
                    <EqualizerBars />
                  ) : (
                    <Music className="size-5" />
                  )}
                  {isPlaying && track.coverSrc ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <EqualizerBars />
                    </div>
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm">
                    {track.title}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {track.artist}
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
                  <span>{formatTime(currentTimeSec)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Transport controls */}
              <div className="flex items-center justify-center gap-2">
                <motion.div
                  transition={TAP_SPRING}
                  whileHover={{ scale: 1.15, x: -2 }}
                  whileTap={{ scale: 0.85 }}
                >
                  <AnimatedTooltip
                    label={
                      PLAYLIST[(currentIndex - 1) % PLAYLIST.length]?.title ??
                      (PLAYLIST[PLAYLIST.length - 1] as Track).title
                    }
                    side="top"
                  >
                    <Button
                      aria-label={translate("mediaPlayer.previous")}
                      onClick={goToPrevious}
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
                    onClick={() => setIsPlaying((playing) => !playing)}
                    size="icon"
                  >
                    {/* Breathing sonar: 3 rings expand+fade with staggered delays */}
                    {isPlaying
                      ? [0.5].map((delay) => (
                          <motion.span
                            animate={{
                              opacity: [0.55, 0, 0.2],
                              scale: [1, 1.8, 1],
                            }}
                            aria-hidden
                            className="absolute inset-0 rounded-full border border-primary-foreground/40"
                            key={delay}
                            transition={{
                              delay,
                              duration: 4,
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
                      onClick={goToNext}
                      size="icon"
                      variant="ghost"
                    >
                      <SkipForward className="size-5" />
                    </Button>
                  </AnimatedTooltip>
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
  )
}
