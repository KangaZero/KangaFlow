// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
//
// Regenerates lib/image-placeholders.ts: one tiny (~24px wide) WebP data URI
// per raster image that the UI shows with a blur-up reveal (timeline
// screenshots, photo wallpapers, the hero avatar).
//
//   node scripts/build-image-placeholders.mjs   (or `just placeholders`)
//
// Needs `ffmpeg` with libwebp on PATH — the flake's dev shell provides it
// (`nix develop`). CI has no nix, so the *generated* file is committed and the
// build never runs this; re-run it whenever an image under SOURCES changes.

import { execFile } from "node:child_process"
import { readdir, writeFile } from "node:fs/promises"
import { basename, extname } from "node:path"
import { promisify } from "node:util"

const run = promisify(execFile)

const ASSETS = new URL("../assets/", import.meta.url)
const OUTPUT = new URL("../lib/image-placeholders.ts", import.meta.url)

// Directories whose every raster image gets a placeholder, plus single files.
// The key is the path under assets/ without its extension.
const SOURCE_DIRS = ["timeline", "wallpapers"]
const SOURCE_FILES = ["avatar.webp"]
const RASTER = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"])

// 24px wide is the smallest size that still reads as the picture once blurred
// (8px is a colour smear). Lossy q50 keeps each URI at a few hundred bytes.
const WIDTH = 24
const QUALITY = 50

async function listSources() {
  const files = [...SOURCE_FILES]
  for (const dir of SOURCE_DIRS) {
    const entries = await readdir(new URL(`${dir}/`, ASSETS))
    for (const entry of entries) {
      if (RASTER.has(extname(entry).toLowerCase())) {
        files.push(`${dir}/${entry}`)
      }
    }
  }
  return files
}

async function encode(file) {
  // `-f webp -` streams the encoded image to stdout. ffmpeg sniffs the input
  // format from the bytes, so a mislabelled file (e.g. a PNG saved as .webp)
  // still decodes. Alpha survives: libwebp picks yuva420p for RGBA sources.
  const { stdout } = await run(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      new URL(file, ASSETS).pathname,
      "-vf",
      `scale=${WIDTH}:-1:flags=area`,
      "-frames:v",
      "1",
      "-c:v",
      "libwebp",
      "-quality",
      String(QUALITY),
      "-f",
      "webp",
      "-",
    ],
    { encoding: "buffer", maxBuffer: 1024 * 1024 }
  )
  return `data:image/webp;base64,${stdout.toString("base64")}`
}

const sources = await listSources()
const entries = await Promise.all(
  sources.map(async (file) => {
    const key = file.slice(0, -extname(file).length)
    return [key, await encode(file)]
  })
)
// Sorted keys: deterministic output and what Biome's useSortedKeys expects.
entries.sort(([a], [b]) => (a < b ? -1 : 1))

// Quote only keys that are not plain identifiers, matching Biome's formatter.
const property = (key) => (/^[A-Za-z_$][\w$]*$/.test(key) ? key : `"${key}"`)

const bytes = entries.reduce((total, [, uri]) => total + uri.length, 0)
const body = `// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
//
// GENERATED FILE — do not edit by hand. Run \`just placeholders\`
// (scripts/${basename(import.meta.url)}).
//
// ${WIDTH}px-wide WebP (q${QUALITY}) data URIs, keyed by path under assets/ without
// the extension: ${entries.length} images, ${bytes} bytes of URIs in total.

export const IMAGE_PLACEHOLDERS = {
${entries.map(([key, uri]) => `  ${property(key)}:\n    "${uri}",`).join("\n")}
} as const satisfies Record<string, \`data:image/webp;base64,\${string}\`>

export type PlaceholderKey = keyof typeof IMAGE_PLACEHOLDERS
`

await writeFile(OUTPUT, body)
console.log(`wrote ${entries.length} placeholders / ${bytes} bytes`)
