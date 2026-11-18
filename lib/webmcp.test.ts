// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it, vi } from "vitest"
import { applyUnlock, createInitialAchievements } from "@/lib/achievements"
import { PAGE, PAGE_NAMES } from "@/lib/pages"
import {
  buildSiteTools,
  findPage,
  type SiteToolsBridge,
  toolNameOf,
  toolOk,
  type WebMcpExecuteOptions,
  type WebMcpToolResult,
} from "@/lib/webmcp"

// One place the bridge shape is built, so adding a capability does not mean
// editing every case. Annotated `SiteToolsBridge` rather than inferred: a new
// capability then fails HERE once, instead of at every call site.
const bridge = (over: Partial<SiteToolsBridge> = {}): SiteToolsBridge => ({
  achievements: () => createInitialAchievements(),
  currentLocale: () => "en",
  currentPage: () => "home",
  currentTheme: () => "light",
  navigate: vi.fn(),
  portfolios: [
    {
      liveUrl: "https://example.test/",
      name: "First",
      repoUrl: "https://example.test/repo",
      slug: "personalPortfolio",
      year: "2022",
    },
  ],
  setCurrentTheme: vi.fn(),
  setLocale: vi.fn(),
  setWidgetOpen: vi.fn(),
  showWorkLocation: () => toolOk("stub"),
  widgetStates: () => ({
    alarm: false,
    calendar: true,
    keyboard: false,
    "media-player": true,
    notes: false,
  }),
  ...over,
})

const options: WebMcpExecuteOptions = { signal: new AbortController().signal }

// The text an agent reads back: the sentence on success, the reason on error.
const text = (result: WebMcpToolResult) =>
  "error" in result ? result.error : result.message

const run = async (
  tool: {
    execute: (
      a: Record<string, unknown>,
      o: WebMcpExecuteOptions
    ) => Promise<WebMcpToolResult>
  },
  args: Record<string, unknown> = {}
) => text(await tool.execute(args, options))

describe("findPage", () => {
  it("matches an exact name", () => {
    expect(findPage("timeline")?.route).toBe("timeline")
  })

  it("matches leniently — an agent says 'the timeline page', not 'timeline'", () => {
    expect(findPage("the timeline page")?.name).toBe("timeline")
  })

  it("is case-insensitive and trims", () => {
    expect(findPage("  Achievements ")?.name).toBe("achievements")
  })

  it("returns undefined for empty or unknown", () => {
    expect(findPage("   ")).toBeUndefined()
    expect(findPage("contact")).toBeUndefined()
  })
})

