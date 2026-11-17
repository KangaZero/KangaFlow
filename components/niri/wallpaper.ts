// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Single source of truth for environment wallpapers: which photo each theme
// defaults to, and how any `WallpaperId` (incl. "auto") resolves to a
// background style. Shared by the desktop render, the settings picker, and the
// bar's wallpaper dialog. Pure data (no React/DOM).

import type { StaticImageData } from "next/image"
import type { CSSProperties } from "react"
import beachThumb from "@/assets/wallpaper-thumbs/beach-path.webp"
import catThumb from "@/assets/wallpaper-thumbs/cat-vibin.webp"
import magmaThumb from "@/assets/wallpaper-thumbs/magma.webp"
import beach from "@/assets/wallpapers/beach-path.webp"
import cat from "@/assets/wallpapers/cat-vibin.webp"
import magma from "@/assets/wallpapers/magma.webp"
import type { WallpaperId } from "@/components/niri/settings"
import type { PlaceholderKey } from "@/lib/image-placeholders"
import type { Theme } from "@/lib/themes"

/** A photo wallpaper: the full image plus its blur-up placeholder key. */
export type WallpaperPhoto = {
  readonly image: StaticImageData
  /** 480px copy for small previews (the picker), so they skip the 2560px file. */
  readonly thumb: StaticImageData
  readonly placeholder: PlaceholderKey
}

// Pinnable photo wallpapers (independent of theme). Each image is paired with
// its placeholder here, next to the import, so a mistyped key fails tsc.
export const PHOTO_WALLPAPERS = {
  beach: {
    image: beach,
    placeholder: "wallpapers/beach-path",
    thumb: beachThumb,
  },
  cat: {
    image: cat,
    placeholder: "wallpapers/cat-vibin",
    thumb: catThumb,
  },
  magma: {
    image: magma,
    placeholder: "wallpapers/magma",
    thumb: magmaThumb,
  },
} as const satisfies Partial<Record<WallpaperId, WallpaperPhoto>>

export type PhotoWallpaperId = keyof typeof PHOTO_WALLPAPERS

// Theme → default photo, used when the wallpaper is "auto".
export const THEME_WALLPAPER = {
  dark: "magma",
  light: "beach",
  terminal: "cat",
} as const satisfies Record<Theme, PhotoWallpaperId>

// Illustrative gradient wallpapers — inline colour is allowed here, mirroring a
// real desktop background (same exception as the theme-transition art).
const GRADIENT_WALLPAPER: Partial<Record<WallpaperId, CSSProperties>> = {
  aurora: {
    background:
      "linear-gradient(135deg,#1e3a5f 0%,#3b2f63 45%,#5b2a53 75%,#1e1e2e 100%)",
  },
  catppuccin: { background: "linear-gradient(135deg,#1e1e2e 0%,#302d41 100%)" },
  mesh: {
    background:
      "radial-gradient(at 20% 20%,#89b4fa55,transparent 45%),radial-gradient(at 80% 30%,#f5c2e755,transparent 45%),radial-gradient(at 50% 80%,#94e2d555,transparent 45%),#1e1e2e",
  },
  solid: { background: "#181825" },
}

const isPhotoWallpaper = (id: WallpaperId): id is PhotoWallpaperId =>
  Object.hasOwn(PHOTO_WALLPAPERS, id)

// The photo a wallpaper id shows for the given theme, or `null` when it is a
// gradient. "auto" (and any id with no gradient defined) falls back to the
// theme's default photo, so only real gradients skip the blur-up loading.
export function wallpaperPhoto(
  id: WallpaperId,
  theme: Theme
): WallpaperPhoto | null {
  if (isPhotoWallpaper(id)) return PHOTO_WALLPAPERS[id]
  if (id !== "auto" && GRADIENT_WALLPAPER[id]) return null
  return PHOTO_WALLPAPERS[THEME_WALLPAPER[theme]]
}

function coverImage(img: StaticImageData): CSSProperties {
  return {
    backgroundImage: `url(${img.src})`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  }
}

// Resolve any wallpaper id (including "auto") to a full-bleed background style
// for the given theme: the photo as a cover image, or the gradient.
export function wallpaperStyle(id: WallpaperId, theme: Theme): CSSProperties {
  const photo = wallpaperPhoto(id, theme)
  if (photo) return coverImage(photo.image)
  return GRADIENT_WALLPAPER[id] ?? {}
}
