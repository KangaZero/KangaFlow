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
import { AnimatePresence, motion, useDragControls } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"
import { useLocale } from "@/providers/locale-provider"

// A single playlist entry. `src` is the seam for real audio: today the panel is
// driven by a simulated clock, but once you drop MP3s into `assets/tracks/` and
// import them here, an <audio> element can replace the tick with no UI changes.
type Track = {
  title: string
  artist: string
  duration: number // seconds
  src?: string
}

// Demo playlist — replace with imported tracks when real audio is wired. Typed
// as a non-empty tuple (`as const satisfies`) so `PLAYLIST[0]` is always a
// defined `Track` under noUncheckedIndexedAccess — no null-guard needed.
const PLAYLIST = [
  { artist: "Kavinsky", duration: 258, title: "Nightcall" },
  { artist: "Carpenter Brut", duration: 244, title: "Turbo Killer" },
  { artist: "The Midnight", duration: 312, title: "Sunset" },
] as const satisfies readonly [Track, ...Track[]]

// Format a whole-second count as m:ss (e.g. 258 → "4:18"). Pure + exported so it
// can be unit-tested independently of the component.
export function formatTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${minutes}:${seconds.toString().padStart(2, "0")}`
}

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
  const { isMediaPlayerOpen, setIsMediaPlayerOpen } = useGlobalStates()

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTimeSec, setCurrentTimeSec] = useState(0)

  // Portal target only exists in the browser; gate render until mounted to avoid
  // an SSR/hydration mismatch on the static export. (All hooks must run before
  // the `!mounted` early return below — Rules of Hooks.)
  const [mounted, setMounted] = useState(false)

  // Constrain dragging to the viewport, and start drags only from the header.
  const constraintsRef = useRef<HTMLDivElement>(null)
  const dragControls = useDragControls()

  useEffect(() => setMounted(true), [])

  const track = PLAYLIST[currentIndex] ?? PLAYLIST[0]

  // TODO(human): simulated playback tick.
  // While `isPlaying`, advance `currentTimeSec` by 1 every second. When it
  // reaches `track.duration`, auto-advance to the next track (wrap around) and
  // keep playing from 0. Remember to clear the interval on cleanup so pausing,
  // unmounting, or a track change doesn't leave a stray timer running.
  useEffect(() => {
    if (!isPlaying) return
  }, [isPlaying])

  function goToIndex(index: number) {
    const count = PLAYLIST.length
    setCurrentIndex(((index % count) + count) % count)
    setCurrentTimeSec(0)
  }

  function goToNext() {
    goToIndex(currentIndex + 1)
  }

  function goToPrevious() {
    // Restart the current track if we're past a few seconds, else step back.
    if (currentTimeSec > 3) {
      setCurrentTimeSec(0)
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
      <AnimatePresence>
        {isMediaPlayerOpen ? (
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="pointer-events-auto absolute right-4 bottom-4 w-80 overflow-hidden rounded-xl border border-border bg-card/95 text-card-foreground shadow-xl backdrop-blur-md"
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
              className="flex cursor-grab items-center gap-2 border-border border-b bg-muted/40 px-3 py-2 active:cursor-grabbing"
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
                <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  {isPlaying ? <EqualizerBars /> : <Music className="size-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm">
                    {track.title}
                  </p>
                  <p className="truncate text-muted-foreground text-xs">
                    {track.artist}
                  </p>
                </div>
              </div>

              {/* Scrubber */}
              <div className="flex flex-col gap-1.5">
                <Slider
                  aria-label={translate("mediaPlayer.seek")}
                  max={track.duration}
                  onValueChange={(value) => setCurrentTimeSec(value[0] ?? 0)}
                  step={1}
                  value={[Math.min(currentTimeSec, track.duration)]}
                />
                <div className="flex justify-between font-mono text-[10px] text-muted-foreground tabular-nums">
                  <span>{formatTime(currentTimeSec)}</span>
                  <span>{formatTime(track.duration)}</span>
                </div>
              </div>

              {/* Transport controls */}
              <div className="flex items-center justify-center gap-2">
                <Button
                  aria-label={translate("mediaPlayer.previous")}
                  onClick={goToPrevious}
                  size="icon"
                  variant="ghost"
                >
                  <SkipBack className="size-5" />
                </Button>
                <Button
                  aria-label={translate(
                    isPlaying ? "mediaPlayer.pause" : "mediaPlayer.play"
                  )}
                  className="size-11 rounded-full"
                  onClick={() => setIsPlaying((playing) => !playing)}
                  size="icon"
                >
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
                <Button
                  aria-label={translate("mediaPlayer.next")}
                  onClick={goToNext}
                  size="icon"
                  variant="ghost"
                >
                  <SkipForward className={cn("size-5")} />
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
  )
}
