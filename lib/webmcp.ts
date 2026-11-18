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

import type { PortfolioSlug } from "@/components/timeline-portfolios"
import { getAchievementLabels } from "@/lib/achievement-labels"
import type { Achievement } from "@/lib/achievements"
import { isLocale, LOCALES, type Locale, t } from "@/lib/i18n"
import {
  PAGE_LINKS,
  PAGE_NAMES,
  type PageLink,
  type PageName,
  type PageRoute,
} from "@/lib/pages"
import { person } from "@/lib/person"
import { isTheme, THEMES, type Theme } from "@/lib/themes"
import {
  type AvailableWidgetName,
  isWidgetName,
  WIDGET_NAMES,
  widgetsOnPage,
} from "@/lib/widgets"

// What `execute` hands back. The spec takes ANY JSON-serialisable value and
// gives it to the agent as a JSON string; there is no MCP `content`/`isError`
// envelope in the core API (frameworks add one, browsers ignore it). So a
// success is a sentence plus optional structured data, and a recoverable
// failure is `{ error }`: Chrome's guidance, because a THROWN error reaches
// the agent as a generic failure with its message dropped.
// https://developer.chrome.com/docs/modern-web-guidance/guides/webmcp/agentic-javascript-tools
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue }

export type WebMcpToolResult =
  | { readonly message: string; readonly data?: JsonValue }
  | { readonly error: string }

/** A successful call: what happened, plus data the agent can reason over. */
export function toolOk(message: string, data?: JsonValue): WebMcpToolResult {
  return data === undefined ? { message } : { data, message }
}

/** A recoverable failure, phrased so the agent can retry without guessing. */
export function toolError(error: string): WebMcpToolResult {
  return { error }
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
  "kangaflow-achievements",
  "kangaflow-profile",
  "kangaflow-timeline",
] as const

// Use good ol document.querySelector !
export const WEBMCP_INTERACTIVE_ELEMENTS = {
  headerDatePopoverPrimitiveTrigger: "header-date-popover-primitive-trigger",
} as const

export type WebMcpToolName = (typeof WEBMCP_TOOL_NAMES)[number]

export function isWebMcpToolName(value: string): value is WebMcpToolName {
  return WEBMCP_TOOL_NAMES.some((name) => name === value)
}

/**
 * The tool a `toolactivated` / `toolcancel` event is about, or undefined.
 * Those events carry `toolName`, but they arrive typed as a plain `Event`, and
 * a name this site never registered is not ours to show; so the field is
 * checked at runtime rather than cast.
 */
export function toolNameOf(event: Event): WebMcpToolName | undefined {
  if (!("toolName" in event)) return undefined
  const { toolName } = event
  return typeof toolName === "string" && isWebMcpToolName(toolName)
    ? toolName
    : undefined
}

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

// Hints the browser shows or acts on (spec `ToolAnnotations`). Only the keys
// the spec defines: MCP's destructiveHint/idempotentHint/openWorldHint are not
// part of WebMCP. Declare them honestly; agents use them to decide whether a
// call needs the user's confirmation.
type WebMcpToolAnnotations = {
  /** Reads state, changes nothing. */
  readOnlyHint?: boolean
  /** The result carries text a third party (or the user) wrote. */
  untrustedContentHint?: boolean
  /** Has effects outside the page the user should know about. */
  consequentialHint?: boolean
}

// Second argument the browser passes to `execute`: aborted when the agent or
// user cancels THIS call (distinct from the registration signal).
export type WebMcpExecuteOptions = { readonly signal: AbortSignal }

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
    /** Human-readable label for browser UI; `name` is the machine id. */
    title: string
    description: string
    annotations?: WebMcpToolAnnotations
    inputSchema: {
      type: "object"
      properties: Readonly<Record<ToolArgKey<K>, SchemaProperty>>
      required?: readonly ToolArgKey<K>[]
    }
    execute: (
      args: Readonly<Partial<Record<ToolArgKey<K>, unknown>>>,
      options: WebMcpExecuteOptions
    ) => Promise<WebMcpToolResult>
  }

