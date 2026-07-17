// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Local, dependency-free replacement for the portfolio's
// @/utils/getLocalTimeZone. Returns the browser's IANA time zone (e.g.
// "Asia/Tokyo"), falling back to a sensible default when unavailable (SSR/older
// engines). IANA zones number in the hundreds and change over time, so this is
// intentionally `string` rather than a literal union.
export function getLocalTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tokyo"
}
