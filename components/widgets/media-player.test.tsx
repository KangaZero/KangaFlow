// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.

import React, { act } from "react"
import { createRoot } from "react-dom/client"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
;(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true

// ── HTMLMediaElement stubs ────────────────────────────────────────────────────
// jsdom defines HTMLMediaElement but doesn't implement play/pause/load.
const mockPlay = vi.fn(() => Promise.resolve())
const mockPause = vi.fn()
const mockLoad = vi.fn()
Object.defineProperty(HTMLMediaElement.prototype, "play", {
  value: mockPlay,
  writable: true,
})
Object.defineProperty(HTMLMediaElement.prototype, "pause", {
  value: mockPause,
  writable: true,
})
Object.defineProperty(HTMLMediaElement.prototype, "load", {
  value: mockLoad,
  writable: true,
})

// matchMedia is absent in jsdom; motion/react reads it via useReducedMotion.
Object.defineProperty(window, "matchMedia", {
  value: vi.fn((query: string) => ({
    addEventListener: vi.fn(),
    matches: false,
    media: query,
    removeEventListener: vi.fn(),
  })),
  writable: true,
})

// IntersectionObserver is absent in jsdom; motion's useInView needs it.
// Stub with a real class so `new IntersectionObserver(...)` works.
global.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as unknown as typeof IntersectionObserver

// ── Provider + UI stubs ───────────────────────────────────────────────────────
vi.mock("@/providers/locale-provider", () => ({
  useLocale: () => ({ translate: (k: string) => k }),
}))

// DraggableWindow: render children directly when open so buttons are visible.
vi.mock("@/components/widgets/draggable-window", () => ({
  DraggableWindow: ({
    children,
    isOpen,
  }: {
    children: React.ReactNode
    isOpen: boolean
  }) => (isOpen ? React.createElement(React.Fragment, null, children) : null),
}))

vi.mock("@/components/ui/animated-tooltip", () => ({
  AnimatedTooltip: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

vi.mock("@/components/animate-ui/components/radix/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  PopoverContent: () => null,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
}))

vi.mock("@/components/ui/slider", () => ({ Slider: () => null }))
vi.mock("../ElasticSlider", () => ({ ElasticSlider: () => null }))
vi.mock("@/components/widgets/track-list", () => ({ TrackList: () => null }))

import type { EnvSettings } from "@/components/niri/settings"
// ── Global state stub ─────────────────────────────────────────────────────────
// Uses module-level vars + getters so re-renders pick up updated values.
import { DEFAULT_ENV_SETTINGS } from "@/components/niri/settings"

let mockEnvSettings: EnvSettings = DEFAULT_ENV_SETTINGS
let mockSetEnvSettings = vi.fn()

vi.mock("@/providers/global-state-provider", () => ({
  useGlobalStates: () => ({
    get envSettings() {
      return mockEnvSettings
    },
    isMediaPlayerOpen: true,
    setEnvSettings: (u: EnvSettings | ((prev: EnvSettings) => EnvSettings)) =>
      mockSetEnvSettings(u),
    setIsMediaPlayerOpen: vi.fn(),
  }),
}))

// ── Imports (after all vi.mock calls) ─────────────────────────────────────────
import { MediaPlayer } from "@/components/widgets/media-player"
import { formatSecondsToMMSS, PLAYLIST } from "@/components/widgets/tracks"

// ── Test harness ──────────────────────────────────────────────────────────────
let container: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  mockEnvSettings = structuredClone(DEFAULT_ENV_SETTINGS)
  mockSetEnvSettings = vi.fn()
  mockPlay.mockClear()
  mockPause.mockClear()
  mockLoad.mockClear()

  container = document.createElement("div")
  document.body.appendChild(container)
  root = createRoot(container)
})

afterEach(async () => {
  await act(async () => {
    root.unmount()
  })
  container.remove()
})

async function renderPlayer() {
  // Two act passes: first renders + runs layout effects; second flushes the
  // setMounted(true) state update so the audio portal appears in the DOM.
  await act(async () => {
    root.render(React.createElement(MediaPlayer))
  })
  await act(async () => {})
}

function btn(ariaLabel: string) {
  return container.querySelector(
    `[aria-label="${ariaLabel}"]`
  ) as HTMLButtonElement
}

function audio() {
  return document.querySelector("audio") as HTMLAudioElement
}

function withIsLooping(isLooping: boolean): EnvSettings {
  return {
    ...DEFAULT_ENV_SETTINGS,
    widgetDefaults: {
      ...DEFAULT_ENV_SETTINGS.widgetDefaults,
      media: {
        ...DEFAULT_ENV_SETTINGS.widgetDefaults.media,
        options: {
          ...DEFAULT_ENV_SETTINGS.widgetDefaults.media.options,
          isLooping,
        },
      },
    },
  }
}

