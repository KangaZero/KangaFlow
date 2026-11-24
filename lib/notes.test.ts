// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import { formatNoteDate, normalizeNote, uniqueUntitledTitle } from "@/lib/notes"

describe("uniqueUntitledTitle", () => {
  it("uses the bare base when free", () => {
    expect(uniqueUntitledTitle([])).toBe("Untitled note")
    expect(uniqueUntitledTitle(["Groceries"])).toBe("Untitled note")
  })

  it("suffixes the next free index on collision", () => {
    expect(uniqueUntitledTitle(["Untitled note"])).toBe("Untitled note (1)")
    expect(uniqueUntitledTitle(["Untitled note", "Untitled note (1)"])).toBe(
      "Untitled note (2)"
    )
  })

  it("treats blank titles as the base placeholder", () => {
    expect(uniqueUntitledTitle(["", "  "])).toBe("Untitled note (1)")
  })

  it("fills the lowest available gap", () => {
    expect(uniqueUntitledTitle(["Untitled note", "Untitled note (2)"])).toBe(
      "Untitled note (1)"
    )
  })
})

describe("normalizeNote", () => {
  it("keeps valid fields", () => {
    const note = normalizeNote({
      align: "center",
      color: "sky",
      html: "<b>hi</b>",
      id: "abc",
      pinned: true,
      tags: ["a", "b"],
      title: "T",
    })
    expect(note.color).toBe("sky")
    expect(note.align).toBe("center")
    expect(note.pinned).toBe(true)
    expect(note.tags).toEqual(["a", "b"])
  })

  it("falls back on an invalid colour (legacy Tailwind class)", () => {
    expect(normalizeNote({ color: "bg-yellow-200", id: "x" }).color).toBe(
      "yellow"
    )
    expect(normalizeNote({ id: "x" }).color).toBe("yellow")
  })

  it("migrates the legacy body field into html", () => {
    expect(normalizeNote({ body: "old text", id: "x" }).html).toBe("old text")
  })

  it("drops a non-array tags value and non-string entries", () => {
    expect(normalizeNote({ id: "x", tags: "nope" }).tags).toEqual([])
    expect(normalizeNote({ id: "x", tags: ["ok", 3, null] }).tags).toEqual([
      "ok",
    ])
  })

  it("synthesizes an id when missing", () => {
    expect(typeof normalizeNote({}).id).toBe("string")
    expect(normalizeNote({}).id.length).toBeGreaterThan(0)
  })
})

describe("formatNoteDate", () => {
  // Local-time constructor, so the expectation holds in any TZ.
  const ms = new Date(2026, 7, 2, 14, 30).getTime()

  it("formats in the app locale, not the browser's", () => {
    expect(formatNoteDate(ms, "ja")).toBe(
      new Date(ms).toLocaleString("ja", {
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
      })
    )
    expect(formatNoteDate(ms, "ja")).toContain("8月")
    expect(formatNoteDate(ms, "en")).toContain("Aug")
  })
})