// The subset of the spec's `ModelContext` this site uses (getTools/executeTool
// are for agents, not providers). Hand-written rather than the official
// `webmcp-types` package: the API is an origin trial that still changes
// between Chrome releases, and this declaration is generic over each tool's
// argument keys, which the official `ModelContextTool` (args: object) is not.
// https://webmachinelearning.github.io/webmcp/
//
// An EventTarget: it fires `toolactivated` when an agent starts a call and
// `toolcancel` when one is cancelled, each with a `toolName`.
export type ModelContext = EventTarget & {
  registerTool: <K extends string | readonly string[]>(
    tool: WebMcpToolDescriptor<K>,
    options?: {
      /** Abort to unregister (the spec has no unregisterTool()). */
      signal?: AbortSignal
      /** Extra origins allowed to see the tool; same-origin only otherwise. */
      exposedTo?: readonly string[]
    }
  ) => Promise<undefined>
}

declare global {
  interface Document {
    // Present only under the WebMCP origin trial / testing flag, and only in
    // a secure context.
    readonly modelContext?: ModelContext
  }
}

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

/** A timeline entry as the tools see it: the facts, without the image. */
export type TimelineEntry = {
  readonly slug: PortfolioSlug
  readonly name: string
  readonly year: string
  readonly liveUrl: string
  readonly repoUrl: string
  readonly current?: boolean
}

/**
 * What the React layer lends the tools.
 *
 * Everything that changes is a GETTER, not a value: `buildSiteTools` is
 * called once when the component mounts, so a plain `locale` or `page` would
 * be frozen at whatever the page loaded with and every later answer would be
 * wrong. The DOM and the URL stay on the React side; this file only decides.
 */
export type SiteToolsBridge = {
  navigate: NavigateFn
  currentPage: () => PageName | undefined
  currentLocale: () => Locale
  setLocale: (locale: Locale) => void
  currentTheme: () => Theme
  setCurrentTheme: (theme: Theme) => void
  showWorkLocation: () => WebMcpToolResult
  widgetStates: () => Readonly<Record<AvailableWidgetName, boolean>>
  setWidgetOpen: (widget: AvailableWidgetName, open: boolean) => void
  achievements: () => readonly Achievement[]
  /** Static, so a value rather than a getter. */
  portfolios: readonly TimelineEntry[]
}

