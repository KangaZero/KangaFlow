import { describe, expect, it } from "vitest"

import { shareIntentUrl } from "@/lib/share"

const target = {
  text: "Unlocked: First Steps & More",
  url: "https://a.b/c?x=1",
}

describe("shareIntentUrl", () => {
  it("builds an X intent with both operands percent-encoded", () => {
    const result = shareIntentUrl("x", target)
    expect(result).toBe(
      "https://x.com/intent/tweet?text=Unlocked%3A%20First%20Steps%20%26%20More&url=https%3A%2F%2Fa.b%2Fc%3Fx%3D1"
    )
  })

  it("builds a Facebook sharer with the encoded url", () => {
    expect(shareIntentUrl("facebook", target)).toBe(
      "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fa.b%2Fc%3Fx%3D1"
    )
  })

  it("returns null for GitHub (no share endpoint → clipboard fallback)", () => {
    expect(shareIntentUrl("github", target)).toBeNull()
  })
})
