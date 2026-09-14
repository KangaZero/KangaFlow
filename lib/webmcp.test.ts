// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it, vi } from "vitest"
import { PAGE, PAGE_NAMES } from "@/lib/pages"
import {
  buildSiteTools,
  findPage,
  type SiteToolsBridge,
  webMcpToolResultConstructor,
} from "@/lib/webmcp"

// One place the bridge shape is built, so adding a capability does not mean
// editing every case. Annotated `SiteToolsBridge` rather than inferred: a new
// capability then fails HERE once, instead of at every call site.
const bridge = (over: Partial<SiteToolsBridge> = {}): SiteToolsBridge => ({
  currentLocale: () => "en",
  currentTheme: () => "light",
  navigate: vi.fn(),
  setCurrentTheme: vi.fn(),
  setLocale: vi.fn(),
  showWidgetsState: () => ({}),
  showWorkLocation: () => webMcpToolResultConstructor("stub"),
  toggleWidgets: () => webMcpToolResultConstructor("stub"),
  ...over,
})

const run = async (
  tool: {
    execute: (
      a: Record<string, unknown>
    ) => Promise<{ content: readonly { text: string }[] }>
  },
  args: Record<string, unknown> = {}
) => (await tool.execute(args)).content[0]?.text ?? ""

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
    expect(await run(list)).toBe(PAGE_NAMES.join(", "))
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
})
