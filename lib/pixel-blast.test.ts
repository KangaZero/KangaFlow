// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  BAYER8_TABLE,
  bayer8,
  clamp,
  hexToRgb,
  invert3,
  type Mat3,
  multiply3,
  OFF_PLANE,
  planeFor,
  toPlane,
  transpose3,
} from "@/lib/pixel-blast"

const IDENTITY: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

describe("clamp", () => {
  it("keeps values inside the range and pins the rest", () => {
    expect(clamp(0.5, 0, 1)).toBe(0.5)
    expect(clamp(-2, 0, 1)).toBe(0)
    expect(clamp(9, 0, 1)).toBe(1)
  })
})

describe("hexToRgb", () => {
  it("parses #rrggbb into 0..1 channels", () => {
    expect(hexToRgb("#ff0080")).toEqual([1, 0, 128 / 255])
  })

  it("expands #rgb and #rgba shorthands, ignoring alpha", () => {
    expect(hexToRgb("#f08")).toEqual(hexToRgb("#ff0088"))
    expect(hexToRgb("#f08c")).toEqual(hexToRgb("#ff0088"))
    expect(hexToRgb("#ff0088cc")).toEqual(hexToRgb("#ff0088"))
  })

  it("tolerates a missing # and surrounding whitespace", () => {
    expect(hexToRgb("  a6e3a1 ")).toEqual(hexToRgb("#a6e3a1"))
  })

  it("falls back to white for anything unparseable", () => {
    expect(hexToRgb("")).toEqual([1, 1, 1])
    expect(hexToRgb("#12")).toEqual([1, 1, 1])
    expect(hexToRgb("#zzzzzz")).toEqual([1, 1, 1])
    expect(hexToRgb("rgb(0, 0, 0)")).toEqual([1, 1, 1])
  })
})

describe("bayer8", () => {
  it("is a permutation of k/64 for k = 0..63", () => {
    expect(BAYER8_TABLE).toHaveLength(64)
    const ranks = BAYER8_TABLE.map((value) => Math.round(value * 64))
    expect(new Set(ranks).size).toBe(64)
    expect(Math.min(...ranks)).toBe(0)
    expect(Math.max(...ranks)).toBe(63)
  })

  it("lays the table out row-major", () => {
    expect(BAYER8_TABLE[8 * 3 + 5]).toBe(bayer8(5, 3))
  })
})

describe("3x3 matrix helpers", () => {
  const m: Mat3 = [2, 0, 1, 1, 3, 0, 0, 1, 4]

  it("multiplies by identity as a no-op", () => {
    expect(multiply3(m, IDENTITY)).toEqual(m)
    expect(multiply3(IDENTITY, m)).toEqual(m)
  })

  it("inverts so that m * m^-1 = I", () => {
    for (const [index, value] of multiply3(m, invert3(m)).entries()) {
      expect(value).toBeCloseTo(IDENTITY[index] ?? Number.NaN, 10)
    }
  })

  it("does not divide by zero on a singular matrix", () => {
    const singular: Mat3 = [1, 2, 3, 2, 4, 6, 0, 0, 0]
    expect(invert3(singular).every(Number.isFinite)).toBe(true)
  })

  it("transposes row-major into column-major", () => {
    expect(transpose3([1, 2, 3, 4, 5, 6, 7, 8, 9])).toEqual([
      1, 4, 7, 2, 5, 8, 3, 6, 9,
    ])
  })
})

describe("planeFor / toPlane", () => {
  it("passes points through when there is no tilt plane", () => {
    expect(toPlane(null, 100, 12, 34)).toEqual([12, 34])
  })

  it("is the identity homography at zero tilt", () => {
    const [x, y] = toPlane(planeFor(0, 0, 200, 100), 100, 30, 70)
    expect(x).toBeCloseTo(30, 10)
    expect(y).toBeCloseTo(70, 10)
  })

  it("keeps the canvas centre fixed under tilt", () => {
    const [x, y] = toPlane(planeFor(40, -25, 200, 100), 100, 100, 50)
    expect(x).toBeCloseTo(100, 6)
    expect(y).toBeCloseTo(50, 6)
  })

  it("flags points behind the horizon", () => {
    const behind: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, -1]
    expect(toPlane(behind, 100, 10, 10)).toBe(OFF_PLANE)
  })
})
