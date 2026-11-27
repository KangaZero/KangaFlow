// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

/**
 * True when focus is in a text field or editable content, where a typed key is
 * text, not a shortcut. The one shared check for the global shortcut
 * dispatcher and the niri desktop's key handler (there were two copies).
 *
 * closest(): a node inside an editable region (CodeMirror's content, xterm's
 * helper textarea) counts too. A selector rather than isContentEditable, which
 * jsdom lacks, so the tests exercise the same code path as the browser.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false
  return (
    target.closest(
      'input, textarea, select, [contenteditable]:not([contenteditable="false"])'
    ) !== null
  )
}
