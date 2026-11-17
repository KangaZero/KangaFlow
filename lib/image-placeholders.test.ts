// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { readdirSync } from "node:fs"
import { extname, join } from "node:path"
import { describe, expect, it } from "vitest"

import { WALLPAPERS } from "@/components/niri/settings"
import { PHOTO_WALLPAPERS, wallpaperPhoto } from "@/components/niri/wallpaper"
import { PORTFOLIOS } from "@/components/timeline-portfolios"
import { IMAGE_PLACEHOLDERS } from "@/lib/image-placeholders"
import { THEMES } from "@/lib/themes"

const RASTER = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"])
const keysIn = (dir: string): string[] =>
  readdirSync(join(import.meta.dirname, "..", "assets", dir))
    .filter((file) => RASTER.has(extname(file).toLowerCase()))
    .map((file) => `${dir}/${file.slice(0, -extname(file).length)}`)

const hasPlaceholder = (key: string): boolean =>
  Object.hasOwn(IMAGE_PLACEHOLDERS, key)

describe("image placeholders", () => {
  it("covers every timeline portfolio image", () => {
    for (const portfolio of PORTFOLIOS) {
      expect(hasPlaceholder(portfolio.placeholder)).toBe(true)
    }
  })

  it("covers every photo wallpaper", () => {
    for (const photo of Object.values(PHOTO_WALLPAPERS)) {
      expect(hasPlaceholder(photo.placeholder)).toBe(true)
    }
  })

  // Adding an image without re-running `just placeholders` fails here.
  it("has a key for every raster file under assets/timeline and wallpapers", () => {
    for (const key of [...keysIn("timeline"), ...keysIn("wallpapers")]) {
      expect(hasPlaceholder(key), key).toBe(true)
    }
  })

  it("stores small WebP data URIs", () => {
    for (const uri of Object.values(IMAGE_PLACEHOLDERS)) {
      expect(uri.startsWith("data:image/webp;base64,")).toBe(true)
      expect(uri.length).toBeLessThan(1024)
    }
  })
})

describe("wallpaperPhoto", () => {
  it("returns the pinned photo whatever the theme", () => {
    for (const theme of THEMES) {
      expect(wallpaperPhoto("magma", theme)?.placeholder).toBe(
        "wallpapers/magma"
      )
    }
  })

  it("resolves auto to the theme's default photo", () => {
    expect(wallpaperPhoto("auto", "dark")?.placeholder).toBe("wallpapers/magma")
    expect(wallpaperPhoto("auto", "light")?.placeholder).toBe(
      "wallpapers/beach-path"
    )
    expect(wallpaperPhoto("auto", "terminal")?.placeholder).toBe(
      "wallpapers/cat-vibin"
    )
  })

  it("returns null for gradients, so they skip blur-up loading", () => {
    for (const id of ["aurora", "mesh", "catppuccin", "solid"] as const) {
      expect(wallpaperPhoto(id, "dark")).toBeNull()
    }
  })

  it("resolves every wallpaper id to a photo or a gradient", () => {
    const photos = WALLPAPERS.filter((id) => wallpaperPhoto(id, "dark"))
    expect(photos).toEqual(["auto", "cat", "beach", "magma"])
  })
})
