"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

// Advisory shown in the settings surfaces when Web Storage is blocked or has
// started rejecting writes (see `lib/safe-storage`). Nothing is broken at that
// point — the facade keeps everything in memory — so this is a `status`, not an
// `alert`: settings still apply, they just won't survive a reload. Renders
// nothing on the server and on the happy path.

import { TriangleAlert } from "lucide-react"

import { useStorageIsPersistent } from "@/lib/hooks/use-safe-storage"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

export function StorageWarning(props: {
  className?: string
}): React.JSX.Element | null {
  const { className } = props
  const { translate } = useLocale()
  const isPersistent = useStorageIsPersistent()

  if (isPersistent) return null

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3",
        className
      )}
      role="status"
    >
      <TriangleAlert
        aria-hidden="true"
        className="mt-0.5 size-4 shrink-0 text-destructive"
      />
      <div className="flex flex-col gap-0.5">
        <p className="font-medium text-destructive text-xs">
          {translate("settings.storageUnavailableTitle")}
        </p>
        <p className="text-muted-foreground text-xs">
          {translate("settings.storageUnavailable")}
        </p>
      </div>
    </div>
  )
}