function withVolume(currentVolume: number): EnvSettings {
  return {
    ...DEFAULT_ENV_SETTINGS,
    widgetDefaults: {
      ...DEFAULT_ENV_SETTINGS.widgetDefaults,
      media: {
        ...DEFAULT_ENV_SETTINGS.widgetDefaults.media,
        options: {
          ...DEFAULT_ENV_SETTINGS.widgetDefaults.media.options,
          currentVolume,
        },
      },
    },
  }
}

// ── Pure helper ───────────────────────────────────────────────────────────────
describe("formatSecondsToMMSS", () => {
  it("pads seconds to two digits", () => {
    expect(formatSecondsToMMSS(258)).toBe("4:18")
    expect(formatSecondsToMMSS(5)).toBe("0:05")
  })

  it("handles exact minutes and zero", () => {
    expect(formatSecondsToMMSS(0)).toBe("0:00")
    expect(formatSecondsToMMSS(120)).toBe("2:00")
  })

  it("floors fractional seconds and clamps negatives to zero", () => {
    expect(formatSecondsToMMSS(65.9)).toBe("1:05")
    expect(formatSecondsToMMSS(-10)).toBe("0:00")
  })
})

// ── Component ─────────────────────────────────────────────────────────────────
describe("MediaPlayer", () => {
  describe("play / pause", () => {
    it("clicking play calls audio.play and flips the button label", async () => {
      await renderPlayer()
      await act(async () => {
        btn("mediaPlayer.play").click()
      })
      expect(mockPlay).toHaveBeenCalled()
      expect(btn("mediaPlayer.pause")).toBeTruthy()
    })

    it("clicking pause after play calls audio.pause", async () => {
      await renderPlayer()
      await act(async () => {
        btn("mediaPlayer.play").click()
      })
      await act(async () => {
        btn("mediaPlayer.pause").click()
      })
      expect(mockPause).toHaveBeenCalled()
    })
  })

  describe("track navigation", () => {
    it("next advances to the second track", async () => {
      await renderPlayer()
      expect(container.textContent).toContain(PLAYLIST[0].title)
      await act(async () => {
        btn("mediaPlayer.next").click()
      })
      expect(container.textContent).toContain(PLAYLIST[1]?.title)
    })

    it("previous from index 0 wraps to the last track", async () => {
      await renderPlayer()
      await act(async () => {
        btn("mediaPlayer.previous").click()
      })
      expect(container.textContent).toContain(
        PLAYLIST[PLAYLIST.length - 1]?.title
      )
    })

    it("next wraps from the last track back to the first", async () => {
      await renderPlayer()
      for (let i = 0; i < PLAYLIST.length; i++) {
        await act(async () => {
          btn("mediaPlayer.next").click()
        })
      }
      expect(container.textContent).toContain(PLAYLIST[0].title)
    })
  })

  describe("loop", () => {
    it("audio.loop is false when isLooping is false", async () => {
      await renderPlayer()
      expect(audio().loop).toBe(false)
    })

    it("audio.loop is true when isLooping setting is true", async () => {
      mockEnvSettings = withIsLooping(true)
      await renderPlayer()
      expect(audio().loop).toBe(true)
    })

    it("audio.loop updates on re-render when the setting changes", async () => {
      await renderPlayer()
      expect(audio().loop).toBe(false)

      mockEnvSettings = withIsLooping(true)
      await act(async () => {
        root.render(React.createElement(MediaPlayer))
      })
      await act(async () => {})
      expect(audio().loop).toBe(true)
    })

    it("clicking the loop button calls setEnvSettings to enable isLooping", async () => {
      await renderPlayer()
      await act(async () => {
        btn("mediaPlayer.loop").click()
      })
      expect(mockSetEnvSettings).toHaveBeenCalledTimes(1)
      const arg = mockSetEnvSettings.mock.calls[0]?.[0] as EnvSettings
      expect(arg.widgetDefaults.media.options.isLooping).toBe(true)
    })
  })

  describe("volume", () => {
    it("audio.volume reflects currentVolume / 100 when playing", async () => {
      mockEnvSettings = withVolume(50)
      await renderPlayer()
      // Volume effect fires when isPlaying changes; trigger play to flush it.
      await act(async () => {
        btn("mediaPlayer.play").click()
      })
      expect(audio().volume).toBeCloseTo(0.5)
    })

    it("clamps volume to 0 when currentVolume is 0", async () => {
      mockEnvSettings = withVolume(0)
      await renderPlayer()
      await act(async () => {
        btn("mediaPlayer.play").click()
      })
      expect(audio().volume).toBe(0)
    })
  })
})
