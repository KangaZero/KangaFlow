// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
// WebMCP (W3C Web ML CG) lets a PAGE publish its own functions as "tools" for an
// AI agent that already lives in the browser — Chrome's agent behind
// `chrome://flags/#enable-webmcp-testing`, ChatGPT Desktop, Brave's Leo. This
// exposes site navigation: "take me to the timeline" becomes a tool call rather
// than the agent guessing at links.
//
// Deliberately split from the React side: everything here is pure, so it unit
// tests without a DOM or a router (working rule 5). `components/webmcp.tsx`
// supplies the real `navigate`.
//
// Pages are derived from PAGE_LINKS (lib/pages), not re-listed — working rule 1.
// Add a page there and the header, the shortcuts, the terminal's `cd` and these
// tools all pick it up together.
//
// NOTE on rule 4 (no hardcoded UI labels): the strings below are NOT UI labels.
// They are a machine-facing contract read by a model, never rendered to a user,
// and an agent's language is independent of the site locale. Kept out of i18n on
// purpose; revisit if a tool result is ever surfaced in the UI.

import {
  AVAILABLE_WIDGETS,
  type AvailableWidgetName,
  WIDGET_NAMES,
} from "@/components/widgets/widget-management"
import { isLocale, LOCALES, type Locale } from "@/lib/i18n"
import {
  PAGE_LINKS,
  PAGE_NAMES,
  type PageLink,
  type PageRoute,
} from "@/lib/pages"
import { isTheme, THEMES, type Theme } from "@/lib/themes"

// An MCP result is ALWAYS a list of content blocks discriminated by `type` —
// never a record keyed by whatever the tool happens to be about. Parameterising
// this by widget name produced a block shape no agent can read, so the union is
// the block variants the spec defines and this site actually emits.
type WebMcpContentBlock = { type: "text"; text: string }

export type WebMcpToolResult<T = never> = {
  content: T | readonly WebMcpContentBlock[]
  isError?: boolean
}

// Every tool this site publishes. A literal union, so a typo in a `name` is a
// compile error rather than a tool the agent can see and we cannot find.
export const WEBMCP_TOOL_NAMES = [
  "kangaflow-list-pages",
  "kangaflow-go-to-page",
  "kangaflow-language",
  "kangaflow-theme",
  "kangaflow-show-work-location",
  "kangaflow-toggle-widgets",
] as const

// Use good ol document.querySelector !
export const WEBMCP_INTERACTIVE_ELEMENTS = {
  headerDatePopoverPrimitiveTrigger: "header-date-popover-primitive-trigger",
} as const

export type WebMcpToolName = (typeof WEBMCP_TOOL_NAMES)[number]

// The JSON-Schema subset these tools use. `unknown` here would let a malformed
// schema reach the agent, where the failure is a tool that is advertised and
// never works.
type SchemaProperty = {
  type: "string" | "boolean" | "number"
  description: string
}

// Argument keys, however they were spelled. A union (`"page"`, `"a" | "b"`) is
// already "several arguments"; a readonly array is accepted so a tool whose
// arguments ARE a const list — `typeof WIDGET_NAMES` — can hand that list over
// instead of re-spelling it as a union that has to be widened every time the
// list grows (working rule 1).
//
// Normalised ONCE, here, and never inside the descriptor: `Record<K, …>` under
// a naked conditional distributes, so `K = "a" | "b"` builds
// `Record<"a", …> | Record<"b", …>` — a choice of two one-key objects — rather
// than the two-key object a multi-argument tool needs.
type ToolArgKey<K extends string | readonly string[]> =
  K extends readonly string[] ? K[number] : K

/**
 * Build the `properties` map for a tool whose arguments are a list of flags.
 *
 * The one `as` in this file, and deliberately fenced into four lines:
 * `Object.fromEntries` is typed to return an index signature, so no amount of
 * generic plumbing recovers the literal keys. Contained here, the cast is
 * checked against `N` once; spread across call sites it would be four separate
 * unchecked claims that drift as widgets are added.
 */
const flagProperties = <const N extends readonly string[]>(
  names: N,
  describe: (name: N[number]) => string
): Readonly<Record<N[number], SchemaProperty>> =>
  Object.fromEntries(
    names.map((name) => [
      name,
      { description: describe(name), type: "boolean" },
    ])
  ) as Readonly<Record<N[number], SchemaProperty>>

// Parameterised by its own argument KEYS. `K` ties together the keys declared
// in `properties`, the keys `required` may name, and the keys `execute` may
// destructure — misspell one and it is a type error, where `Record<string,
// unknown>` let `execute({ pge })` compile and receive `undefined` forever.
//
// The VALUES stay `unknown` deliberately: the arguments come from a language
// model, so `page: string` would be a claim neither the compiler nor the
// runtime can back. The `typeof` guard in `execute` is the real validation.
export type WebMcpToolDescriptor<K extends string | readonly string[] = never> =
  {
    name: WebMcpToolName
    description: string
    inputSchema: {
      type: "object"
      properties: Readonly<Record<ToolArgKey<K>, SchemaProperty>>
      required?: readonly ToolArgKey<K>[]
      example?: string
    }
    execute: (
      args: Readonly<Partial<Record<ToolArgKey<K>, unknown>>>
    ) => Promise<WebMcpToolResult>
  }

