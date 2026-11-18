// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// Single source of truth for the widget list (working rule 1), kept free of
// React so pure code (the WebMCP tools, tests) can read it without importing
// every widget component. `components/widgets/widget-management.tsx` maps
// each name to its element.

import type { PageName } from "@/lib/pages"

/** `global` widgets render on every page; the rest only on the environment. */
export const WIDGETS = [
  { global: true, name: "media-player" },
  { global: false, name: "notes" },
  { global: false, name: "alarm" },
  { global: false, name: "calendar" },
  { global: false, name: "keyboard" },
] as const satisfies readonly { global: boolean; name: string }[]

export type AvailableWidgetName = (typeof WIDGETS)[number]["name"]

export const WIDGET_NAMES: readonly AvailableWidgetName[] = WIDGETS.map(
  (widget) => widget.name
)

export function isWidgetName(value: string): value is AvailableWidgetName {
  return WIDGETS.some((widget) => widget.name === value)
}

/** The widgets that exist on a page: all of them on the environment. */
export function widgetsOnPage(
  page: PageName | undefined
): readonly AvailableWidgetName[] {
  return WIDGETS.filter(
    (widget) => widget.global || page === "environment"
  ).map((widget) => widget.name)
}
