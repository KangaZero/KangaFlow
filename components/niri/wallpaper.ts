// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Single source of truth for environment wallpapers: which photo each theme
// defaults to, and how any `WallpaperId` (incl. "auto") resolves to a
// background style. Shared by the desktop render, the settings picker, and the
// bar's wallpaper dialog. Pure data (no React/DOM).

import type { StaticImageData } from "next/image"
import type { CSSProperties } from "react"
import beach from "@/assets/wallpapers/beach-path.webp"
import cat from "@/assets/wallpapers/cat-vibin.png"
import magma from "@/assets/wallpapers/magma.webp"
import type { WallpaperId } from "@/components/niri/settings"
import type { Theme } from "@/lib/themes"

// Theme → default photo, used when the wallpaper is "auto".
export const THEME_WALLPAPER: Record<Theme, StaticImageData> = {
  dark: magma,
  light: beach,
  terminal: cat,
}

// Pinnable photo wallpapers (independent of theme).
const PHOTO_WALLPAPER: Partial<Record<WallpaperId, StaticImageData>> = {
  beach,
  cat,
  magma,
}

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

function coverImage(img: StaticImageData): CSSProperties {
  return {
    backgroundImage: `url(${img.src})`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  }
}

// Resolve any wallpaper id (including "auto") to a full-bleed background style
// for the given theme. Also used for the picker swatches (cover scales down).
export function wallpaperStyle(id: WallpaperId, theme: Theme): CSSProperties {
  if (id === "auto") return coverImage(THEME_WALLPAPER[theme])
  const photo = PHOTO_WALLPAPER[id]
  if (photo) return coverImage(photo)
  return GRADIENT_WALLPAPER[id] ?? coverImage(THEME_WALLPAPER[theme])
}
