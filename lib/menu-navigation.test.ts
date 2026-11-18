// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { menuIntentFromKey, wrapIndex } from "@/lib/menu-navigation"

const press = (
  key: string,
  mods: Partial<Record<"metaKey" | "ctrlKey" | "altKey", boolean>> = {}
) => ({
  altKey: false,
  ctrlKey: false,
  key,
  metaKey: false,
  ...mods,
})

describe("menuIntentFromKey", () => {
  it("maps arrows and vim hjkl to the same moves", () => {
    expect(menuIntentFromKey(press("ArrowUp"))).toBe("up")
    expect(menuIntentFromKey(press("k"))).toBe("up")
    expect(menuIntentFromKey(press("j"))).toBe("down")
    expect(menuIntentFromKey(press("h"))).toBe("left")
    expect(menuIntentFromKey(press("l"))).toBe("right")
  })

  it("pages tabs with q/e and brackets, selects with Enter/Space", () => {
    expect(menuIntentFromKey(press("e"))).toBe("nextTab")
    expect(menuIntentFromKey(press("["))).toBe("prevTab")
    expect(menuIntentFromKey(press("Enter"))).toBe("select")
    expect(menuIntentFromKey(press(" "))).toBe("select")
  })

  it("lets modified presses through to global shortcuts", () => {
    expect(menuIntentFromKey(press("k", { metaKey: true }))).toBeUndefined()
    expect(menuIntentFromKey(press("j", { ctrlKey: true }))).toBeUndefined()
    expect(
      menuIntentFromKey(press("ArrowUp", { altKey: true }))
    ).toBeUndefined()
  })

  it("ignores unmapped and prototype keys", () => {
    expect(menuIntentFromKey(press("x"))).toBeUndefined()
    expect(menuIntentFromKey(press("Escape"))).toBeUndefined()
    expect(menuIntentFromKey(press("toString"))).toBeUndefined()
  })
})

describe("wrapIndex", () => {
  it("wraps forwards and backwards", () => {
    expect(wrapIndex(2, 1, 3)).toBe(0)
    expect(wrapIndex(0, -1, 3)).toBe(2)
    expect(wrapIndex(1, 1, 3)).toBe(2)
  })

  it("is safe on an empty list", () => {
    expect(wrapIndex(0, 1, 0)).toBe(0)
  })
})
