// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Apple "Liquid Glass" (macOS 26) surface, shared by the settings window and the
// wallpaper dialog. `backdrop-saturate` makes colours bloom through the blur and
// a bright inset hairline fakes the lit glass edge; the base opacity + blur scale
// with the user's chosen translucency (Noctalia's transparency_mode).

import type { GlassLevel } from "@/components/niri/settings"

// `glass-ink` swaps in the muted ink tuned for text on glass. The glass/soft
// fills are per-theme tokens (globals.css --glass-fill*): light glass has to be
// far denser than dark glass for its dark text to clear WCAG AA over a photo.
const RIM =
  "glass-ink border border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_12px_44px_rgba(0,0,0,0.38)]"

export const GLASS_SURFACE: Record<GlassLevel, string> = {
  glass: `${RIM} bg-(--glass-fill) backdrop-blur-2xl backdrop-saturate-150`,
  soft: `${RIM} bg-(--glass-fill-soft) backdrop-blur-xl backdrop-saturate-150`,
  solid: `${RIM} bg-card/95 backdrop-blur-sm`,
  // True glass is mostly a WebGL shader surface on windows; the CSS fallback
  // stays as close to fully transparent as readability allows for the panels
  // that only get the class (settings/wallpaper preview, toast).
  true: `${RIM} bg-card/5 backdrop-blur-2xl backdrop-saturate-150`,
}

// Window elevation for draggable widgets/windows (env "frosted glass" chrome):
// soft layered shadows that deepen when the window is the active one. Applied
// AFTER GLASS_SURFACE (tailwind-merge lets the later shadow win), so every
// glass level keeps its blur/opacity and only the shadow stack changes. Kept
// separate from GLASS_SURFACE so panels without focus (settings, dialogs) are
// unaffected; the settings port can reuse `rest` for a static panel.
export const WINDOW_ELEVATION = {
  focused:
    "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.26),0_2px_6px_rgba(0,0,0,0.16),0_30px_70px_-24px_rgba(0,0,0,0.7)]",
  rest: "shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_1px_2px_rgba(0,0,0,0.12),0_10px_28px_-14px_rgba(0,0,0,0.45)]",
} as const
