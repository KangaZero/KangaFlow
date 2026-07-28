// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Strict, exact contract for the Noctalia-style settings surface. Every option
// is a literal union or a bounded scalar — no bare strings/numbers where a
// finite set applies. Pure data (no React/DOM).

// "auto" follows the active theme's default photo; the rest are pinnable —
// three photo wallpapers then the illustrative gradients.
export const WALLPAPERS = [
  "auto",
  "cat",
  "beach",
  "magma",
  "aurora",
  "mesh",
  "catppuccin",
  "solid",
] as const
export type WallpaperId = (typeof WALLPAPERS)[number]

export const BAR_POSITIONS = ["top", "bottom"] as const
export type BarPosition = (typeof BAR_POSITIONS)[number]

export const ENV_FONTS = ["mono", "sans"] as const
export type EnvFont = (typeof ENV_FONTS)[number]

// Discrete UI-scale steps (Noctalia exposes a scale slider; we bound it to a
// small exact set so layout stays predictable).
export const UI_SCALES = [0.9, 1, 1.1, 1.25] as const
export type UiScale = (typeof UI_SCALES)[number]

// Bar background opacity presets (Noctalia's backgroundOpacity), exact steps.
export const BAR_OPACITIES = [0, 0.4, 0.7, 1] as const
export type BarOpacity = (typeof BAR_OPACITIES)[number]

// Desktop accent — "default" keeps the theme's own `--primary`; the rest
// override it with an oklch hue (applied on the environment root).
export const ACCENTS = [
  "default",
  "rose",
  "amber",
  "emerald",
  "sky",
  "violet",
] as const
export type AccentId = (typeof ACCENTS)[number]

export const ACCENT_COLORS: Record<Exclude<AccentId, "default">, string> = {
  amber: "oklch(0.77 0.16 70)",
  emerald: "oklch(0.7 0.15 160)",
  rose: "oklch(0.65 0.22 15)",
  sky: "oklch(0.7 0.15 235)",
  violet: "oklch(0.6 0.22 300)",
}

// Surface translucency (Noctalia's transparency_mode) for the glass panels.
export const GLASS_LEVELS = ["solid", "soft", "glass"] as const
export type GlassLevel = (typeof GLASS_LEVELS)[number]

export type EnvSettings = {
  wallpaper: WallpaperId
  accent: AccentId
  glass: GlassLevel
  barPosition: BarPosition
  barOpacity: BarOpacity
  font: EnvFont
  uiScale: UiScale
  showSystemMonitor: boolean
}

export const DEFAULT_ENV_SETTINGS: EnvSettings = {
  accent: "default",
  barOpacity: 0.7,
  barPosition: "top",
  font: "mono",
  glass: "glass",
  showSystemMonitor: true,
  uiScale: 1,
  wallpaper: "auto",
}
