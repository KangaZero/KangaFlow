// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Keyboard-event predicates shared by text inputs.

// The fields read below — a structural slice of the DOM KeyboardEvent, so a
// React handler passes `e.nativeEvent` (React's synthetic event has no
// `isComposing`).
export type EnterKeyEvent = Pick<
  KeyboardEvent,
  "isComposing" | "key" | "keyCode"
>

// True for an Enter that should commit the field's value, false for the Enter
// an IME (Japanese/Chinese/Korean input) uses to confirm a conversion. Firing
// on that one adds half-converted text. `isComposing` covers Chromium/Firefox;
// Safari (WebKit bug 165004) resets it before the handler runs, but still
// reports keyCode 229 (VK_PROCESSKEY) on the confirming keydown. `keyCode` is
// deprecated, yet no modern field exposes this, and checking it only behind
// `key === "Enter"` keeps mobile keyboards (which send 229 for ordinary
// characters) unaffected.
export function isCommitEnter(event: EnterKeyEvent): boolean {
  return event.key === "Enter" && !event.isComposing && event.keyCode !== 229
}
