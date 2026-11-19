// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  NAV_ORDER,
  navPositionLabel,
  PAGE_NAMES,
  pageFromPathname,
  positionLabel,
} from "@/lib/pages"

describe("NAV_ORDER", () => {
  it("lists every page exactly once", () => {
    expect([...NAV_ORDER].sort()).toEqual([...PAGE_NAMES].sort())
  })
})

describe("navPositionLabel", () => {
  it("numbers pages from 1, zero-padded, against the nav length", () => {
    expect(navPositionLabel("home")).toBe("01 / 04")
    expect(navPositionLabel("achievements")).toBe("02 / 04")
    expect(navPositionLabel("timeline")).toBe("03 / 04")
    expect(navPositionLabel("environment")).toBe("04 / 04")
  })
})

describe("pageFromPathname", () => {
  it("reads a usePathname() path", () => {
    expect(pageFromPathname("/en/timeline/")).toBe("timeline")
    expect(pageFromPathname("/ja/")).toBe("home")
    expect(pageFromPathname("/en")).toBe("home")
  })

  it("reads a production location.pathname with the basePath", () => {
    expect(pageFromPathname("/KangaFlow/en/environment/")).toBe("environment")
  })

  it("returns undefined off the page map", () => {
    expect(pageFromPathname("/")).toBeUndefined()
    expect(pageFromPathname("/en/contact/")).toBeUndefined()
  })
})

describe("positionLabel", () => {
  it("pads both sides and counts from one", () => {
    expect(positionLabel(1, 4)).toBe("02 / 04")
    expect(positionLabel(9, 12)).toBe("10 / 12")
  })
})
