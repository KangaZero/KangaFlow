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

export const BAR_POSITIONS = ["top", "bottom", "left", "right"] as const
export type BarPosition = (typeof BAR_POSITIONS)[number]

export const ENV_FONTS = ["mono", "sans"] as const
export type EnvFont = (typeof ENV_FONTS)[number]

// Discrete UI-scale steps (Noctalia exposes a scale slider; we bound it to a
// small exact set so layout stays predictable).
export const UI_SCALES = [1, 1.1, 1.2, 1.3, 1.4, 1.5] as const
export type UiScale = (typeof UI_SCALES)[number]

// Bar background opacity presets (Noctalia's backgroundOpacity), exact steps.
export const BAR_OPACITIES = [
  0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
] as const
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

// Border-radius in px (0 = square). Stored as a plain number; clamped 0–64 on load.
export type BorderRadius = number
export const BORDER_RADIUS_MIN = 0
export const BORDER_RADIUS_MAX = 64

export type EnvSettings = {
  wallpaper: WallpaperId
  accent: AccentId
  glass: GlassLevel
  barPosition: BarPosition
  barOpacity: BarOpacity
  font: EnvFont
  uiScale: UiScale
  autoHideBar: boolean
  showStartingHint: boolean
  showSystemMonitor: boolean
  windowRadius: BorderRadius
  barRadius: BorderRadius
  launcherRadius: BorderRadius
}

export const DEFAULT_ENV_SETTINGS: EnvSettings = {
  accent: "default",
  autoHideBar: false,
  barOpacity: 0.7,
  barPosition: "top",
  barRadius: 12,
  font: "mono",
  glass: "glass",
  launcherRadius: 16,
  showStartingHint: true,
  showSystemMonitor: true,
  uiScale: 1,
  wallpaper: "auto",
  windowRadius: 16,
}
