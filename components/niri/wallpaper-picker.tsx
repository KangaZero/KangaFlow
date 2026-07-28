"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { useTheme } from "next-themes"
import { WALLPAPERS, type WallpaperId } from "@/components/niri/settings"
import { wallpaperStyle } from "@/components/niri/wallpaper"
import { DEFAULT_THEME, isTheme } from "@/lib/themes"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

// Wallpaper names are proper-ish identifiers, kept literal like the existing
// gradient names; only "auto" is a UI concept and gets localised at render.
const WALLPAPER_LABELS: Record<Exclude<WallpaperId, "auto">, string> = {
  aurora: "Aurora",
  beach: "Beach",
  cat: "Cat",
  catppuccin: "Catppuccin",
  magma: "Magma",
  mesh: "Mesh",
  solid: "Solid",
}

// A grid of live wallpaper previews. Shared by the settings panel and the bar's
// wallpaper dialog so the option set + swatch rendering live in one place.
export function WallpaperPicker({
  value,
  onChange,
}: {
  value: WallpaperId
  onChange: (wallpaper: WallpaperId) => void
}) {
  const { translate } = useLocale()
  const { resolvedTheme } = useTheme()
  const theme = isTheme(resolvedTheme) ? resolvedTheme : DEFAULT_THEME

  const labelFor = (w: WallpaperId): string =>
    w === "auto"
      ? translate("environment.settings.wallpaperAuto")
      : WALLPAPER_LABELS[w]

  return (
    <div className="grid grid-cols-4 gap-2">
      {WALLPAPERS.map((w) => {
        const selected = value === w
        const label = labelFor(w)
        return (
          <button
            aria-label={label}
            aria-pressed={selected}
            className={cn(
              "relative aspect-video overflow-hidden rounded-md border-2 transition",
              selected
                ? "border-primary"
                : "border-transparent hover:border-border"
            )}
            key={w}
            onClick={() => onChange(w)}
            type="button"
          >
            <span
              className="absolute inset-0"
              style={wallpaperStyle(w, theme)}
            />
            <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 py-0.5 text-[10px] text-white leading-tight">
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
