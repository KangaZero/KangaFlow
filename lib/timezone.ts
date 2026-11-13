// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// IANA zones number in the hundreds and change over time, so these are
// intentionally `string` rather than a literal union.

/**
 * The visitor's IANA time zone (e.g. "Europe/London"), or `undefined` when the
 * engine cannot resolve one. No default on purpose: callers pick a fallback
 * that fits their use (the weather query lets Open-Meteo resolve "auto").
 * Call this on the client — at build time it reports the build machine's zone.
 */
export function getVisitorTimeZone(): string | undefined {
  const { timeZone } = Intl.DateTimeFormat().resolvedOptions()
  return timeZone === "" ? undefined : timeZone
}

// Local, dependency-free replacement for the portfolio's
// @/utils/getLocalTimeZone: the visitor's zone, falling back to Asia/Tokyo.
export function getLocalTimeZone(): string {
  return getVisitorTimeZone() ?? "Asia/Tokyo"
}
