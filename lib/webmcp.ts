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

import { isLocale, LOCALES, type Locale } from "@/lib/i18n"
import {
  PAGE_LINKS,
  PAGE_NAMES,
  type PageLink,
  type PageRoute,
} from "@/lib/pages"
import { isTheme, THEMES, type Theme } from "@/lib/themes"

type WebMcpContentBlock = {
  text: { type: "text"; text: string }
  // image: { type: "image"; data: string; mimeType: string };
}

export type WebMcpToolResult<T extends keyof WebMcpContentBlock = "text"> = {
  content: ReadonlyArray<WebMcpContentBlock[T]>
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

// Parameterised by its own argument KEYS. `K` ties together the keys declared
// in `properties`, the keys `required` may name, and the keys `execute` may
// destructure — misspell one and it is a type error, where `Record<string,
// unknown>` let `execute({ pge })` compile and receive `undefined` forever.
//
// The VALUES stay `unknown` deliberately: the arguments come from a language
// model, so `page: string` would be a claim neither the compiler nor the
// runtime can back. The `typeof` guard in `execute` is the real validation.
export type WebMcpToolDescriptor<K extends string = never> = {
  name: WebMcpToolName
  description: string
  inputSchema: {
    type: "object"
    properties: Readonly<Record<K, SchemaProperty>>
    required?: readonly K[]
  }
  execute: (
    args: Readonly<Partial<Record<K, unknown>>>
  ) => Promise<WebMcpToolResult>
}

export type ModelContext = {
  registerTool: <K extends string>(
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
}

export function buildSiteTools({
  currentLocale,
  currentTheme,
  navigate,
  setLocale,
  setCurrentTheme,
  showWorkLocation,
}: SiteToolsBridge): readonly [
  // WebMcpToolDescriptor,
  WebMcpToolDescriptor,
  WebMcpToolDescriptor<"page">,
  WebMcpToolDescriptor<"language">,
  WebMcpToolDescriptor<"theme">,
  WebMcpToolDescriptor, //workLocation TODO: Make this more obvious
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

  return [listPages, goToPage, language, theme, workLocation]
}
