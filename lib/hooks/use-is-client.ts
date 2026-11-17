// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// `false` while rendering on the server and during hydration, `true` for every
// client render after that. `useSyncExternalStore` uses the server snapshot
// for the hydration pass (so the markup matches the static HTML) and re-renders
// with the client snapshot straight after. A component mounted later, purely on
// the client, sees `true` on its very first render.

import { useSyncExternalStore } from "react"

const subscribe = (): (() => void) => () => undefined
const clientSnapshot = (): boolean => true
const serverSnapshot = (): boolean => false

export function useIsClient(): boolean {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot)
}
