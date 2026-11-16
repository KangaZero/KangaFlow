// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Start-page hero (avatar + name) interaction maths. Pure, so it is testable;
// the components only read the clock and pass it in.

/**
 * How long the avatar's entrance needs before it has peaked: the shard slam is
 * a ~380ms spring that peaks around 250ms. If the name morph is triggered
 * inside this window, it waits out the rest so the two big beats never land on
 * the same instant.
 */
export const AVATAR_PEAK_WINDOW_MS = 380

/**
 * Extra ENTER delay (ms) for the name morph, given when the avatar entrance
 * started (`null` = avatar not active) and the current time.
 */
export function leadDelayMs(
  avatarEnteredAt: number | null,
  now: number,
  window: number = AVATAR_PEAK_WINDOW_MS
): number {
  if (avatarEnteredAt === null) return 0
  const since = now - avatarEnteredAt
  if (since < 0) return 0
  return Math.max(0, Math.round(window - since))
}

/** Counter text after `count` boops, e.g. "BOOP ×3" (word comes from i18n). */
export function boopLabel(word: string, count: number): string {
  return `${word} ×${Math.max(1, Math.floor(count))}`
}

// Tiny shared clock between the two hero components (siblings in the page):
// the avatar records when its entrance started, the name reads it on enter.
let avatarEnteredAt: number | null = null

export function markAvatarEntered(now: number): void {
  avatarEnteredAt = now
}

export function clearAvatarEntered(): void {
  avatarEnteredAt = null
}

export function avatarEnteredAtTime(): number | null {
  return avatarEnteredAt
}
