"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import "@/components/ui/progressive-image.css"

import { useReducedMotion } from "motion/react"
import { type AnimationEvent, useCallback, useLayoutEffect } from "react"

import type { WallpaperId } from "@/components/niri/settings"
import { wallpaperPhoto, wallpaperStyle } from "@/components/niri/wallpaper"
import { useIsClient } from "@/lib/hooks/use-is-client"
import { useProgressiveBackground } from "@/lib/hooks/use-progressive-background"
import { IMAGE_PLACEHOLDERS } from "@/lib/image-placeholders"
import { isReducedMotion } from "@/lib/isReducedMotion"
import type { Theme } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { useGlobalStates } from "@/providers/global-state-provider"

const COVER = "absolute inset-0 bg-cover bg-center"

/**
 * A wallpaper as a full-bleed background layer with a blur-up reveal for
 * photos: blurred placeholder first, then the decoded photo fades in on an
 * opacity-only layer and the placeholder unmounts. Gradients render as-is.
 *
 * Renders nothing on the server or during hydration. The theme and the stored
 * wallpaper are only known on the client, and React does not patch a
 * mismatched `style` on hydration, so baking the server's guess into the static
 * HTML would leave the wrong wallpaper on screen. `className` positions the
 * root (e.g. `absolute inset-0`).
 */
export function WallpaperBackground({
  id,
  theme,
  className,
  size = "full",
}: {
  id: WallpaperId
  theme: Theme
  className?: string
  /** "thumb" loads the 480px copy — for small previews like the picker. */
  size?: "full" | "thumb"
}) {
  const isClient = useIsClient()
  const { animationPref } = useGlobalStates()
  const reduced = isReducedMotion(animationPref, useReducedMotion())
  const photo = isClient ? wallpaperPhoto(id, theme) : null
  const photoSrc = photo
    ? (size === "thumb" ? photo.thumb : photo.image).src
    : null
  const { phase, onRevealed } = useProgressiveBackground(photoSrc)

  const onAnimationEnd = useCallback(
    (event: AnimationEvent<HTMLSpanElement>) => {
      if (event.target === event.currentTarget) onRevealed()
    },
    [onRevealed]
  )

  // Reduced motion: swap instantly. Before paint, so no fade frame runs.
  useLayoutEffect(() => {
    if (reduced && phase === "revealing") onRevealed()
  }, [reduced, phase, onRevealed])

  if (!isClient) return null
  if (photo === null) {
    return (
      <span
        aria-hidden
        className={cn("pointer-events-none", className)}
        style={wallpaperStyle(id, theme)}
      />
    )
  }

  const showPlaceholder =
    phase === "loading" || phase === "revealing" || phase === "error"
  const showPhoto = phase === "revealing" || phase === "ready"

  return (
    <span
      aria-hidden
      className={cn("progressive pointer-events-none", className)}
      data-state={phase}
    >
      {showPlaceholder ? (
        <span
          className={cn("progressive__placeholder", COVER)}
          style={{
            backgroundImage: `url(${IMAGE_PLACEHOLDERS[photo.placeholder]})`,
          }}
        />
      ) : null}
      {showPhoto ? (
        // Mounted only once decoded, so its fade-in starts on a painted image.
        <span
          className={cn("progressive__img", COVER)}
          onAnimationEnd={onAnimationEnd}
          style={{ backgroundImage: `url(${photoSrc})` }}
        />
      ) : null}
    </span>
  )
}
