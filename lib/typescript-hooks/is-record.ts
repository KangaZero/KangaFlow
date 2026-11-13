// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Narrows an `unknown` (JSON.parse output, a network body, a storage value) to
// an indexable object so its fields can be checked one by one. Arrays pass too;
// callers validate the fields they actually read.
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
