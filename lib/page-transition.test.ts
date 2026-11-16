// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"
import {
  type AnchorInfo,
  type ClickInfo,
  makeSwarm,
  SWARM_TIMING,
  transitionTarget,
} from "@/lib/page-transition"
import { mulberry32 } from "@/lib/seeded-random"

const CURRENT = new URL("https://kangazero.github.io/KangaFlow/en/")
const CLICK: ClickInfo = {
  altKey: false,
  button: 0,
  ctrlKey: false,
  defaultPrevented: false,
  metaKey: false,
  shiftKey: false,
}
const anchor = (href: string, extra: Partial<AnchorInfo> = {}): AnchorInfo => ({
  hasDownload: false,
  href,
  optOut: false,
  target: "",
  ...extra,
})

describe("transitionTarget", () => {
  it("intercepts a plain internal link", () => {
    const next = transitionTarget(
      CLICK,
      anchor("https://kangazero.github.io/KangaFlow/en/achievements/"),
      CURRENT
    )
    expect(next?.pathname).toBe("/KangaFlow/en/achievements/")
  })

  it("leaves modified / non-primary clicks alone (new tab, window, download)", () => {
    const href = "https://kangazero.github.io/KangaFlow/en/timeline/"
    for (const key of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
      expect(
        transitionTarget({ ...CLICK, [key]: true }, anchor(href), CURRENT)
      ).toBeNull()
    }
    expect(
      transitionTarget({ ...CLICK, button: 1 }, anchor(href), CURRENT)
    ).toBeNull()
    expect(
      transitionTarget(
        { ...CLICK, defaultPrevented: true },
        anchor(href),
        CURRENT
      )
    ).toBeNull()
  })

  it("ignores other targets, downloads and opted-out links", () => {
    const href = "https://kangazero.github.io/KangaFlow/en/timeline/"
    expect(
      transitionTarget(CLICK, anchor(href, { target: "_blank" }), CURRENT)
    ).toBeNull()
    expect(
      transitionTarget(CLICK, anchor(href, { target: "_self" }), CURRENT)
    ).not.toBeNull()
    expect(
      transitionTarget(CLICK, anchor(href, { hasDownload: true }), CURRENT)
    ).toBeNull()
    expect(
      transitionTarget(CLICK, anchor(href, { optOut: true }), CURRENT)
    ).toBeNull()
  })

  it("ignores external and non-http links", () => {
    expect(
      transitionTarget(CLICK, anchor("https://github.com/KangaZero"), CURRENT)
    ).toBeNull()
    expect(
      transitionTarget(CLICK, anchor("mailto:hi@example.com"), CURRENT)
    ).toBeNull()
  })

  it("ignores same-page links (hash-only, query-only, trailing slash)", () => {
    expect(
      transitionTarget(
        CLICK,
        anchor("https://kangazero.github.io/KangaFlow/en/#about"),
        CURRENT
      )
    ).toBeNull()
    expect(
      transitionTarget(
        CLICK,
        anchor("https://kangazero.github.io/KangaFlow/en?x=1"),
        CURRENT
      )
    ).toBeNull()
  })
})

describe("makeSwarm", () => {
  // Every sampled viewport point must sit inside at least one bubble, otherwise
  // the old page would peek through at peak cover.
  it.each([
    [1280, 800],
    [1920, 1080],
    [390, 844],
    [768, 1024],
  ])("covers a %ix%i viewport completely", (width, height) => {
    for (const seed of [1, 7, 42, 1234, 99999]) {
      const swarm = makeSwarm(mulberry32(seed), width, height)
      for (let y = 0; y <= height; y += 8) {
        for (let x = 0; x <= width; x += 8) {
          const covered = swarm.some(
            (b) => Math.hypot(b.x - x, b.y - y) <= b.d / 2
          )
          if (!covered) {
            throw new Error(
              `gap at ${x},${y} (seed ${seed}, ${width}x${height})`
            )
          }
        }
      }
    }
  })

  it("keeps cover and reveal inside the timing budget", () => {
    const swarm = makeSwarm(mulberry32(3), 1280, 800)
    for (const b of swarm) {
      expect(b.riseDelay).toBeGreaterThanOrEqual(0)
      expect(b.riseDelay).toBeLessThanOrEqual(SWARM_TIMING.riseStaggerMs)
      expect(b.popDelay).toBeLessThan(SWARM_TIMING.popStaggerMs)
      // starts fully below the viewport
      expect(b.y + b.rise - b.d / 2).toBeGreaterThanOrEqual(800)
    }
  })
})
