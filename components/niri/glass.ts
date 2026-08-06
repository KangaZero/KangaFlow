// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Apple "Liquid Glass" (macOS 26) surface, shared by the settings window and the
// wallpaper dialog. `backdrop-saturate` makes colours bloom through the blur and
// a bright inset hairline fakes the lit glass edge; the base opacity + blur scale
// with the user's chosen translucency (Noctalia's transparency_mode).

import type { GlassLevel } from "@/components/niri/settings"

const RIM =
  "border border-white/15 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.22),0_12px_44px_rgba(0,0,0,0.38)]"

export const GLASS_SURFACE: Record<GlassLevel, string> = {
  glass: `${RIM} bg-card/25 backdrop-blur-2xl backdrop-saturate-150`,
  soft: `${RIM} bg-card/60 backdrop-blur-xl backdrop-saturate-150`,
  solid: `${RIM} bg-card/95 backdrop-blur-sm`,
  // True glass is mostly a WebGL shader surface on windows; the CSS fallback
  // stays as close to fully transparent as readability allows for the panels
  // that only get the class (settings/wallpaper preview, toast).
  true: `${RIM} bg-card/5 backdrop-blur-2xl backdrop-saturate-150`,
}