export function buildSiteTools({
  achievements,
  currentLocale,
  currentPage,
  currentTheme,
  navigate,
  portfolios,
  setCurrentTheme,
  setLocale,
  setWidgetOpen,
  showWorkLocation,
  widgetStates,
}: SiteToolsBridge): readonly [
  listPages: WebMcpToolDescriptor,
  goToPage: WebMcpToolDescriptor<"page">,
  language: WebMcpToolDescriptor<"language">,
  theme: WebMcpToolDescriptor<"theme">,
  workLocation: WebMcpToolDescriptor,
  // `typeof WIDGET_NAMES`, not a hand-written union: the widget registry is the
  // source of truth, so adding one there widens this tool's arguments too.
  widgets: WebMcpToolDescriptor<typeof WIDGET_NAMES>,
  achievementsTool: WebMcpToolDescriptor,
  profile: WebMcpToolDescriptor,
  timeline: WebMcpToolDescriptor,
] {
  // Declared separately so each gets its OWN argument-key parameter. Returning
  // an array literal collapses both to the default `never`, which silently
  // un-types every `execute` argument — the failure the generic exists to stop.
  const listPages: WebMcpToolDescriptor = {
    annotations: { readOnlyHint: true },
    description:
      "List the pages of this site that can be navigated to. Read-only.",
    execute: async () =>
      toolOk(`Pages: ${PAGE_NAMES.join(", ")}.`, [...PAGE_NAMES]),
    inputSchema: { properties: {}, type: "object" },
    name: "kangaflow-list-pages",
    title: "List pages",
  }

  const goToPage: WebMcpToolDescriptor<"page"> = {
    description:
      "Navigate this site to one of its pages. Call kangaflow-list-pages first " +
      "if unsure which pages exist.",
    execute: async ({ page }) => {
      // `page` is `unknown`: it comes from a model, so the guard is the real
      // validation and the type does not pretend otherwise.
      if (typeof page !== "string")
        return toolError("Which page? Give me a name.")
      const hit = findPage(page)
      // Naming the real options beats "not found" — the model can retry
      // without a second round trip through list-pages.
      if (!hit)
        return toolError(
          `No page called "${page}". Available: ${PAGE_NAMES.join(", ")}.`
        )
      navigate(hit.route)
      return toolOk(`Opened the ${hit.name} page.`)
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
    title: "Go to page",
  }

  const language: WebMcpToolDescriptor<"language"> = {
    description:
      "Switch the site between its languages, or report the current one. " +
      "Call with no arguments to read it.",
    execute: async ({ language: next }) => {
      // Omitted means READ — the same contract as every other optional
      // argument here, so an agent does not have to learn two conventions.
      if (next === undefined)
        return toolOk(`The site is in ${currentLocale()}.`)
      // `isLocale` is the project's own guard, so "fr" is refused here rather
      // than reaching setLocale and half-applying (URL swapped, no dictionary).
      if (typeof next !== "string" || !isLocale(next))
        return toolError(
          `I cannot switch to "${String(next)}". Available: ${LOCALES.join(", ")}.`
        )
      if (next === currentLocale())
        return toolOk(`Already in ${next}; nothing changed.`)
      setLocale(next)
      return toolOk(`Switched to ${next}.`)
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
    title: "Language",
  }

  const theme: WebMcpToolDescriptor<"theme"> = {
    description:
      "Switch the site's theme, or report the current one. " +
      "Call with no arguments to read it.",
    execute: async ({ theme: next }) => {
      // Omitted means READ — the same contract as every other optional
      // argument here, so an agent does not have to learn two conventions.
      if (next === undefined) return toolOk(`The site is in ${currentTheme()}.`)
      if (typeof next !== "string" || !isTheme(next))
        return toolError(
          `I cannot switch to "${String(next)}". Available: ${THEMES.join(", ")}.`
        )
      if (next === currentTheme())
        return toolOk(`Already in ${next}; nothing changed.`)
      setCurrentTheme(next)
      return toolOk(`Switched to ${next}.`)
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
    title: "Theme",
  }

  const workLocation: WebMcpToolDescriptor = {
    description:
      "Open the popover that shows KangaZero's work location. It only exists " +
      "on the home page; go there with kangaflow-go-to-page first.",
    execute: async () => showWorkLocation(),
    inputSchema: { properties: {}, type: "object" },
    name: "kangaflow-show-work-location",
    title: "Show work location",
  }

  const widgets: WebMcpToolDescriptor<typeof WIDGET_NAMES> = {
    description:
      "Open or close this site's widgets. Pass a widget as true to open it or " +
      "false to close it. Call with no arguments to list the widgets on the " +
      "current page and whether each is open. Only media-player exists " +
      "outside the environment page.",
    // Driven off the registry rather than destructuring the keys: a
    // destructure is another spelling of the widget list, and `"media-player"`
    // is not even a valid binding name without renaming it.
    execute: async (args) => {
      const onPage = widgetsOnPage(currentPage())
      const entries = Object.entries(args)

      // Omitted means READ, the same contract as the language and theme tools.
      if (entries.length === 0) {
        const states = widgetStates()
        return toolOk(
          "Widgets on this page, and whether each is open.",
          Object.fromEntries(onPage.map((widget) => [widget, states[widget]]))
        )
      }

      // Every argument is checked before ANY widget changes, so a call with
      // one bad key does not half-apply. Values arrive from a model, so a
      // string "true" is refused rather than silently counting as false.
      const changes: [AvailableWidgetName, boolean][] = []
      const problems: string[] = []
      for (const [key, value] of entries) {
        if (!isWidgetName(key)) problems.push(`"${key}" is not a widget`)
        else if (!onPage.includes(key))
          problems.push(`${key} only exists on the environment page`)
        else if (typeof value !== "boolean")
          problems.push(`${key} must be true or false`)
        else changes.push([key, value])
      }
      if (problems.length > 0)
        return toolError(
          `${problems.join("; ")}. Available here: ${onPage.join(", ")}.`
        )

      for (const [widget, open] of changes) setWidgetOpen(widget, open)
      const summary = changes
        .map(([widget, open]) => `${widget} ${open ? "opened" : "closed"}`)
        .join(", ")
      return toolOk(`${summary}.`)
    },
    inputSchema: {
      properties: flagProperties(
        WIDGET_NAMES,
        (widget) => `true opens the ${widget} widget, false closes it.`
      ),
      type: "object",
    },
    name: "kangaflow-toggle-widgets",
    title: "Widgets",
  }

  // Results are in English whatever the site locale: an agent's language is
  // independent of the page's (see the rule-4 note at the top), and the same
  // masking helper as the UI decides what a secret achievement may reveal.
  const english = <K extends Parameters<typeof t>[0]>(key: K) => t(key, "en")

  const achievementsTool: WebMcpToolDescriptor = {
    annotations: { readOnlyHint: true },
    description:
      "List this site's achievements: which are unlocked, their rarity and " +
      "what each is for. Locked secret achievements stay masked.",
    execute: async () => {
      const list = achievements().map((achievement) => {
        const labels = getAchievementLabels(achievement, english)
        return {
          description: labels.description,
          // A secret's id would give it away, so masked rows have none.
          id: labels.hidden ? null : achievement.id,
          rarity: labels.rarityLabel,
          title: labels.title,
          unlocked: achievement.isUnlocked,
          unlockedAt: achievement.isUnlocked ? achievement.unlockedAt : null,
        }
      })
      const unlocked = list.filter((row) => row.unlocked).length
      return toolOk(`${unlocked} of ${list.length} unlocked.`, list)
    },
    inputSchema: { properties: {}, type: "object" },
    name: "kangaflow-achievements",
    title: "Achievements",
  }

  const profile: WebMcpToolDescriptor = {
    annotations: { readOnlyHint: true },
    description:
      "Who runs this site: name, role, employer, skills, work history, " +
      "projects and contact links.",
    execute: async () =>
      toolOk(`${person.name}, ${person.role} at ${person.workplace}.`, {
        contact: person.socials.map(({ href, name }) => ({ href, name })),
        experience: person.work.experiences.map(
          ({ company, role, timeframe }) => ({ company, role, timeframe })
        ),
        intro: person.intro,
        name: person.name,
        projects: person.projects.map(({ description, links, name }) => ({
          description,
          links: links.map(({ href }) => href),
          name,
        })),
        role: person.role,
        skills: person.technologies.map(({ category, name }) => ({
          category,
          name,
        })),
        studies: person.studies,
        workplace: person.workplace,
      }),
    inputSchema: { properties: {}, type: "object" },
    name: "kangaflow-profile",
    title: "Profile",
  }

  const timeline: WebMcpToolDescriptor = {
    annotations: { readOnlyHint: true },
    description:
      "Every portfolio site the owner has shipped, oldest first, with live " +
      "and source links. Open the timeline page to see them.",
    execute: async () =>
      toolOk(
        `${portfolios.length} portfolios, oldest first.`,
        portfolios.map((entry) => ({
          current: entry.current ?? false,
          description: english(`timeline.entries.${entry.slug}`),
          liveUrl: entry.liveUrl,
          name: entry.name,
          repoUrl: entry.repoUrl,
          year: entry.year,
        }))
      ),
    inputSchema: { properties: {}, type: "object" },
    name: "kangaflow-timeline",
    title: "Timeline",
  }

  return [
    listPages,
    goToPage,
    language,
    theme,
    workLocation,
    widgets,
    achievementsTool,
    profile,
    timeline,
  ]
}
