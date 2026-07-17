// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { getLocalTimeZone } from "@/lib/timezone"

// KangaFlow equivalent of the portfolio's `person` resource — just the bits the
// header date box needs.
export const person = {
  // IANA time zone (falls back to Asia/Tokyo); used for the weather forecast.
  location: getLocalTimeZone(),
  // [latitude, longitude] for Tokyo.
  locationCoordinates: [35.660504, 139.724981],
  workplace: "Accenture",
} as const
