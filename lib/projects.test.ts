// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  CONTRIBUTIONS,
  DEFAULT_CARD_ORDER,
  languageShares,
  moveInOrder,
  moveVars,
  PROJECT_CARD_IDS,
  PROJECT_CARDS,
  parseCardOrder,
  revealOrder,
} from "@/lib/projects"

describe("languageShares", () => {
  it("keeps the top known languages and folds the rest into Other", () => {
    const shares = languageShares(
      { CSS: 50, Just: 10, Ruby: 40, TypeScript: 900 },
      2
    )
    expect(shares).toEqual([
      { language: "TypeScript", percent: 90 },
      { language: "CSS", percent: 5 },
      { language: "Other", percent: 5 },
    ])
  })

  it("folds languages without an icon into Other even when large", () => {
    expect(languageShares({ Ruby: 100 })).toEqual([
      { language: "Other", percent: 100 },
    ])
  })

  it("is empty for empty input", () => {
    expect(languageShares({})).toEqual([])
  })
})

describe("cards", () => {
  it("has one card per id, each with three moves", () => {
    for (const id of PROJECT_CARD_IDS) {
      expect(PROJECT_CARDS[id].id).toBe(id)
      expect(PROJECT_CARDS[id].moves).toHaveLength(3)
    }
  })

  it("has exactly one SSR", () => {
    expect(
      PROJECT_CARD_IDS.filter((id) => PROJECT_CARDS[id].rarity === "ssr")
    ).toEqual(["desktop"])
  })
})

describe("parseCardOrder", () => {
  it("falls back to the default for non-arrays", () => {
    expect(parseCardOrder("nope")).toEqual(DEFAULT_CARD_ORDER)
    expect(parseCardOrder(null)).toEqual(DEFAULT_CARD_ORDER)
  })

  it("drops unknown and duplicate ids and appends missing ones", () => {
    expect(parseCardOrder(["supporter", "x", "supporter", "desktop"])).toEqual([
      "supporter",
      "desktop",
      "neomouse",
      "helloWorldPp",
    ])
  })
})

describe("moveInOrder", () => {
  it("moves a card to a new slot", () => {
    expect(moveInOrder(DEFAULT_CARD_ORDER, "neomouse", 3)).toEqual([
      "desktop",
      "helloWorldPp",
      "supporter",
      "neomouse",
    ])
  })

  it("clamps out-of-range targets", () => {
    expect(moveInOrder(DEFAULT_CARD_ORDER, "supporter", -5)[0]).toBe(
      "supporter"
    )
  })
})

describe("revealOrder", () => {
  it("keeps hand order but lands the SSR last", () => {
    expect(revealOrder(DEFAULT_CARD_ORDER)).toEqual([
      "neomouse",
      "helloWorldPp",
      "supporter",
      "desktop",
    ])
  })
})

describe("moveVars", () => {
  it("formats the maintained packages per locale and counts them", () => {
    const en = moveVars("en")
    const ja = moveVars("ja")
    expect(en.count).toBe(CONTRIBUTIONS.nixpkgsMaintained.length)
    expect(String(en.packages)).toContain("and")
    expect(String(ja.packages)).not.toContain("and")
    expect(en.tools).toBeGreaterThan(0)
  })
})
