// [!IMPORTANT] Human review needed — AI-generated, unreviewed. See AI_POLICY.md.
import { describe, expect, it } from "vitest"

import {
  createNotification,
  dueReminders,
  formatRelativeTime,
  type Reminder,
} from "@/lib/notifications"

describe("createNotification()", () => {
  it("defaults target to null and type to info", () => {
    const n = createNotification("hello")
    expect(n.message).toBe("hello")
    expect(n.target).toBeNull()
    expect(n.type).toBe("info")
    expect(n.read).toBe(false)
    expect(typeof n.id).toBe("string")
    expect(typeof n.createdAt).toBe("number")
  })

  it("keeps an explicit target and type", () => {
    const n = createNotification("alarm!", "alarm", "alarm")
    expect(n.target).toBe("alarm")
    expect(n.type).toBe("alarm")
  })
})

describe("formatRelativeTime()", () => {
  const now = 1_000_000_000_000

  it("says 'just now' within the first minute", () => {
    expect(formatRelativeTime(now, now)).toBe("just now")
    expect(formatRelativeTime(now - 59_000, now)).toBe("just now")
  })

  it("buckets minutes", () => {
    expect(formatRelativeTime(now - 60_000, now)).toBe("1m")
    expect(formatRelativeTime(now - 3 * 60_000, now)).toBe("3m")
    expect(formatRelativeTime(now - 59 * 60_000, now)).toBe("59m")
  })

  it("buckets hours", () => {
    expect(formatRelativeTime(now - 60 * 60_000, now)).toBe("1h")
    expect(formatRelativeTime(now - 2 * 60 * 60_000, now)).toBe("2h")
    expect(formatRelativeTime(now - 23 * 60 * 60_000, now)).toBe("23h")
  })

  it("buckets days", () => {
    expect(formatRelativeTime(now - 24 * 60 * 60_000, now)).toBe("1d")
    expect(formatRelativeTime(now - 5 * 24 * 60 * 60_000, now)).toBe("5d")
  })
})

describe("dueReminders()", () => {
  const make = (id: string, fireAt: number): Reminder => ({
    fireAt,
    id,
    message: id,
    target: "alarm",
    type: "alarm",
  })

  it("splits on fireAt <= now (inclusive)", () => {
    const now = 5000
    const reminders = [
      make("past", 4000),
      make("exact", 5000),
      make("future", 6000),
    ]
    const { due, pending } = dueReminders(reminders, now)
    expect(due.map((r) => r.id)).toEqual(["past", "exact"])
    expect(pending.map((r) => r.id)).toEqual(["future"])
  })

  it("returns empty arrays for an empty input", () => {
    const { due, pending } = dueReminders([], 0)
    expect(due).toEqual([])
    expect(pending).toEqual([])
  })
})
