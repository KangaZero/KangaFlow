// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// The ONE AudioContext shared by every app sound (SFX, achievement unlock,
// ambience). Created lazily; browsers start it suspended until a user gesture
// (autoplay policy), so resume() is attempted and a refusal ignored — the
// worst case is silence. `null` where Web Audio is unavailable.

let shared: AudioContext | null = null

export function getSharedAudio(): AudioContext | null {
  if (
    typeof window === "undefined" ||
    typeof window.AudioContext !== "function"
  )
    return null
  try {
    shared ??= new window.AudioContext()
  } catch {
    return null
  }
  if (shared.state === "suspended") shared.resume().catch(() => undefined)
  return shared
}

/** Overall loudness cap for SFX (each recipe's gains are relative to this). */
export const SFX_MASTER_GAIN = 0.25
