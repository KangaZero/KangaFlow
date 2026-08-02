import { describe, expect, it } from "vitest"

import {
  buildPageFiles,
  flatFileForSource,
  hrefForPage,
  pageByName,
  pageForRoute,
  TERMINAL_PAGE_NAMES,
  TERMINAL_PAGES,
} from "@/lib/terminal/pages"

describe("TERMINAL_PAGE_NAMES", () => {
  it("is the page names, sorted", () => {
    expect(TERMINAL_PAGE_NAMES).toEqual([
      "achievements",
      "environment",
      "home",
      "timeline",
    ])
  })
})

describe("pageByName", () => {
  it("finds a page, or undefined for an unknown name", () => {
    expect(pageByName("timeline")?.route).toBe("timeline")
    expect(pageByName("nope")).toBeUndefined()
  })
})

describe("pageForRoute", () => {
  it("maps a locale-only route to home", () => {
    expect(pageForRoute("/en")?.name).toBe("home")
  })

  it("maps a nested route to its page regardless of locale", () => {
    expect(pageForRoute("/ja/achievements")?.name).toBe("achievements")
  })

  it("returns undefined for an unknown route", () => {
    expect(pageForRoute("/en/nope")).toBeUndefined()
  })
})

describe("hrefForPage", () => {
  it("drops the sub-path for home and keeps it otherwise", () => {
    const home = pageByName("home")
    const timeline = pageByName("timeline")
    if (!(home && timeline)) throw new Error("missing fixture page")
    expect(hrefForPage("en", home)).toBe("/en")
    expect(hrefForPage("ja", timeline)).toBe("/ja/timeline")
  })
})

describe("buildPageFiles", () => {
  it("maps real source paths to flat <dir>/index.tsx files", () => {
    const source = Object.fromEntries(
      TERMINAL_PAGES.map((page) => [page.source, `// ${page.name}`])
    )
    const flat = buildPageFiles(source)
    expect(flat["index.tsx"]).toBe("// home")
    expect(flat["timeline/index.tsx"]).toBe("// timeline")
  })

  it("skips pages whose source is missing", () => {
    expect(buildPageFiles({})).toEqual({})
  })
})

describe("flatFileForSource", () => {
  it("maps a real deep source path to its flat file", () => {
    expect(flatFileForSource("app/[lang]/achievements/page.tsx")).toBe(
      "achievements/index.tsx"
    )
    expect(flatFileForSource("nope")).toBeUndefined()
  })
})
