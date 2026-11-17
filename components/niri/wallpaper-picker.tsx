"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { Check } from "lucide-react"
import { motion } from "motion/react"
import { useTheme } from "next-themes"
import { WALLPAPERS, type WallpaperId } from "@/components/niri/settings"
import { WallpaperBackground } from "@/components/niri/wallpaper-background"
import { SPRING_TAP } from "@/lib/motion"
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
    <div className="grid grid-cols-4 gap-x-3 gap-y-3.5">
      {WALLPAPERS.map((w) => {
        const selected = value === w
        const label = labelFor(w)
        return (
          // Frosted-shell tile: lifts on hover, accent ring + check when
          // selected. Same click → onChange as before; no preview step.
          <button
            aria-label={label}
            aria-pressed={selected}
            className="group flex flex-col gap-1.5 text-left focus-visible:outline-none"
            key={w}
            onClick={() => onChange(w)}
            type="button"
          >
            <span
              className={cn(
                "ring-offset-card relative block aspect-video w-full overflow-hidden rounded-lg transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(0.32,1.25,0.5,1)] motion-reduce:transition-none",
                "group-hover:-translate-y-0.5 group-hover:scale-[1.02] group-hover:shadow-[0_10px_22px_-10px_rgba(0,0,0,0.5)]",
                "group-focus-visible:ring-primary group-focus-visible:ring-2 group-focus-visible:ring-offset-2",
                selected
                  ? "ring-primary shadow-[0_8px_20px_-12px_rgba(0,0,0,0.5)] ring-2 ring-offset-2"
                  : "ring-foreground/10 ring-1"
              )}
            >
              <WallpaperBackground
                className="absolute inset-0"
                id={w}
                size="thumb"
                theme={theme}
              />
              {selected ? (
                <motion.span
                  animate={{ opacity: 1, scale: 1 }}
                  aria-hidden
                  className="bg-primary text-primary-foreground absolute top-1.5 right-1.5 grid size-5 place-items-center rounded-full shadow-[0_2px_6px_rgba(0,0,0,0.35)]"
                  initial={{ opacity: 0, scale: 0.5 }}
                  transition={SPRING_TAP}
                >
                  <Check className="size-3" strokeWidth={3} />
                </motion.span>
              ) : null}
            </span>
            <span
              className={cn(
                "truncate px-0.5 text-xs transition-colors",
                selected
                  ? "text-foreground font-medium"
                  : "text-muted-foreground group-hover:text-foreground"
              )}
            >
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