export type ModelContext = {
  registerTool: <K extends string | readonly string[]>(
    tool: WebMcpToolDescriptor<K>,
    options?: { signal?: AbortSignal }
  ) => Promise<void>
}

declare global {
  interface Document {
    // Present only under the WebMCP origin trial / testing flag.
    readonly modelContext?: ModelContext
  }
}

export const webMcpToolResultConstructor = (
  value: string,
  isError: boolean = false
): WebMcpToolResult => ({
  content: [{ text: value, type: "text" }],
  isError: isError,
})

// The page a `route` belongs to, matched leniently: an agent asked for "the
// timeline page" should not fail on the article.
export function findPage(query: string): PageLink | undefined {
  const needle = query.trim().toLowerCase()
  if (needle === "") return undefined
  return (
    PAGE_LINKS.find((page) => page.name === needle) ??
    PAGE_LINKS.find((page) => needle.includes(page.name))
  )
}

export type NavigateFn = (route: PageRoute) => void

/**
 * What the React layer lends the tools.
 *
 * `currentLocale` is a GETTER, not a value: `buildSiteTools` is called once
 * when the component mounts, so a plain `locale` would be frozen at whatever
 * language the page loaded in and every later answer would be wrong.
 */
export type SiteToolsBridge = {
  navigate: NavigateFn
  currentLocale: () => Locale
  setLocale: (locale: Locale) => void
  currentTheme: () => Theme
  setCurrentTheme: (theme: Theme) => void
  showWorkLocation: () => WebMcpToolResult
  showWidgetsState: (
    widgetNames: AvailableWidgetName[]
  ) => Partial<Record<AvailableWidgetName, boolean>>
  toggleWidgets: (
    widgets: Partial<Record<AvailableWidgetName, boolean>>
  ) => WebMcpToolResult
}

