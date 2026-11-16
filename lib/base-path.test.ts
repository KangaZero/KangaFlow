// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { joinBasePath } from "@/lib/base-path"

describe("joinBasePath", () => {
  it("prefixes the production base path", () => {
    expect(joinBasePath("/KangaFlow", "/tracks/a.mp3")).toBe(
      "/KangaFlow/tracks/a.mp3"
    )
  })

  it("is a no-op with an empty base path (dev)", () => {
    expect(joinBasePath("", "/tracks/a.mp3")).toBe("/tracks/a.mp3")
  })

  it("never doubles the slash", () => {
    expect(joinBasePath("/KangaFlow/", "/trademarks/x.svg")).toBe(
      "/KangaFlow/trademarks/x.svg"
    )
  })
})
