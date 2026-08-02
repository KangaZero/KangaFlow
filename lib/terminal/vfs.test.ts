// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  buildVfs,
  cwdForRoute,
  displayCwd,
  listDir,
  nodeAt,
  resolvePath,
} from "@/lib/terminal/vfs"

const PATHS = [
  "app/[lang]/page.tsx",
  "app/[lang]/achievements/page.tsx",
  "app/[lang]/timeline/page.tsx",
  "README.md",
] as const

const root = buildVfs(PATHS)

describe("buildVfs", () => {
  it("returns a root dir node with empty name", () => {
    expect(root.name).toBe("")
    expect(root.type).toBe("dir")
  })

  it("makes app a dir containing [lang]", () => {
    const app = root.children.get("app")
    expect(app?.type).toBe("dir")
    expect(app?.children.has("[lang]")).toBe(true)
  })

  it("turns intermediate page segments into folders and leaves into files", () => {
    const lang = root.children.get("app")?.children.get("[lang]")
    expect(lang?.type).toBe("dir")
    expect(lang?.children.get("page.tsx")?.type).toBe("file")
    expect(lang?.children.get("timeline")?.type).toBe("dir")
    expect(
      lang?.children.get("achievements")?.children.get("page.tsx")?.type
    ).toBe("file")
  })

  it("keeps top-level files as files", () => {
    expect(root.children.get("README.md")?.type).toBe("file")
  })

  it("ignores empty path keys", () => {
    expect(buildVfs([""]).children.size).toBe(0)
  })
})

describe("resolvePath", () => {
  it('collapses ".." up one level', () => {
    expect(resolvePath("/app/[lang]", "..")).toBe("/app")
  })

  it('clamps ".." at root', () => {
    expect(resolvePath("/", "..")).toBe("/")
  })

  it("resolves a relative segment against cwd", () => {
    expect(resolvePath("/app/[lang]", "timeline")).toBe("/app/[lang]/timeline")
  })

  it('treats "~" as root', () => {
    expect(resolvePath("/app", "~")).toBe("/")
  })

  it('resolves "~/x" from root', () => {
    expect(resolvePath("/app", "~/app/[lang]")).toBe("/app/[lang]")
  })

  it("takes absolute args verbatim", () => {
    expect(resolvePath("/app", "/README.md")).toBe("/README.md")
  })

  it("trims trailing slashes", () => {
    expect(resolvePath("/", "/app/[lang]/")).toBe("/app/[lang]")
  })

  it("returns cwd for an empty arg", () => {
    expect(resolvePath("/app/[lang]", "")).toBe("/app/[lang]")
  })

  it('returns cwd for "."', () => {
    expect(resolvePath("/app/[lang]", ".")).toBe("/app/[lang]")
  })

  it("collapses interior . and .. segments", () => {
    expect(resolvePath("/app", "./[lang]/../[lang]/timeline")).toBe(
      "/app/[lang]/timeline"
    )
  })
})

describe("nodeAt", () => {
  it("finds a directory", () => {
    expect(nodeAt(root, "/app/[lang]")?.type).toBe("dir")
  })

  it("finds a file", () => {
    expect(nodeAt(root, "/app/[lang]/page.tsx")?.type).toBe("file")
  })

  it("returns the root for /", () => {
    expect(nodeAt(root, "/")).toBe(root)
  })

  it("returns null for a missing path", () => {
    expect(nodeAt(root, "/app/nope")).toBeNull()
  })
})

describe("listDir", () => {
  it("lists dirs first, then files, each alphabetical", () => {
    expect(listDir(root, "/app/[lang]")).toStrictEqual([
      { name: "achievements", type: "dir" },
      { name: "timeline", type: "dir" },
      { name: "page.tsx", type: "file" },
    ])
  })

  it("lists the root", () => {
    expect(listDir(root, "/")).toStrictEqual([
      { name: "app", type: "dir" },
      { name: "README.md", type: "file" },
    ])
  })

  it("returns null for a file path", () => {
    expect(listDir(root, "/README.md")).toBeNull()
  })

  it("returns null for a missing path", () => {
    expect(listDir(root, "/nope")).toBeNull()
  })
})

describe("displayCwd", () => {
  it('renders root as "~"', () => {
    expect(displayCwd("/")).toBe("~")
  })

  it('"~"-prefixes a nested path', () => {
    expect(displayCwd("/timeline")).toBe("~/timeline")
  })
})

describe("cwdForRoute", () => {
  // Flat page tree: each routable page is a top-level dir holding index.tsx.
  const pageRoot = buildVfs([
    "index.tsx",
    "achievements/index.tsx",
    "timeline/index.tsx",
  ])

  it("maps a locale-only route to home (root)", () => {
    expect(cwdForRoute("/en", pageRoot)).toBe("/")
  })

  it("maps a nested route to its page dir", () => {
    expect(cwdForRoute("/en/timeline", pageRoot)).toBe("/timeline")
  })

  it("maps a ja route to its page dir", () => {
    expect(cwdForRoute("/ja/achievements", pageRoot)).toBe("/achievements")
  })

  it("falls back to root for an unknown route", () => {
    expect(cwdForRoute("/en/nonexistent", pageRoot)).toBe("/")
  })
})
