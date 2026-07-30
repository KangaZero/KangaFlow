"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog"
import { GLASS_SURFACE } from "@/components/niri/glass"
import type {
  BorderRadius,
  GlassLevel,
  WallpaperId,
} from "@/components/niri/settings"
import { WallpaperPicker } from "@/components/niri/wallpaper-picker"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

// Quick wallpaper switcher opened from the bar — the animate-ui dialog wrapping
// the shared picker. Shares the settings window's liquid-glass surface.
export function WallpaperDialog({
  open,
  onOpenChange,
  value,
  onChange,
  glass,
  windowRadius,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: WallpaperId
  onChange: (wallpaper: WallpaperId) => void
  glass: GlassLevel
  windowRadius: BorderRadius
}) {
  const { translate } = useLocale()
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className={cn("sm:max-w-lg", GLASS_SURFACE[glass])}
        style={{ borderRadius: `${windowRadius}px` }}
      >
        <DialogHeader>
          <DialogTitle>
            {translate("environment.settings.wallpaper")}
          </DialogTitle>
          <DialogDescription>
            {translate("environment.settings.wallpaperHint")}
          </DialogDescription>
        </DialogHeader>
        <WallpaperPicker onChange={onChange} value={value} />
      </DialogContent>
    </Dialog>
  )
}
