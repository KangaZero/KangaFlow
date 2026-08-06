// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// In-session store for per-window app content (terminal input/history/cwd,
// browser tabs/URLs). Apps write here on every meaningful change and read it on
// mount, so content survives workspace switches, overview transitions, and even
// the whole environment unmounting — without re-rendering anything (it's a
// module-level Map, not React state).
//
// The persisted copy lives under `kangaflow:niriWorkspaces` (lib/niri-persistence);
// that module overlays this cache into the layout on save and hydrates it back
// on load.

import type { NiriWindowContent } from "@/components/niri/types"

const content = new Map<string, NiriWindowContent>()

/** Store a window's latest content (null removes the entry). */
export function setWindowContent(
  windowId: string,
  value: NiriWindowContent | null
): void {
  if (value === null) {
    content.delete(windowId)
  } else {
    content.set(windowId, value)
  }
}

/** Latest content for a window, or null if it never saved (or isn't stateful). */
export function getWindowContent(windowId: string): NiriWindowContent | null {
  return content.get(windowId) ?? null
}

/** Drop cache entries for windows that no longer exist in the layout. */
export function pruneWindowContent(activeIds: ReadonlySet<string>): void {
  for (const id of content.keys()) {
    if (!activeIds.has(id)) content.delete(id)
  }
}
