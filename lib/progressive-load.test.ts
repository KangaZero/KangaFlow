// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  INSTANT_LOAD_MS,
  isCacheHit,
  LOAD_PHASES,
  type LoadEvent,
  type LoadPhase,
  mountEvent,
  nextLoadPhase,
  settledEvent,
} from "@/lib/progressive-load"

const run = (start: LoadPhase, events: readonly LoadEvent[]): LoadPhase =>
  events.reduce(nextLoadPhase, start)

describe("nextLoadPhase", () => {
  it("fades a client-mounted image in once decoded, then settles", () => {
    expect(run("loading", ["incomplete", "decoded"])).toBe("revealing")
    expect(run("loading", ["incomplete", "decoded", "revealed"])).toBe("ready")
  })

  it("shows an already-cached image at once, with no fade", () => {
    expect(run("loading", ["cached"])).toBe("ready")
    expect(run("pending", ["cached"])).toBe("ready")
  })

  it("hides a server-rendered image that was still loading at hydration", () => {
    expect(run("pending", ["incomplete"])).toBe("loading")
    expect(run("pending", ["incomplete", "decoded"])).toBe("revealing")
  })

  it("never hides an image that finished before the client looked", () => {
    expect(run("pending", ["decoded"])).toBe("ready")
  })

  it("keeps the placeholder on failure, from any unsettled phase", () => {
    for (const phase of ["pending", "loading", "revealing"] as const) {
      expect(nextLoadPhase(phase, "failed")).toBe("error")
    }
    expect(run("error", ["decoded", "revealed", "cached"])).toBe("error")
  })

  it("ignores events that arrive out of order", () => {
    expect(nextLoadPhase("ready", "failed")).toBe("ready")
    expect(nextLoadPhase("ready", "decoded")).toBe("ready")
    expect(nextLoadPhase("loading", "revealed")).toBe("loading")
    expect(nextLoadPhase("revealing", "incomplete")).toBe("revealing")
  })

  it("only ever returns a known phase", () => {
    const events: readonly LoadEvent[] = [
      "cached",
      "incomplete",
      "decoded",
      "failed",
      "revealed",
    ]
    for (const phase of LOAD_PHASES) {
      for (const event of events) {
        expect(LOAD_PHASES).toContain(nextLoadPhase(phase, event))
      }
    }
  })
})

describe("mountEvent", () => {
  it("classifies an image's state at mount", () => {
    expect(mountEvent({ complete: false, naturalWidth: 0 })).toBe("incomplete")
    expect(mountEvent({ complete: true, naturalWidth: 1280 })).toBe("cached")
    // complete + no intrinsic size = the browser gave up on it
    expect(mountEvent({ complete: true, naturalWidth: 0 })).toBe("failed")
  })
})

describe("settledEvent", () => {
  const slow = { elapsedMs: 5000, fromCache: false }

  it("treats a near-instant load as cached (no fade), a slow one as decoded", () => {
    expect(settledEvent({ ...slow, elapsedMs: 4 })).toBe("cached")
    expect(settledEvent({ ...slow, elapsedMs: INSTANT_LOAD_MS - 1 })).toBe(
      "cached"
    )
    expect(settledEvent({ ...slow, elapsedMs: INSTANT_LOAD_MS })).toBe(
      "decoded"
    )
    expect(settledEvent(slow)).toBe("decoded")
  })

  it("treats an HTTP cache hit as cached however late it started", () => {
    expect(settledEvent({ ...slow, fromCache: true })).toBe("cached")
  })

  it("skips the fade for a client-mounted image served from cache", () => {
    const event = settledEvent({ elapsedMs: 20, fromCache: false })
    expect(run("loading", ["incomplete", event])).toBe("ready")
  })
})

describe("isCacheHit", () => {
  it("is a hit only when nothing crossed the network", () => {
    expect(isCacheHit({ decodedBodySize: 5000, transferSize: 0 })).toBe(true)
    // revalidated (304) or downloaded: headers/body were transferred
    expect(isCacheHit({ decodedBodySize: 5000, transferSize: 300 })).toBe(false)
    // no body at all (failed / opaque): not a usable hit
    expect(isCacheHit({ decodedBodySize: 0, transferSize: 0 })).toBe(false)
  })
})
