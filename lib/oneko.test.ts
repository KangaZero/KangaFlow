// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { afterEach, describe, expect, it, vi } from "vitest"

import { type Direction, Oneko, resolveDirection } from "@/lib/oneko"

// Sign convention (from Oneko.frame): diffX = catX - targetX, so positive diffX
// means the target is to the West; positive diffY means the target is North.
const at = (diffX: number, diffY: number): Direction => {
  const distance = Math.hypot(diffX, diffY)
  return resolveDirection(diffX, diffY, distance)
}

describe("resolveDirection", () => {
  it("resolves the four cardinal directions", () => {
    expect(at(0, 10)).toBe("N")
    expect(at(0, -10)).toBe("S")
    expect(at(10, 0)).toBe("W")
    expect(at(-10, 0)).toBe("E")
  })

  it("resolves the four diagonals", () => {
    expect(at(10, 10)).toBe("NW")
    expect(at(-10, 10)).toBe("NE")
    expect(at(10, -10)).toBe("SW")
    expect(at(-10, -10)).toBe("SE")
  })

  it("only ever returns one of the eight valid sprite keys", () => {
    const valid: ReadonlySet<Direction> = new Set([
      "N",
      "NE",
      "E",
      "SE",
      "S",
      "SW",
      "W",
      "NW",
    ])
    for (let angle = 0; angle < 360; angle += 1) {
      const rad = (angle * Math.PI) / 180
      expect(valid.has(at(Math.cos(rad), Math.sin(rad)))).toBe(true)
    }
  })
})

describe("summon / dismiss pop", () => {
  const motionAllowed = () =>
    vi.stubGlobal("matchMedia", (query: string) => ({
      addEventListener: () => undefined,
      matches: false,
      media: query,
      removeEventListener: () => undefined,
    }))

  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(HTMLElement.prototype, "animate")
    for (const el of document.querySelectorAll(".oneko")) el.remove()
  })

  it("removes the cat at once where element.animate is missing (jsdom)", () => {
    motionAllowed()
    const neko = new Oneko({ followMouse: true })
    expect(document.querySelector(".oneko")).not.toBeNull()
    neko.destroy()
    expect(document.querySelector(".oneko")).toBeNull()
  })

  it("pops in, and only detaches after the pop-out finishes", async () => {
    motionAllowed()
    let finish = () => undefined as void
    const finished = new Promise<void>((resolve) => {
      finish = resolve
    })
    // jsdom has no Web Animations: provide just enough of element.animate.
    const animate = vi.fn(() => ({ finished }))
    Object.defineProperty(HTMLElement.prototype, "animate", {
      configurable: true,
      value: animate,
    })
    const neko = new Oneko({ followMouse: true })
    expect(animate).toHaveBeenCalledTimes(1)
    neko.destroy()
    expect(animate).toHaveBeenCalledTimes(2)
    expect(document.querySelector(".oneko")).not.toBeNull()
    finish()
    await finished
    await Promise.resolve()
    expect(document.querySelector(".oneko")).toBeNull()
  })
})
