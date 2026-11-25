// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { moveInOrder, parseOrder } from "@/lib/card-order"

const IDS = ["a", "b", "c"] as const

describe("parseOrder", () => {
  it("falls back for non-arrays", () => {
    expect(parseOrder("nope", IDS)).toEqual(["a", "b", "c"])
    expect(parseOrder(null, IDS)).toEqual(["a", "b", "c"])
  })

  it("drops unknown/duplicate ids and appends missing ones in fallback order", () => {
    expect(parseOrder(["c", "x", 3, "c", "a"], IDS)).toEqual(["c", "a", "b"])
  })
})

describe("moveInOrder", () => {
  it("moves an id and clamps the target slot", () => {
    expect(moveInOrder(IDS, "a", 2)).toEqual(["b", "c", "a"])
    expect(moveInOrder(IDS, "c", -9)).toEqual(["c", "a", "b"])
    expect(moveInOrder(IDS, "b", 99)).toEqual(["a", "c", "b"])
  })

  it("returns a copy when the id is absent", () => {
    const order: readonly ("a" | "b" | "c" | "z")[] = IDS
    expect(moveInOrder(order, "z", 0)).toEqual(["a", "b", "c"])
  })
})