describe("buildSiteTools", () => {
  it("lists exactly the pages PAGE declares", async () => {
    // Both read PAGE; this fails the moment a second list appears.
    const [list] = buildSiteTools(bridge())
    expect(await list.execute({}, options)).toEqual(
      toolOk(`Pages: ${PAGE_NAMES.join(", ")}.`, [...PAGE_NAMES])
    )
  })

  it("navigates by ROUTE, not by display name", async () => {
    // home's route is "" — pushing "/en/home/" would 404.
    const navigate = vi.fn()
    const [, go] = buildSiteTools(bridge({ navigate }))
    await run(go, { page: "home" })
    expect(navigate).toHaveBeenCalledWith(PAGE.home.route)
  })

  it("opens a real page", async () => {
    const navigate = vi.fn()
    const [, go] = buildSiteTools(bridge({ navigate }))
    expect(await run(go, { page: "timeline" })).toContain("timeline")
    expect(navigate).toHaveBeenCalledWith("timeline")
  })

  it("names the real options when the page is unknown", async () => {
    // Cheaper than "not found": the model retries without calling list-pages.
    const navigate = vi.fn()
    const [, go] = buildSiteTools(bridge({ navigate }))
    expect(await run(go, { page: "contact" })).toContain("achievements")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("does not navigate when `page` is not a string", async () => {
    // The args come from a model, so the guard is the real validation.
    const navigate = vi.fn()
    const [, go] = buildSiteTools(bridge({ navigate }))
    await run(go, { page: 42 })
    expect(navigate).not.toHaveBeenCalled()
  })

  it("reports the current language when `language` is omitted", async () => {
    const setLocale = vi.fn()
    const [, , lang] = buildSiteTools(bridge({ setLocale }))
    expect(await run(lang)).toContain("en")
    expect(setLocale).not.toHaveBeenCalled()
  })

  it("switches to a supported language", async () => {
    const setLocale = vi.fn()
    const [, , lang] = buildSiteTools(bridge({ setLocale }))
    expect(await run(lang, { language: "ja" })).toContain("ja")
    expect(setLocale).toHaveBeenCalledWith("ja")
  })

  it("refuses an unsupported language and names the real ones", async () => {
    // Guarded here rather than in setLocale: an unknown locale would otherwise
    // swap the URL segment and leave the dictionary behind — half-applied.
    const setLocale = vi.fn()
    const [, , lang] = buildSiteTools(bridge({ setLocale }))
    const out = await run(lang, { language: "fr" })
    expect(out).toContain("en, ja")
    expect(setLocale).not.toHaveBeenCalled()
  })

  it("does not re-set the language it is already in", async () => {
    const setLocale = vi.fn()
    const [, , lang] = buildSiteTools(bridge({ setLocale }))
    expect(await run(lang, { language: "en" })).toContain("Already")
    expect(setLocale).not.toHaveBeenCalled()
  })

  it("treats 'already in that language' as success, not an error", async () => {
    const [, , lang] = buildSiteTools(bridge())
    expect(await lang.execute({ language: "en" }, options)).not.toHaveProperty(
      "error"
    )
  })
})

describe("widgets tool", () => {
  const widgetsTool = (over: Partial<SiteToolsBridge> = {}) =>
    buildSiteTools(bridge(over))[5]

  it("reads only the widgets on the current page when called bare", async () => {
    const home = await widgetsTool().execute({}, options)
    expect(home).toEqual(
      toolOk("Widgets on this page, and whether each is open.", {
        "media-player": true,
      })
    )
    const env = await widgetsTool({ currentPage: () => "environment" }).execute(
      {},
      options
    )
    expect("data" in env && env.data).toMatchObject({
      calendar: true,
      notes: false,
    })
  })

  it("SETS state: false closes, true opens", async () => {
    const setWidgetOpen = vi.fn()
    const tool = widgetsTool({
      currentPage: () => "environment",
      setWidgetOpen,
    })
    await tool.execute({ calendar: false, notes: true }, options)
    expect(setWidgetOpen).toHaveBeenCalledWith("calendar", false)
    expect(setWidgetOpen).toHaveBeenCalledWith("notes", true)
  })

  it("refuses an environment-only widget elsewhere, changing nothing", async () => {
    const setWidgetOpen = vi.fn()
    const out = await widgetsTool({ setWidgetOpen }).execute(
      { "media-player": false, notes: true },
      options
    )
    expect(text(out)).toContain("notes only exists on the environment page")
    expect(setWidgetOpen).not.toHaveBeenCalled()
  })

  it("refuses unknown keys and non-boolean values", async () => {
    const tool = widgetsTool({ currentPage: () => "environment" })
    expect(text(await tool.execute({ notes: "true" }, options))).toContain(
      "must be true or false"
    )
    expect(
      text(
        await tool.execute(
          { toaster: true } as Record<string, unknown>,
          options
        )
      )
    ).toContain('"toaster" is not a widget')
  })
})

describe("achievements tool", () => {
  const rows = async (over: Partial<SiteToolsBridge> = {}) => {
    const out = await buildSiteTools(bridge(over))[6].execute({}, options)
    return { data: "data" in out ? out.data : undefined, text: text(out) }
  }

  it("counts unlocked against the full catalogue", async () => {
    const unlocked = applyUnlock(
      createInitialAchievements(),
      "eos",
      "2026-11-18T00:00:00.000Z"
    )
    const { text: summary } = await rows({ achievements: () => unlocked })
    expect(summary).toBe(`1 of ${unlocked.length} unlocked.`)
  })

  it("never leaks a locked secret's id or title", async () => {
    const { data } = await rows()
    const serialized = JSON.stringify(data)
    // sand-mandala, psychopath and speedophile are secret.
    expect(serialized).not.toContain("speedophile")
    expect(serialized).not.toContain("sand-mandala")
    expect(serialized).toContain('"id":null')
  })
})

describe("profile and timeline tools", () => {
  it("profile carries contact links and no non-JSON values", async () => {
    const out = await buildSiteTools(bridge())[7].execute({}, options)
    expect(JSON.parse(JSON.stringify(out))).toEqual(out)
    expect(JSON.stringify(out)).toContain("github.com/KangaZero")
  })

  it("timeline returns each entry with its English description", async () => {
    const out = await buildSiteTools(bridge())[8].execute({}, options)
    expect(out).toMatchObject({
      data: [{ current: false, name: "First", year: "2022" }],
    })
    expect(JSON.stringify(out)).toContain("very first portfolio")
  })
})

describe("toolNameOf", () => {
  const withName = (toolName: unknown) =>
    Object.assign(new Event("toolactivated"), { toolName })

  it("reads a registered tool's name off the event", () => {
    expect(toolNameOf(withName("kangaflow-theme"))).toBe("kangaflow-theme")
  })

  it("ignores foreign names, non-strings and plain events", () => {
    expect(toolNameOf(withName("someone-elses-tool"))).toBeUndefined()
    expect(toolNameOf(withName(42))).toBeUndefined()
    expect(toolNameOf(new Event("toolactivated"))).toBeUndefined()
  })
})
