// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { formatTime } from "@/components/media-player"

describe("formatTime", () => {
  it("pads seconds to two digits", () => {
    expect(formatTime(258)).toBe("4:18")
    expect(formatTime(5)).toBe("0:05")
  })

  it("handles exact minutes and zero", () => {
    expect(formatTime(0)).toBe("0:00")
    expect(formatTime(120)).toBe("2:00")
  })

  it("floors fractional seconds and clamps negatives to zero", () => {
    expect(formatTime(65.9)).toBe("1:05")
    expect(formatTime(-10)).toBe("0:00")
  })
})
