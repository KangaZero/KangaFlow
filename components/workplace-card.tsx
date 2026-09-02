"use client"
// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import { TokyoMap } from "@/components/tokyo-map"
import { person } from "@/lib/person"
import { formatCoordinates } from "@/lib/tokyo-map"
import { cn } from "@/lib/utils"
import { useLocale } from "@/providers/locale-provider"

// Shared body of both header hover cards (the date box and the rotating status
// line). They used to render the same three lines independently; now there is
// one card — hover either trigger, get the same workplace read-out plus the
// ASCII map of central Tokyo with the office marked.
export function WorkplaceCard({ className }: { className?: string }) {
  const { translate } = useLocale()

  return (
    <div className={cn("space-y-1 font-mono text-xs", className)}>
      <p>{`${translate("headerCard.basedIn")} ${person.location}`}</p>
      <p className="font-semibold text-foreground">
        {translate("headerCard.workplace")}
      </p>
      <p>{translate("headerCard.status")}</p>
      <TokyoMap
        className="mt-2 w-64"
        label={translate("headerCard.map.label")}
        point={person.locationCoordinates}
      />
      <p className="mt-2">{translate("headerCard.map.caption")}</p>
      <p className="text-[0.65rem] text-muted-foreground/70 tabular-nums">
        {formatCoordinates(person.locationCoordinates)}
      </p>
      {/* Required attribution for the ward geometry. GSI asks for 出典元の明記,
          which is what 地図出典 renders; the source name (地球地図日本 / Global Map
          Japan) stays recognisable in both locales. */}
      <p className="text-[0.6rem] text-muted-foreground/60">
        {translate("headerCard.map.credit")}
      </p>
    </div>
  )
}
