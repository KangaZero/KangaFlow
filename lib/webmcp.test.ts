// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it, vi } from "vitest"
import { PAGE, PAGE_NAMES } from "@/lib/pages"
import { buildNavigationTools, findPage } from "@/lib/webmcp"

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

describe("buildNavigationTools", () => {
  it("lists exactly the pages PAGE declares", async () => {
    // Both read PAGE; this fails the moment a second list appears.
    const [list] = buildNavigationTools(vi.fn())
    expect(await run(list)).toBe(PAGE_NAMES.join(", "))
  })

  it("navigates by ROUTE, not by display name", async () => {
    // home's route is "" — pushing "/en/home/" would 404.
    const navigate = vi.fn()
    const [, go] = buildNavigationTools(navigate)
    await run(go, { page: "home" })
    expect(navigate).toHaveBeenCalledWith(PAGE.home.route)
  })

  it("opens a real page", async () => {
    const navigate = vi.fn()
    const [, go] = buildNavigationTools(navigate)
    expect(await run(go, { page: "timeline" })).toContain("timeline")
    expect(navigate).toHaveBeenCalledWith("timeline")
  })

  it("names the real options when the page is unknown", async () => {
    // Cheaper than "not found": the model retries without calling list-pages.
    const navigate = vi.fn()
    const [, go] = buildNavigationTools(navigate)
    expect(await run(go, { page: "contact" })).toContain("achievements")
    expect(navigate).not.toHaveBeenCalled()
  })

  it("does not navigate when `page` is not a string", async () => {
    // The args come from a model, so the guard is the real validation.
    const navigate = vi.fn()
    const [, go] = buildNavigationTools(navigate)
    await run(go, { page: 42 })
    expect(navigate).not.toHaveBeenCalled()
  })
})
