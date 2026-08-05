// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Strict, exact contract for the Noctalia-style settings surface. Every option
// is a literal union or a bounded scalar — no bare strings/numbers where a
// finite set applies. Pure data (no React/DOM).

import type { TrackSrc } from "@/components/widgets/tracks"

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
export const UI_SCALES = [0.5, 1, 1.1, 1.2, 1.3, 1.4, 1.5] as const
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

// Floating widgets that can be opened on the desktop. Each id maps to a
// DraggableWindow `storageKey` (`kangaflow:widget-state:<storageKey>`).
export const WIDGET_IDS = ["notes", "alarm", "calendar", "media"] as const
export type WidgetId = (typeof WIDGET_IDS)[number]

export const WIDGET_STORAGE_KEYS: Record<WidgetId, string> = {
  alarm: "alarm-widget",
  calendar: "calendar-widget",
  media: "media-player",
  notes: "notes-widget",
}

// localStorage key prefix DraggableWindow persists position/size under.
export const WIDGET_STATE_STORAGE_PREFIX = "kangaflow:widget-state:"

// Corner presets for a widget's default anchor (non-overlapping out of the box).
export const WIDGET_ANCHORS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
] as const
export type WidgetAnchor = (typeof WIDGET_ANCHORS)[number]

// Tailwind fixed-position classes per anchor. `center` uses inset-0 + m-auto
// (not translate) so it never fights motion's transform-based drag offset.
export const WIDGET_ANCHOR_CLASS: Record<WidgetAnchor, string> = {
  "bottom-left": "bottom-4 left-4",
  "bottom-right": "bottom-4 right-4",
  center: "inset-0 m-auto",
  "top-left": "top-4 left-4",
  "top-right": "top-4 right-4",
}

type WidgetStartupBase = {
  show: boolean
  anchor: WidgetAnchor
  offset: { x: number; y: number } | null
}

export type WidgetStartup<T extends WidgetId> = T extends "media"
  ? WidgetStartupBase & { options: MediaPlayerOptions }
  : WidgetStartupBase

type MediaPlayerOptions = {
  currentVolume: number
  currentTrack: TrackSrc
  currentDuration: number
  isLooping: boolean
}

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
  widgetDefaults: {
    [K in WidgetId]: WidgetStartup<K>
  }
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
  // Non-overlapping default anchors, all hidden until the user opts in.
  widgetDefaults: {
    alarm: { anchor: "bottom-left", offset: null, show: false },
    calendar: { anchor: "top-right", offset: null, show: false },
    media: {
      anchor: "bottom-right",
      offset: null,
      options: {
        currentDuration: 0,
        currentTrack: "/tracks/kapustin-eight-concert-etudes-op40-7.mp3",
        currentVolume: 100,
        isLooping: false,
      },
      show: false,
    },
    notes: { anchor: "top-left", offset: null, show: false },
  },
  windowRadius: 16,
}