export function buildSiteTools({
  currentLocale,
  currentTheme,
  navigate,
  setLocale,
  showWidgetsState,
  setCurrentTheme,
  showWorkLocation,
  toggleWidgets,
}: SiteToolsBridge): readonly [
  listPages: WebMcpToolDescriptor,
  goToPage: WebMcpToolDescriptor<"page">,
  language: WebMcpToolDescriptor<"language">,
  theme: WebMcpToolDescriptor<"theme">,
  workLocation: WebMcpToolDescriptor,
  // `typeof WIDGET_NAMES`, not a hand-written union: the widget registry is the
  // source of truth, so adding one there widens this tool's arguments too.
  widgets: WebMcpToolDescriptor<typeof WIDGET_NAMES>,
] {
  // Declared separately so each gets its OWN argument-key parameter. Returning
  // an array literal collapses both to the default `never`, which silently
  // un-types every `execute` argument — the failure the generic exists to stop.
  const listPages: WebMcpToolDescriptor = {
    description:
      "List the pages of this site that can be navigated to. Read-only.",
    execute: async () => webMcpToolResultConstructor(PAGE_NAMES.join(", ")),
    inputSchema: { properties: {}, type: "object" },
    name: "kangaflow-list-pages",
  }

  const goToPage: WebMcpToolDescriptor<"page"> = {
    description:
      "Navigate this site to one of its pages. Call kangaflow-list-pages first " +
      "if unsure which pages exist.",
    execute: async ({ page }) => {
      // `page` is `unknown`: it comes from a model, so the guard is the real
      // validation and the type does not pretend otherwise.
      if (typeof page !== "string")
        return webMcpToolResultConstructor("Which page? Give me a name.", true)
      const hit = findPage(page)
      // Naming the real options beats "not found" — the model can retry
      // without a second round trip through list-pages.
      if (!hit)
        return webMcpToolResultConstructor(
          `No page called "${page}". Available: ${PAGE_NAMES.join(", ")}.`,
          true
        )
      navigate(hit.route)
      return webMcpToolResultConstructor(`Opened the ${hit.name} page.`)
    },
    inputSchema: {
      properties: {
        page: {
          description: `One of: ${PAGE_NAMES.join(", ")}`,
          type: "string",
        },
      },
      required: ["page"],
      type: "object",
    },
    name: "kangaflow-go-to-page",
  }

  const language: WebMcpToolDescriptor<"language"> = {
    description:
      "Switch the site between its languages, or report the current one. " +
      "Call with no arguments to read it.",
    execute: async ({ language: next }) => {
      // Omitted means READ — the same contract as every other optional
      // argument here, so an agent does not have to learn two conventions.
      if (next === undefined)
        return webMcpToolResultConstructor(`The site is in ${currentLocale()}.`)
      // `isLocale` is the project's own guard, so "fr" is refused here rather
      // than reaching setLocale and half-applying (URL swapped, no dictionary).
      if (typeof next !== "string" || !isLocale(next))
        return webMcpToolResultConstructor(
          `I cannot switch to "${String(next)}". Available: ${LOCALES.join(", ")}.`,
          true
        )
      if (next === currentLocale())
        return webMcpToolResultConstructor(`Already in ${next}.`, true)
      setLocale(next)
      return webMcpToolResultConstructor(`Switched to ${next}.`)
    },
    inputSchema: {
      properties: {
        language: {
          description: `One of: ${LOCALES.join(", ")}. Omit to read the current one.`,
          type: "string",
        },
      },
      type: "object",
    },
    name: "kangaflow-language",
  }

  const theme: WebMcpToolDescriptor<"theme"> = {
    description:
      "Switch the site's theme, or report the current one. " +
      "Call with no arguments to read it.",
    execute: async ({ theme: next }) => {
      // Omitted means READ — the same contract as every other optional
      // argument here, so an agent does not have to learn two conventions.
      if (next === undefined)
        return webMcpToolResultConstructor(`The site is in ${currentTheme()}.`)
      if (typeof next !== "string" || !isTheme(next))
        return webMcpToolResultConstructor(
          `I cannot switch to "${String(next)}". Available: ${THEMES.join(", ")}.`,
          true
        )
      if (next === currentTheme())
        return webMcpToolResultConstructor(`Already in ${next}.`, true)
      setCurrentTheme(next)
      return webMcpToolResultConstructor(`Switched to ${next}.`)
    },
    inputSchema: {
      properties: {
        theme: {
          description: `One of: ${THEMES.join(", ")}. Omit to read the current one.`,
          type: "string",
        },
      },
      type: "object",
    },
    name: "kangaflow-theme",
  }

  const workLocation: WebMcpToolDescriptor = {
    description:
      "Show the HeaderDate popover component in its open state that shows KangaZero's work location " +
      "If not on homepage navigate to it first, this component only exists on the homepage",
    execute: async () => {
      return showWorkLocation()
    },
    inputSchema: { properties: {}, type: "object" },
    name: "kangaflow-show-work-location",
  }

  const widgets: WebMcpToolDescriptor<typeof WIDGET_NAMES> = {
    description:
      "Toggle this site's widgets on and off. Pass a widget as true to flip it. " +
      "Call with no arguments to read which widgets exist and their current state.",
    // Driven off WIDGET_NAMES rather than destructuring the four keys: a
    // destructure is a fifth spelling of the widget list, and `"media-player"`
    // is not even a valid binding name without renaming it.
    execute: async (args) => {
      // Omitted means READ — same contract as the language and theme tools, so
      // an agent does not have to learn a second convention.
      const currentPath = window?.location.pathname
      const rest = currentPath
        .replace(/^\/(?:en|ja)(?=\/|$)/, "")
        .replace(/\/$/, "")

      const isEnvironment = rest.startsWith("/environment")

      const availableWidgetsOnPage = isEnvironment
        ? AVAILABLE_WIDGETS
        : AVAILABLE_WIDGETS.filter((widget) => widget.global !== isEnvironment)

      const availableWidgetNamesOnPage = availableWidgetsOnPage.map(
        (widget) => widget.name
      )

      const namedWidgets = availableWidgetNamesOnPage.filter(
        (widget) => widget in args
      )
      if (namedWidgets.length === 0) {
        const availableWidgetStates = showWidgetsState(
          availableWidgetNamesOnPage
        )
        return webMcpToolResultConstructor(
          `Available widgets: ${JSON.stringify(availableWidgetStates)}`
        )
      }
      // Values arrive from a model, so the guard is the real validation: a
      // string "true" is refused here rather than silently counting as false.
      const malformed = namedWidgets.filter(
        (widget) => typeof args[widget] !== "boolean"
      )
      if (malformed.length > 0)
        return webMcpToolResultConstructor(
          `Widget arguments must be true or false. Not boolean: ${malformed.join(", ")}`,
          true
        )

      const invalidNames = Object.keys(args).filter(
        (widget) => !namedWidgets.includes(widget as AvailableWidgetName)
      )
      if (invalidNames.length > 0)
        return webMcpToolResultConstructor(
          `Widget arguments contains invalid keys: ${invalidNames.join(", ")}`,
          true
        )

      return toggleWidgets(
        args as Partial<Record<AvailableWidgetName, boolean>>
      )
    },
    inputSchema: {
      properties: flagProperties(
        WIDGET_NAMES,
        (widget) => `Set true to toggle the ${widget} widget.`
      ),
      type: "object",
    },
    name: "kangaflow-toggle-widgets",
  }

  return [listPages, goToPage, language, theme, workLocation, widgets]
}
