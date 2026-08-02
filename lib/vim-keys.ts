// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Shared keyboard normalisation for the vim hooks. Dead keys ('"`~^ on many
// layouts) fire keydown with key "Dead" and only emit the real char after a
// compose step — which breaks find/replace/text-object targets like di" or f`.
// Recover the intended char from the physical code so single-key targets work
// everywhere.

const DEAD_KEYS: Record<string, [plain: string, shifted: string]> = {
  Backquote: ["`", "~"],
  Digit6: ["6", "^"],
  Quote: ["'", '"'],
}

export function keyFromEvent(e: KeyboardEvent): string {
  if (e.key !== "Dead") return e.key
  const pair = DEAD_KEYS[e.code]
  return pair ? (e.shiftKey ? pair[1] : pair[0]) : e.key
}
