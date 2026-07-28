"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/animate-ui/components/radix/dialog"
import type { WallpaperId } from "@/components/niri/settings"
import { WallpaperPicker } from "@/components/niri/wallpaper-picker"
import { useLocale } from "@/providers/locale-provider"

// Quick wallpaper switcher opened from the bar — the animate-ui dialog wrapping
// the shared picker.
export function WallpaperDialog({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: WallpaperId
  onChange: (wallpaper: WallpaperId) => void
}) {
  const { translate } = useLocale()
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="sm:max-w-lg">
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
